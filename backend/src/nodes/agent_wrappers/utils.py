from __future__ import annotations

import inspect
from collections.abc import Mapping
from typing import Any


async def invoke_agent(agent: Any, payload: dict[str, Any]) -> Any:
    ainvoke = getattr(agent, "ainvoke", None)
    if callable(ainvoke):
        return await ainvoke(payload)

    result = agent(payload) if callable(agent) else agent
    if inspect.isawaitable(result):
        return await result
    return result


def final_message_text(output: Mapping[str, Any]) -> str:
    for message in reversed(output.get("messages") or []):
        if getattr(message, "type", None) == "ai":
            text = message_text(message)
            if text:
                return text
    return ""


def message_text(message: Any) -> str:
    text = getattr(message, "text", None)
    if isinstance(text, str):
        return text.strip()

    content = getattr(message, "content", message)
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        return " ".join(
            str(block.get("text") or "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        ).strip()
    return str(content).strip() if content is not None else ""
