from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from pydantic import BaseModel, Field

from graph import run_agent


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str = Field(..., min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ToolCallResult(BaseModel):
    name: str
    status: str
    id: str | None = None


class Source(BaseModel):
    title: str | None = None
    url: str | None = None
    excerpt: str | None = None


class ChatResponse(BaseModel):
    answer: str
    tool_calls: list[ToolCallResult] = Field(default_factory=list)
    sources: list[Source] = Field(default_factory=list)
    session_id: str | None = None


def tool_call_response(tool_call: Mapping[str, Any]) -> ToolCallResult:
    return ToolCallResult(
        name=str(tool_call.get("name") or "tool"),
        status=str(tool_call.get("status") or "completed"),
        id=str(tool_call.get("id")) if tool_call.get("id") else None,
    )


def source_response(source: Mapping[str, Any]) -> Source:
    return Source(
        title=str(source.get("title")) if source.get("title") else None,
        url=str(source.get("url")) if source.get("url") else None,
        excerpt=str(source.get("excerpt")) if source.get("excerpt") else None,
    )


def chat_response_from_result(result: Mapping[str, Any], session_id: str | None) -> ChatResponse:
    return ChatResponse(
        answer=str(result.get("answer") or ""),
        tool_calls=[
            tool_call_response(tool_call)
            for tool_call in result.get("tool_calls") or []
            if isinstance(tool_call, Mapping)
        ],
        sources=[
            source_response(source)
            for source in result.get("sources") or []
            if isinstance(source, Mapping)
        ],
        session_id=session_id,
    )


async def run_chat(request: ChatRequest) -> ChatResponse:
    result = await run_agent(
        request.message,
        session_id=request.session_id,
        metadata=request.metadata,
    )
    return chat_response_from_result(result, request.session_id)


__all__ = [
    "ChatRequest",
    "ChatResponse",
    "Source",
    "ToolCallResult",
    "chat_response_from_result",
    "run_chat",
    "source_response",
    "tool_call_response",
]
