from __future__ import annotations

import json

from collections import Counter
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class SseEvent:
    seq: int
    event: str
    data: Any
    raw_data: str


def parse_sse_text(text: str) -> list[SseEvent]:
    events: list[SseEvent] = []
    event_name = "message"
    data_lines: list[str] = []

    for line in text.splitlines():
        if line == "":
            if data_lines:
                events.append(_build_event(len(events) + 1, event_name, data_lines))
            event_name = "message"
            data_lines = []
            continue

        if line.startswith("event:"):
            event_name = line.removeprefix("event:").strip() or "message"
            continue

        if line.startswith("data:"):
            data_lines.append(line.removeprefix("data:").lstrip())

    if data_lines:
        events.append(_build_event(len(events) + 1, event_name, data_lines))

    return events


def summarize_events(events: list[SseEvent]) -> dict[str, Any]:
    tool_calls: list[dict[str, Any]] = []
    error_events: list[dict[str, Any]] = []
    final_answer = ""
    speech_final = ""
    session_id = None
    turn_id = None
    event_type_counts: Counter[str] = Counter()

    for event in events:
        event_type_counts[event.event] += 1
        data = event.data if isinstance(event.data, dict) else {}
        data_type = str(data.get("type") or event.event)

        if data_type == "agent.tool_call.delta":
            tool_call = data.get("tool_call")
            if isinstance(tool_call, dict):
                tool_calls.append(
                    {
                        "name": tool_call.get("name"),
                        "status": tool_call.get("status"),
                        "id": tool_call.get("id"),
                        "source_agent": data.get("source_agent"),
                    }
                )

        if data_type == "agent.text.final":
            source_agent = str(data.get("source_agent") or "")
            node = str(data.get("node") or "")
            if source_agent == "main_agent" or node == "main_agent_result":
                final_answer = str(data.get("answer") or data.get("text") or "")
                session_id = data.get("session_id") or session_id
                turn_id = data.get("turn_id") or turn_id

        if data_type == "speech_text.final":
            speech_final = str(data.get("text") or "")
            session_id = data.get("session_id") or session_id
            turn_id = data.get("turn_id") or turn_id

        if event.event == "error" or data_type == "error":
            error_events.append({"seq": event.seq, "event": event.event, "data": data})

        if data_type == "task.failed":
            error_events.append({"seq": event.seq, "event": event.event, "data": data})

    actual_tools = _unique_ordered(
        str(tool_call.get("name"))
        for tool_call in tool_calls
        if tool_call.get("name")
    )

    return {
        "event_count": len(events),
        "event_type_counts": dict(sorted(event_type_counts.items())),
        "actual_tool_use": bool(actual_tools),
        "actual_tools": actual_tools,
        "tool_calls": tool_calls,
        "final_answer": final_answer,
        "speech_final": speech_final,
        "error_events": error_events,
        "session_id": session_id,
        "turn_id": turn_id,
    }


def _build_event(seq: int, event_name: str, data_lines: list[str]) -> SseEvent:
    raw_data = "\n".join(data_lines)
    try:
        data: Any = json.loads(raw_data)
    except json.JSONDecodeError:
        data = raw_data
    return SseEvent(seq=seq, event=event_name, data=data, raw_data=raw_data)


def _unique_ordered(values: Any) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result
