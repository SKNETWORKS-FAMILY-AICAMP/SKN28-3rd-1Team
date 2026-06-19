from __future__ import annotations

import base64
from collections.abc import AsyncIterator
from typing import TYPE_CHECKING, Any

from elevenlabs.client import AsyncElevenLabs
from elevenlabs.types import VoiceSettings

from logger import get_logger
from nodes.speech_synthesis_node.schemas import SpeechSynthesisRequest
from settings import Settings, settings
from settings.elevenlabs import ElevenLabsSettings

if TYPE_CHECKING:
    from graph.state import ChatTurnState

logger = get_logger(__name__)


class SpeechSynthesisNode:
    def __init__(
        self,
        config: Settings | None = None,
        client: AsyncElevenLabs | None = None,
    ) -> None:
        self._settings = config or settings
        self._client = client

    async def stream_speech(
        self,
        request: SpeechSynthesisRequest,
    ) -> AsyncIterator[dict[str, Any]]:
        elevenlabs = self._settings.elevenlabs
        mime_type = _mime_type(elevenlabs.output_format)

        if not self._settings.tts_configured:
            logger.warning("speech synthesis skipped: ELEVENLABS_API_KEY/VOICE_ID not set")
            yield {
                "type": "error",
                "code": "tts_unconfigured",
                "message": "ELEVENLABS_API_KEY와 ELEVENLABS_VOICE_ID를 설정하면 음성이 활성화됩니다.",
            }
            yield {"type": "tts.completed", "configured": False, "chunks": 0}
            return

        chunk_count = 0
        try:
            audio_stream = self._elevenlabs_client().text_to_speech.stream(
                voice_id=str(elevenlabs.voice_id),
                text=request.text,
                model_id=elevenlabs.tts_model_id,
                output_format=elevenlabs.output_format,
                voice_settings=_voice_settings(elevenlabs),
            )
            async for audio_chunk in audio_stream:
                if not audio_chunk:
                    continue

                chunk_count += 1
                yield {
                    "type": "tts.audio.chunk",
                    "session_id": request.session_id,
                    "turn_id": request.turn_id,
                    "audio_base64": base64.b64encode(audio_chunk).decode("ascii"),
                    "chunk_index": chunk_count,
                    "byte_length": len(audio_chunk),
                    "mime_type": mime_type,
                }

            logger.info(
                "speech synthesis completed session=%s turn=%s chunks=%d",
                request.session_id,
                request.turn_id,
                chunk_count,
            )
            yield {"type": "tts.completed", "configured": True, "chunks": chunk_count}
        except Exception as error:
            logger.exception("speech synthesis failed")
            yield {"type": "error", "code": "tts_failed", "message": str(error)}
            yield {"type": "tts.completed", "configured": True, "chunks": chunk_count}

    async def stream_speech_from_state(
        self,
        state: ChatTurnState,
    ) -> AsyncIterator[dict[str, Any]]:
        text = str(state.get("final_response_script") or "")
        request = SpeechSynthesisRequest(
            session_id=str(state.get("session_id") or ""),
            turn_id=str(state.get("turn_id") or ""),
            text=text,
        )
        async for event in self.stream_speech(request):
            if event.get("type") == "tts.completed":
                state["tts_configured"] = bool(event.get("configured"))
            yield event

    def _elevenlabs_client(self) -> AsyncElevenLabs:
        if self._client is not None:
            return self._client

        elevenlabs = self._settings.elevenlabs
        api_key = elevenlabs.api_key.get_secret_value() if elevenlabs.api_key else None
        self._client = AsyncElevenLabs(
            api_key=api_key,
            base_url=elevenlabs.base_url or None,
        )
        return self._client


def _voice_settings(elevenlabs: ElevenLabsSettings) -> VoiceSettings:
    return VoiceSettings(
        stability=elevenlabs.stability,
        similarity_boost=elevenlabs.similarity_boost,
        style=elevenlabs.style,
        speed=elevenlabs.speed,
        use_speaker_boost=elevenlabs.use_speaker_boost,
    )


def _mime_type(output_format: str) -> str:
    if output_format.startswith("mp3"):
        return "audio/mpeg"
    if output_format.startswith("pcm"):
        return "audio/pcm"
    if output_format.startswith("ulaw"):
        return "audio/basic"
    return "application/octet-stream"
