from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = SERVICE_DIR / "src"
REPO_ROOT = SERVICE_DIR.parent

# backend 환경 변수와 기본 설정을 담는 설정 클래스
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=SERVICE_DIR / ".env",
        env_file_encoding="utf-8",
        env_prefix="BACKEND_",
        extra="ignore",
    )

    service_name: str = "SKN28 Backend"
    service_version: str = "0.1.0"
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    reload: bool = False
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:8501",
            "http://127.0.0.1:8501",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
    )
    langchain_project: str | None = None
    repo_root: Path = REPO_ROOT
    src_dir: Path = SRC_DIR

    openrouter_api_key: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("OPENROUTER_API_KEY", "BACKEND_OPENROUTER_API_KEY"),
    )
    openrouter_model: str = "openai/gpt-oss-120b"
    openrouter_app_title: str = "SKN28 Backend Agent"
    openrouter_app_url: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_provider_order: list[str] = Field(default_factory=lambda: ["cerebras"])
    openrouter_allow_fallbacks: bool = True
    openrouter_require_parameters: bool = False

    llm_temperature: float = 0.2
    llm_timeout_ms: int = 60_000
    llm_max_retries: int = 2
    llm_max_tokens: int | None = Field(default=None, gt=0)
    llm_reasoning_effort: str | None = None

    # speech_text_agent: 최종 답변을 TTS용 평문 구어체로 정리하는 LLM 단계
    speech_text_model: str = "openai/gpt-oss-120b"
    speech_text_temperature: float = 0.0
    speech_text_max_tokens: int | None = Field(default=None, gt=0)

    # speech_text_agent: ElevenLabs TTS (음성 합성). 키는 .env에만 둔다.
    elevenlabs_api_key: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("ELEVENLABS_API_KEY", "BACKEND_ELEVENLABS_API_KEY"),
    )
    elevenlabs_voice_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("ELEVENLABS_VOICE_ID", "BACKEND_ELEVENLABS_VOICE_ID"),
    )
    elevenlabs_voice_name: str | None = Field(
        default=None,
        validation_alias=AliasChoices("ELEVENLABS_VOICE_NAME", "BACKEND_ELEVENLABS_VOICE_NAME"),
    )
    elevenlabs_tts_model_id: str = "eleven_flash_v2_5"
    elevenlabs_tts_ws_base_url: str = "wss://api.elevenlabs.io/v1/text-to-speech"
    elevenlabs_output_format: str = "mp3_44100_128"
    elevenlabs_stability: float = 0.5
    elevenlabs_similarity_boost: float = 0.6
    elevenlabs_style: float = 0.0
    elevenlabs_speed: float = 1.05
    elevenlabs_use_speaker_boost: bool = True

    # optional int 필드에 .env의 빈 문자열("")이 들어오면 None으로 처리한다.
    @field_validator("llm_max_tokens", "speech_text_max_tokens", mode="before")
    @classmethod
    def _empty_str_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    # 음성 출력은 API 키와 voice_id가 모두 있을 때만 활성화한다.
    @property
    def tts_configured(self) -> bool:
        api_key = self.elevenlabs_api_key.get_secret_value() if self.elevenlabs_api_key else ""
        return bool(api_key.strip() and (self.elevenlabs_voice_id or "").strip())

    rag_mcp_url: str = "http://127.0.0.1:8010/mcp"
    enable_rag_tools: bool = True
    tool_timeout_ms: int = Field(default=30_000, gt=0)

    log_level: str = "INFO"
    log_llm_context: bool = True

# Settings 인스턴스를 캐시해서 앱 전체에서 재사용
@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
