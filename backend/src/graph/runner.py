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

_TEXT_STREAM_NODES = {"main_agent"}
_TOOL_STREAM_NODES = {"main_agent", "window_changing_agent"}
_INTERNAL_STREAM_NODES = {"speech_text_agent"}
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
            stream_mode=["messages", "custom"],
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

    async def run_once(
        self,
        message: str,
        *,
        session_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        tool_calls: dict[str, dict[str, Any]] = {}
        stream = self.run_stream(message, session_id=session_id, metadata=metadata)
        try:
            async for event in stream:
                event_type = event.get("type")
                if event_type == "tool_call":
                    payload = event.get("tool_call")
                    if isinstance(payload, dict):
                        _record_tool_call(tool_calls, payload)
                elif event_type == "final":
                    return _final_payload(event, tool_calls=list(tool_calls.values()))
        finally:
            await stream.aclose()

        return {"type": "final", "answer": "", "tool_calls": list(tool_calls.values()), "sources": []}

    async def _get_graph(self) -> Any:
        if self._graph is not None:
            return self._graph

        self._graph = await create_chat_turn_graph()
        return self._graph


async def run_agent(
    message: str,
    *,
    session_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return await ChatGraphRunner().run_once(
        message,
        session_id=session_id,
        metadata=metadata,
    )


async def run_agent_stream(
    message: str,
    *,
    session_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    async for event in ChatGraphRunner().run_stream(
        message,
        session_id=session_id,
        metadata=metadata,
    ):
        yield event


__all__ = [
    "ChatGraphRunner",
    "run_agent",
    "run_agent_stream",
]


def _final_payload(
    payload: dict[str, Any],
    *,
    tool_calls: list[dict[str, Any]],
) -> dict[str, Any]:
    final_payload = dict(payload)
    final_payload.setdefault("tool_calls", tool_calls)
    final_payload.setdefault("sources", [])
    return final_payload


def _record_tool_call(
    tool_calls: dict[str, dict[str, Any]],
    payload: dict[str, Any],
) -> None:
    tool_id = str(payload.get("id") or "")
    tool_name = str(payload.get("name") or "tool")
    key = tool_id or tool_name
    tool_calls[key] = {
        "name": tool_name,
        "status": str(payload.get("status") or "completed"),
        "id": tool_id or None,
    }


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
        tool_event = _tool_call_event(message, started_tool_calls=started_tool_calls)
        if tool_event is not None:
            return tool_event

    reasoning = _message_reasoning_text(message)
    if reasoning:
        if node_name in _INTERNAL_STREAM_NODES:
            backend_event = {
                "type": "internal_delta",
                "agent": node_name,
                "kind": "thinking",
                "content": reasoning,
            }
            _log_internal_stream_event(
                backend_event,
                conversation_id=conversation_id,
                turn_id=turn_id,
            )
            return backend_event

        backend_event = {
            "type": "thinking_delta",
            "agent": node_name or None,
            "content": reasoning,
        }
        _log_internal_stream_event(
            backend_event,
            conversation_id=conversation_id,
            turn_id=turn_id,
        )
        return backend_event

    if node_name in _TEXT_STREAM_NODES:
        text = _message_text(message)
        if text:
            return {"type": "delta", "content": text}

    if node_name in _INTERNAL_STREAM_NODES:
        text = _message_text(message)
        if text:
            backend_event = {
                "type": "internal_delta",
                "agent": node_name,
                "kind": "text",
                "content": text,
            }
            _log_internal_stream_event(
                backend_event,
                conversation_id=conversation_id,
                turn_id=turn_id,
            )
            return backend_event

    return None


def _log_internal_stream_event(
    event: dict[str, Any],
    *,
    conversation_id: str | None,
    turn_id: str | None,
) -> None:
    content = event.get("content")
    logger.debug(
        "agent internal stream token",
        extra={
            "event": "agent.internal_stream_token",
            "conversation_id": conversation_id,
            "turn_id": turn_id,
            "agent": event.get("agent"),
            "stream_event_type": event.get("type"),
            "stream_kind": event.get("kind") or "thinking",
            "token_chars": len(content) if isinstance(content, str) else 0,
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
    started_tool_calls: set[str],
) -> dict[str, Any] | None:
    tool_message = _completed_tool_event(message)
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
            "type": "tool_call",
            "tool_call": {
                "name": tool_name,
                "status": "started",
                "id": tool_id or None,
            },
        }

    return None


def _completed_tool_event(message: Any) -> dict[str, Any] | None:
    if getattr(message, "type", None) != "tool":
        return None

    tool_id = getattr(message, "tool_call_id", None)
    return {
        "type": "tool_call",
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
