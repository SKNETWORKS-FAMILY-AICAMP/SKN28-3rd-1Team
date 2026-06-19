from __future__ import annotations

import base64
import binascii
import json
import ssl
from collections.abc import AsyncIterator
from typing import Any
from urllib.parse import quote, urlencode

import certifi
from pydantic import BaseModel
from websockets.asyncio.client import connect

from logger import get_logger
from settings import Settings, settings

logger = get_logger(__name__)

# macOS framework Python은 루트 CA가 없어 wss TLS 검증이 실패하므로
# certifi CA 번들로 만든 SSL 컨텍스트를 사용한다.
_TLS_CONTEXT = ssl.create_default_context(cafile=certifi.where())


# 음성 합성 요청 단위 (한 turn에 대한 텍스트)
class SpeechSynthesisRequest(BaseModel):
    session_id: str
    turn_id: str
    text: str


# 정리된 음성 텍스트를 ElevenLabs websocket TTS로 합성해
# base64 오디오 청크 스트림으로 내보내는 노드
class SpeechSynthesisNode:
    def __init__(self, config: Settings | None = None) -> None:
        self._settings = config or settings

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
        url = self._websocket_url()
        tls = _TLS_CONTEXT if url.startswith("wss://") else None
        try:
            async with connect(url, max_size=8 * 1024 * 1024, ssl=tls) as websocket:
                await websocket.send(json.dumps(self._initial_payload()))
                await websocket.send(
                    json.dumps({"text": request.text, "try_trigger_generation": True, "flush": True})
                )
                await websocket.send(json.dumps({"text": ""}))

                async for raw_message in websocket:
                    payload = _decode_json(raw_message)
                    if payload is None:
                        continue

                    audio_base64 = payload.get("audio")
                    if isinstance(audio_base64, str) and audio_base64:
                        chunk_count += 1
                        yield {
                            "type": "tts.audio.chunk",
                            "session_id": request.session_id,
                            "turn_id": request.turn_id,
                            "audio_base64": audio_base64,
                            "chunk_index": chunk_count,
                            "byte_length": _base64_byte_length(audio_base64),
                            "mime_type": mime_type,
                        }

                    if payload.get("isFinal"):
                        break

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

    def _websocket_url(self) -> str:
        elevenlabs = self._settings.elevenlabs
        voice_id = quote(str(elevenlabs.voice_id), safe="")
        query = urlencode(
            {
                "model_id": elevenlabs.tts_model_id,
                "output_format": elevenlabs.output_format,
            }
        )
        base = elevenlabs.tts_ws_base_url.rstrip("/")
        return f"{base}/{voice_id}/stream-input?{query}"

    def _initial_payload(self) -> dict[str, Any]:
        elevenlabs = self._settings.elevenlabs
        api_key = elevenlabs.api_key
        return {
            "text": " ",
            "voice_settings": {
                "stability": elevenlabs.stability,
                "similarity_boost": elevenlabs.similarity_boost,
                "style": elevenlabs.style,
                "speed": elevenlabs.speed,
                "use_speaker_boost": elevenlabs.use_speaker_boost,
            },
            "generation_config": {"chunk_length_schedule": [120, 160, 250, 290]},
            "xi_api_key": api_key.get_secret_value() if api_key else None,
        }


def _decode_json(raw_message: str | bytes) -> dict[str, Any] | None:
    if isinstance(raw_message, bytes):
        raw_message = raw_message.decode("utf-8", errors="replace")
    try:
        payload = json.loads(raw_message)
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _base64_byte_length(value: str) -> int:
    try:
        return len(base64.b64decode(value, validate=True))
    except binascii.Error:
        return 0


def _mime_type(output_format: str) -> str:
    if output_format.startswith("mp3"):
        return "audio/mpeg"
    if output_format.startswith("pcm"):
        return "audio/pcm"
    if output_format.startswith("ulaw"):
        return "audio/basic"
    return "application/octet-stream"
