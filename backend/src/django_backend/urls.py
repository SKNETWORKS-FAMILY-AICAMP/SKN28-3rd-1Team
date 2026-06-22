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

from api.audio import ChatAudioRequest, stream_chat_audio
from api.chat import ChatRequest, run_chat
from api.dependencies import get_chat_graph_runner
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
async def chat(request: HttpRequest) -> JsonResponse:
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
        chat_request = ChatRequest.model_validate(payload)
    except ValidationError as exc:
        return JsonResponse(
            {"detail": json.loads(exc.json())},
            status=422,
        )

    try:
        response = await run_chat(chat_request)
    except Exception:
        logger.exception("chat agent execution failed")
        return JsonResponse(
            {"detail": "Agent 실행 중 오류가 발생했습니다."},
            status=500,
        )

    return JsonResponse(response.model_dump())


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
        chat_request = ChatRequest.model_validate(payload)
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


async def _chat_stream_events(request: ChatRequest) -> AsyncIterator[str]:
    try:
        async for event in get_chat_graph_runner().run_stream(
            message=request.message.strip(),
            session_id=request.session_id,
            audio_enabled=request.audio_enabled,
            metadata=request.metadata,
        ):
            yield _sse_event(event)
    except Exception:
        logger.exception("chat stream agent execution failed")
        yield _sse_event(
            {
                "type": "error",
                "code": "agent_failed",
                "message": "Agent 실행 중 오류가 발생했습니다.",
            }
        )


@csrf_exempt
async def chat_audio_stream(request: HttpRequest) -> StreamingHttpResponse | JsonResponse:
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
        audio_request = ChatAudioRequest.model_validate(payload)
    except ValidationError as exc:
        return JsonResponse(
            {"detail": json.loads(exc.json())},
            status=422,
        )

    if not audio_request.answer.strip():
        return JsonResponse(
            {"detail": "answer는 비어 있을 수 없습니다."},
            status=422,
        )

    response = StreamingHttpResponse(
        _chat_audio_stream_events(audio_request),
        content_type="text/event-stream; charset=utf-8",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


async def _chat_audio_stream_events(request: ChatAudioRequest) -> AsyncIterator[str]:
    try:
        async for event in stream_chat_audio(request):
            yield _sse_event(event)
    except Exception:
        logger.exception("chat audio stream execution failed")
        yield _sse_event(
            {
                "type": "error",
                "code": "audio_failed",
                "message": "음성 생성 중 오류가 발생했습니다.",
            }
        )


def _sse_event(payload: dict) -> str:
    event_type = str(payload.get("type") or "message")
    data = json.dumps(payload, ensure_ascii=False, default=str)
    return f"event: {event_type}\ndata: {data}\n\n"


urlpatterns = [
    path("health", health),
    path("api/system/dependencies", dependencies),
    path("chat", chat),
    path("chat/stream", chat_stream),
    path("chat/audio/stream", chat_audio_stream),
]
