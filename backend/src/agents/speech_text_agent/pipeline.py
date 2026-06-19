from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from agents.speech_text_agent.agent import SpeechTextAgent
from agents.speech_text_agent.synthesis import SpeechSynthesisNode, SpeechSynthesisRequest
from logger import get_logger
from settings import settings

logger = get_logger(__name__)


# main 최종 답변 -> (평문 구어체 변환) -> (ElevenLabs TTS) -> 오디오 청크
# 흐름을 frontend 전달용 이벤트 dict 스트림으로 묶는 진입점.
# TTS가 설정되지 않았으면 LLM 호출 없이 즉시 종료한다(네트워크 미사용).
async def stream_speech_audio(
    answer: str,
    *,
    session_id: str | None = None,
    turn_id: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    if not settings.tts_configured:
        return

    session = session_id or f"anonymous-{uuid4().hex}"
    turn = turn_id or uuid4().hex

    # 1) 형식 제거 + 구어체 변환
    speech_text = ""
    async for event in SpeechTextAgent().stream_speech_text(answer):
        if event["type"] == "speech_text.final":
            speech_text = str(event.get("text") or "")
    if speech_text:
        yield {"type": "speech_text", "text": speech_text}

    # 2) 음성 합성 (base64 오디오 청크)
    request = SpeechSynthesisRequest(session_id=session, turn_id=turn, text=speech_text)
    async for event in SpeechSynthesisNode().stream_speech(request):
        kind = event.get("type")
        if kind == "tts.audio.chunk":
            yield {
                "type": "audio",
                "audio_base64": event["audio_base64"],
                "mime_type": event["mime_type"],
                "chunk_index": event["chunk_index"],
                "byte_length": event["byte_length"],
            }
        elif kind == "error":
            yield {"type": "audio_error", "message": event.get("message", "")}
        elif kind == "tts.completed":
            yield {"type": "audio_done", "chunks": event.get("chunks", 0)}
