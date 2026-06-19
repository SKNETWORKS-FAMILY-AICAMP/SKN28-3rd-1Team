from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from graph.graph import create_chat_turn_graph
from graph.state import ChatTurnState
from logger import get_logger
from utils import application_state, user_input_state

logger = get_logger(__name__)

_TEXT_STREAM_NODES = {"main_agent"}
_TOOL_STREAM_NODES = {"main_agent", "window_changing_agent"}


class ChatGraphRunner:
    def __init__(self) -> None:
        self._graph: Any | None = None

    async def run_stream(
        self,
        message: str,
        *,
        session_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        graph = await self._get_graph()
        turn_id = uuid4().hex
        state = _initial_state(
            message,
            session_id=session_id,
            turn_id=turn_id,
            metadata=metadata,
        )

        logger.info(
            "chat graph invocation started session_id=%s turn_id=%s message_chars=%d",
            session_id,
            turn_id,
            len(message),
        )
        started_tool_calls: set[str] = set()
        async for event in graph.astream(
            state,
            config={"configurable": {"thread_id": session_id or turn_id}},
            stream_mode=["messages", "custom"],
            subgraphs=True,
            version="v2",
        ):
            backend_event = _backend_event(event, started_tool_calls=started_tool_calls)
            if backend_event is not None:
                yield backend_event

        logger.info(
            "chat graph invocation completed session_id=%s turn_id=%s",
            session_id,
            turn_id,
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
) -> dict[str, Any] | None:
    if isinstance(event, dict) and event.get("type") == "custom":
        data = event.get("data")
        if isinstance(data, dict):
            return data

    if isinstance(event, dict) and event.get("type") == "messages":
        return _message_stream_event(
            event,
            started_tool_calls=started_tool_calls if started_tool_calls is not None else set(),
        )

    if isinstance(event, dict):
        return None
    return {"type": "message", "data": event}


def _message_stream_event(
    event: dict[str, Any],
    *,
    started_tool_calls: set[str],
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

    if node_name in _TEXT_STREAM_NODES:
        text = _message_text(message)
        if text:
            return {"type": "delta", "content": text}

    return None


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

    return []


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
