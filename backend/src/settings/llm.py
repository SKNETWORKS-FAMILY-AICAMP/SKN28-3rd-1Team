from __future__ import annotations

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class LlmSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LLM_", extra="ignore")

    # OpenRouter credential.
    openrouter_api_key: SecretStr | None = Field(default=None, validation_alias="OPENROUTER_API_KEY")

    # OpenRouter routing.
    openrouter_model: str = "openai/gpt-oss-120b"
    openrouter_app_title: str = "SKN28 Backend Agent"
    openrouter_app_url: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_provider_order: list[str] = Field(default_factory=lambda: ["cerebras"])
    openrouter_allow_fallbacks: bool = True
    openrouter_require_parameters: bool = False

    # Main chat request runtime.
    temperature: float = 0.2
    timeout_ms: int = 60_000
    max_retries: int = 2
    max_tokens: int | None = Field(default=None, gt=0)
    reasoning_effort: str | None = None

    # Speech text request runtime.
    speech_text_model: str = "openai/gpt-oss-120b"
    speech_text_temperature: float = 0.0
    speech_text_max_tokens: int | None = Field(default=None, gt=0)

    @field_validator("max_tokens", "speech_text_max_tokens", mode="before")
    @classmethod
    def _empty_str_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value
