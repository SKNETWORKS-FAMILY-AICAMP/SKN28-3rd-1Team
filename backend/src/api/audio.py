from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field

from agents.speech_text_agent import create_final_response_script_result, create_speech_text_agent
from graph.timing import log_chat_timing, new_timer
from nodes.speech_synthesis_node import SpeechSynthesisNode, SpeechSynthesisRequest


class ChatAudioRequest(BaseModel):
    session_id: str | None = None
    turn_id: str | None = None
    answer: str = Field(..., min_length=1)


async def stream_chat_audio(request: ChatAudioRequest) -> AsyncIterator[dict[str, Any]]:
    turn_id = request.turn_id or uuid4().hex
    started_at = new_timer()
    answer = request.answer.strip()

    log_chat_timing(
        "audio_request_start",
        started_at=started_at,
        session_id=request.session_id,
        turn_id=turn_id,
        audio_enabled=True,
        answer_chars=len(answer),
    )

    speech_text_agent = await create_speech_text_agent()
    speech_text_result = await create_final_response_script_result(
        speech_text_agent,
        answer,
        config={},
    )
    log_chat_timing(
        "speech_text_done",
        started_at=started_at,
        session_id=request.session_id,
        turn_id=turn_id,
        audio_enabled=True,
        script_chars=len(speech_text_result.text),
        script_source=speech_text_result.source,
        llm_used=speech_text_result.llm_used,
    )
    yield {
        "type": "speech_text",
        "text": speech_text_result.text,
        "source": speech_text_result.source,
        "llm_used": speech_text_result.llm_used,
        "session_id": request.session_id,
        "turn_id": turn_id,
    }

    first_audio_logged = False
    synthesis_node = SpeechSynthesisNode()
    synthesis_request = SpeechSynthesisRequest(
        session_id=str(request.session_id or ""),
        turn_id=turn_id,
        text=speech_text_result.text,
    )

    async for event in synthesis_node.stream_speech(synthesis_request):
        payload = _speech_synthesis_payload(event, session_id=request.session_id, turn_id=turn_id)
        if payload is None:
            continue

        if payload.get("type") == "audio" and not first_audio_logged:
            first_audio_logged = True
            log_chat_timing(
                "first_audio",
                started_at=started_at,
                session_id=request.session_id,
                turn_id=turn_id,
                audio_enabled=True,
                byte_length=payload.get("byte_length"),
            )
        elif payload.get("type") == "audio_done":
            log_chat_timing(
                "audio_done",
                started_at=started_at,
                session_id=request.session_id,
                turn_id=turn_id,
                audio_enabled=True,
                chunks=payload.get("chunks"),
                configured=payload.get("configured"),
            )

        yield payload


def _speech_synthesis_payload(
    event: dict[str, Any],
    *,
    session_id: str | None,
    turn_id: str,
) -> dict[str, Any] | None:
    event_type = event.get("type")
    if event_type == "tts.audio.chunk":
        return {
            "type": "audio",
            "audio_base64": event.get("audio_base64"),
            "mime_type": event.get("mime_type"),
            "chunk_index": event.get("chunk_index"),
            "byte_length": event.get("byte_length"),
            "session_id": session_id,
            "turn_id": turn_id,
        }

    if event_type == "tts.completed":
        return {
            "type": "audio_done",
            "chunks": event.get("chunks", 0),
            "configured": event.get("configured"),
            "session_id": session_id,
            "turn_id": turn_id,
        }

    if event_type == "error":
        return {
            "type": "error",
            "code": event.get("code") or "tts_failed",
            "message": event.get("message") or "음성 합성 중 오류가 발생했습니다.",
            "session_id": session_id,
            "turn_id": turn_id,
        }

    return None
