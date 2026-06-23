from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from graph.graph import create_chat_turn_graph
from graph.state import ChatTurnState
from logger import get_logger
from memory import ChatThreadContextStore, get_chat_thread_context_store
from utils import application_state, user_input_state

logger = get_logger(__name__)

_AGENT_TEXT_STREAM_NODES = {"main_agent", "screen_control_agent"}
_TOOL_STREAM_NODES = {"main_agent", "screen_control_agent"}
_SPEECH_TEXT_STREAM_NODES = {"speech_text_agent"}
_REASONING_BLOCK_TYPES = {"reasoning", "reasoning-delta"}


class ChatGraphRunner:
    def __init__(self, *, thread_context: ChatThreadContextStore | None = None) -> None:
        self._graph: Any | None = None
        self._thread_context = thread_context or get_chat_thread_context_store()

    async def run_stream(
        self,
        message: str,
        *,
        session_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        turn_id = uuid4().hex
        thread_id = self._thread_context.activate(session_id)
        if thread_id is None:
            logger.info(
                "chat graph invocation ignored",
                extra={
                    "event": "chat.invocation.ignored",
                    "conversation_id": session_id,
                    "turn_id": turn_id,
                    "reason": "missing_conversation_id",
                    "message_chars": len(message),
                },
            )
            return

        graph = await self._get_graph()
        state = _initial_state(
            message,
            session_id=thread_id,
            turn_id=turn_id,
            metadata=metadata,
        )

        logger.debug(
            "chat graph invocation started",
            extra={
                "event": "chat.invocation.started",
                "conversation_id": thread_id,
                "turn_id": turn_id,
                "message_chars": len(message),
            },
        )
        started_tool_calls: set[str] = set()
        async for event in graph.astream(
            state,
            config={"configurable": {"thread_id": thread_id}},
            stream_mode=["messages", "custom", "updates", "tasks"],
            subgraphs=True,
            version="v2",
        ):
            backend_event = _backend_event(
                event,
                started_tool_calls=started_tool_calls,
                conversation_id=thread_id,
                turn_id=turn_id,
            )
            if backend_event is not None:
                yield backend_event

        logger.debug(
            "chat graph invocation completed",
            extra={
                "event": "chat.invocation.completed",
                "conversation_id": thread_id,
                "turn_id": turn_id,
            },
        )

    async def _get_graph(self) -> Any:
        if self._graph is not None:
            return self._graph

        self._graph = await create_chat_turn_graph()
        return self._graph


__all__ = [
    "ChatGraphRunner",
]


def _backend_event(
    event: Any,
    *,
    started_tool_calls: set[str] | None = None,
    conversation_id: str | None = None,
    turn_id: str | None = None,
) -> dict[str, Any] | None:
    if isinstance(event, dict) and event.get("type") == "custom":
        data = event.get("data")
        if isinstance(data, dict):
            return data

    if isinstance(event, dict) and event.get("type") == "messages":
        return _message_stream_event(
            event,
            started_tool_calls=started_tool_calls if started_tool_calls is not None else set(),
            conversation_id=conversation_id,
            turn_id=turn_id,
        )

    if isinstance(event, dict) and event.get("type") == "updates":
        return _node_update_event(event)

    if isinstance(event, dict) and event.get("type") == "tasks":
        return _task_lifecycle_event(event)

    if isinstance(event, dict):
        return None
    return {"type": "message", "data": event}


def _message_stream_event(
    event: dict[str, Any],
    *,
    started_tool_calls: set[str],
    conversation_id: str | None,
    turn_id: str | None,
) -> dict[str, Any] | None:
    data = event.get("data")
    if not isinstance(data, tuple) or len(data) != 2:
        return None

    message, metadata = data
    node_name = _stream_node(event.get("ns"), metadata)
    if node_name in _TOOL_STREAM_NODES:
        tool_event = _tool_call_event(
            message,
            source_agent=node_name,
            started_tool_calls=started_tool_calls,
        )
        if tool_event is not None:
            return tool_event

    reasoning = _message_reasoning_text(message)
    if reasoning:
        backend_event = {
            "type": "agent.reasoning.delta",
            "source_agent": node_name or None,
            "node": node_name or None,
            "text": reasoning,
        }
        _log_agent_stream_event(
            backend_event,
            conversation_id=conversation_id,
            turn_id=turn_id,
            stream_kind="reasoning",
        )
        return backend_event

    if node_name in _AGENT_TEXT_STREAM_NODES:
        text = _message_text(message)
        if text:
            return {
                "type": "agent.text.delta",
                "source_agent": node_name,
                "node": node_name,
                "text": text,
            }

    if node_name in _SPEECH_TEXT_STREAM_NODES:
        text = _message_text(message)
        if text:
            backend_event = {
                "type": "speech_text.delta",
                "source_agent": node_name,
                "node": node_name,
                "text": text,
            }
            _log_agent_stream_event(
                backend_event,
                conversation_id=conversation_id,
                turn_id=turn_id,
                stream_kind="text",
            )
            return backend_event

    return None


def _node_update_event(event: dict[str, Any]) -> dict[str, Any] | None:
    data = event.get("data")
    if not isinstance(data, dict):
        return None

    nodes: list[dict[str, Any]] = []
    for node_name, update in data.items():
        if str(node_name).startswith("__"):
            continue

        update_keys = sorted(update.keys()) if isinstance(update, dict) else []
        nodes.append({"node": str(node_name), "keys": update_keys})

    if not nodes:
        return None

    return {
        "type": "node.updated",
        "source": "langgraph.updates",
        "node": nodes[0]["node"] if len(nodes) == 1 else None,
        "nodes": nodes,
    }


def _task_lifecycle_event(event: dict[str, Any]) -> dict[str, Any] | None:
    data = event.get("data")
    if not isinstance(data, dict):
        return None

    task_id = data.get("id")
    node_name = data.get("name")
    if not node_name:
        return None

    if "result" not in data and "error" not in data:
        return {
            "type": "task.started",
            "source": "langgraph.tasks",
            "task_id": str(task_id) if task_id else None,
            "node": str(node_name),
            "triggers": data.get("triggers") if isinstance(data.get("triggers"), list) else [],
        }

    error = data.get("error")
    result = data.get("result")
    return {
        "type": "task.failed" if error else "task.completed",
        "source": "langgraph.tasks",
        "task_id": str(task_id) if task_id else None,
        "node": str(node_name),
        "error": str(error) if error else None,
        "result_keys": sorted(result.keys()) if isinstance(result, dict) else [],
        "interrupt_count": len(data.get("interrupts") or []),
    }


def _log_agent_stream_event(
    event: dict[str, Any],
    *,
    conversation_id: str | None,
    turn_id: str | None,
    stream_kind: str,
) -> None:
    text = event.get("text")
    logger.debug(
        "agent internal stream token",
        extra={
            "event": "agent.internal_stream_token",
            "conversation_id": conversation_id,
            "turn_id": turn_id,
            "agent": event.get("source_agent"),
            "stream_event_type": event.get("type"),
            "stream_kind": stream_kind,
            "token_chars": len(text) if isinstance(text, str) else 0,
        },
    )


def _stream_node(namespace: object, metadata: object) -> str:
    if isinstance(namespace, tuple) and namespace:
        first = str(namespace[0])
        return first.split(":", 1)[0]

    if isinstance(metadata, dict):
        checkpoint_ns = str(metadata.get("checkpoint_ns") or "")
        if checkpoint_ns:
            return checkpoint_ns.split(":", 1)[0]

        langgraph_node = metadata.get("langgraph_node")
        if isinstance(langgraph_node, str):
            return langgraph_node

    return ""


def _tool_call_event(
    message: Any,
    *,
    source_agent: str,
    started_tool_calls: set[str],
) -> dict[str, Any] | None:
    tool_message = _completed_tool_event(message, source_agent=source_agent)
    if tool_message is not None:
        return tool_message

    for tool_call in _tool_call_chunks(message):
        tool_name = str(tool_call.get("name") or "")
        if not tool_name:
            continue

        tool_id = str(tool_call.get("id") or "")
        tool_key = tool_id or f"{tool_name}:{tool_call.get('index', 0)}"
        if tool_key in started_tool_calls:
            continue

        started_tool_calls.add(tool_key)
        return {
            "type": "agent.tool_call.delta",
            "source_agent": source_agent,
            "node": source_agent,
            "tool_call": {
                "name": tool_name,
                "status": "started",
                "id": tool_id or None,
            },
        }

    return None


def _completed_tool_event(message: Any, *, source_agent: str) -> dict[str, Any] | None:
    if getattr(message, "type", None) != "tool":
        return None

    tool_id = getattr(message, "tool_call_id", None)
    return {
        "type": "agent.tool_call.delta",
        "source_agent": source_agent,
        "node": source_agent,
        "tool_call": {
            "name": getattr(message, "name", None) or "tool",
            "status": "completed",
            "id": str(tool_id) if tool_id else None,
        },
    }


def _tool_call_chunks(message: Any) -> list[dict[str, Any]]:
    chunks = getattr(message, "tool_call_chunks", None)
    if isinstance(chunks, list):
        return [chunk for chunk in chunks if isinstance(chunk, dict)]

    tool_calls = getattr(message, "tool_calls", None)
    if isinstance(tool_calls, list):
        return [tool_call for tool_call in tool_calls if isinstance(tool_call, dict)]

    return [
        block
        for block in _message_content_blocks(message)
        if isinstance(block, dict) and block.get("type") in {"tool_call", "tool_call_chunk"}
    ]


def _message_text(message: Any) -> str:
    text = getattr(message, "text", None)
    if isinstance(text, str):
        return text

    content = getattr(message, "content", message)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            str(block.get("text") or "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    return ""


def _message_reasoning_text(message: Any) -> str:
    reasoning = getattr(message, "reasoning", None)
    if isinstance(reasoning, str):
        return reasoning
    if isinstance(reasoning, list):
        return "".join(str(token) for token in reasoning if token)

    return "".join(
        _reasoning_block_text(block)
        for block in _message_content_blocks(message)
        if isinstance(block, dict) and block.get("type") in _REASONING_BLOCK_TYPES
    )


def _message_content_blocks(message: Any) -> list[Any]:
    content_blocks = getattr(message, "content_blocks", None)
    if isinstance(content_blocks, list):
        return content_blocks

    content = getattr(message, "content", None)
    if isinstance(content, list):
        return content
    return []


def _reasoning_block_text(block: dict[str, Any]) -> str:
    for key in ("reasoning", "text", "content", "summary"):
        value = block.get(key)
        if isinstance(value, str):
            return value
    return ""


def _initial_state(
    message: str,
    *,
    session_id: str | None,
    turn_id: str,
    metadata: dict[str, Any] | None,
) -> ChatTurnState:
    normalized_metadata = metadata or {}
    base_state: ChatTurnState = {
        "session_id": session_id,
        "turn_id": turn_id,
        "messages": [{"role": "user", "content": message}],
        "metadata": normalized_metadata,
    }

    user_state = user_input_state(base_state)
    app_state = application_state(base_state)
    if user_state:
        base_state["user_input_state"] = user_state
    if app_state:
        base_state["application_state"] = app_state

    return base_state
