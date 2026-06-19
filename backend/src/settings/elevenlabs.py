from __future__ import annotations

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class ElevenLabsSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ELEVENLABS_", extra="ignore")

    api_key: SecretStr | None = None
    voice_id: str | None = None
    tts_model_id: str = "eleven_flash_v2_5"
    tts_ws_base_url: str = "wss://api.elevenlabs.io/v1/text-to-speech"
    output_format: str = "mp3_44100_128"
    stability: float = 0.5
    similarity_boost: float = 0.6
    style: float = 0.0
    speed: float = 1.05
    use_speaker_boost: bool = True

    @property
    def configured(self) -> bool:
        api_key = self.api_key.get_secret_value() if self.api_key else ""
        return bool(api_key.strip() and (self.voice_id or "").strip())
