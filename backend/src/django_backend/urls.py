from __future__ import annotations

import json
from collections.abc import AsyncIterator

from django.http import (
    HttpRequest,
    HttpResponseNotAllowed,
    JsonResponse,
    StreamingHttpResponse,
)
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from pydantic import ValidationError

from django_backend.dependencies import get_chat_graph_runner
from django_backend.schemas import ChatStreamRequest
from logger import get_logger
from settings import settings

logger = get_logger(__name__)


def health(_: HttpRequest) -> JsonResponse:
    return JsonResponse(
        {
            "status": "ok",
            "service": settings.metadata.name,
            "version": settings.metadata.version,
        }
    )


def dependencies(_: HttpRequest) -> JsonResponse:
    return JsonResponse(
        {
            "runtime": "Django ASGI + HTTP SSE",
            "agent_stack": ["LangChain", "OpenRouter", "MCP Tool Server"],
            "settings": "pydantic-settings",
        }
    )


@csrf_exempt
async def chat_stream(request: HttpRequest) -> StreamingHttpResponse | JsonResponse:
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse(
            {"detail": "JSON body를 전송해 주세요."},
            status=400,
        )

    try:
        chat_request = ChatStreamRequest.model_validate(payload)
    except ValidationError as exc:
        return JsonResponse(
            {"detail": json.loads(exc.json())},
            status=422,
        )

    if not chat_request.message.strip():
        return JsonResponse(
            {"detail": "message는 비어 있을 수 없습니다."},
            status=422,
        )

    response = StreamingHttpResponse(
        _chat_stream_events(chat_request),
        content_type="text/event-stream; charset=utf-8",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


async def _chat_stream_events(request: ChatStreamRequest) -> AsyncIterator[str]:
    try:
        async for event in get_chat_graph_runner().run_stream(
            message=request.message.strip(),
            session_id=request.session_id,
            metadata=request.metadata,
        ):
            yield _sse_event(event)
    except Exception:
        logger.exception(
            "chat stream agent execution failed",
            extra={
                "event": "chat.invocation.failed",
                "conversation_id": request.session_id,
                "endpoint": "/chat/stream",
                "message_chars": len(request.message.strip()),
            },
        )
        yield _sse_event(
            {
                "type": "error",
                "code": "agent_failed",
                "message": "Agent 실행 중 오류가 발생했습니다.",
            }
        )


def _sse_event(payload: dict) -> str:
    event_type = str(payload.get("type") or "message")
    data = json.dumps(payload, ensure_ascii=False, default=str)
    return f"event: {event_type}\ndata: {data}\n\n"


urlpatterns = [
    path("health", health),
    path("api/system/dependencies", dependencies),
    path("chat/stream", chat_stream),
]
