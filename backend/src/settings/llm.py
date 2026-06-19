from __future__ import annotations

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class LlmAgentModelSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LLM_", extra="ignore")

    # Main agent model runtime.
    chat_provider: str = "cerebras"
    chat_model: str = "gpt-oss-120b"
    chat_temperature: float = 0.2
    chat_timeout_ms: int = 60_000
    chat_max_retries: int = 2
    chat_max_tokens: int | None = Field(default=None, gt=0)
    chat_reasoning_effort: str | None = None

    # Speech text agent model runtime.
    speech_text_provider: str | None = None
    speech_text_model: str = "gpt-oss-120b"
    speech_text_temperature: float = 0.0
    speech_text_timeout_ms: int = 60_000
    speech_text_max_retries: int = 2
    speech_text_max_tokens: int | None = Field(default=None, gt=0)
    speech_text_reasoning_effort: str | None = None

    @field_validator(
        "chat_max_tokens",
        "speech_text_max_tokens",
        "chat_reasoning_effort",
        "speech_text_reasoning_effort",
        "speech_text_provider",
        mode="before",
    )
    @classmethod
    def _empty_str_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value


class LlmProviderSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LLM_", extra="ignore")

    # Provider credentials.
    openrouter_api_key: SecretStr | None = Field(default=None, validation_alias="OPENROUTER_API_KEY")
    cerebras_api_key: SecretStr | None = Field(default=None, validation_alias="CEREBRAS_API_KEY")

    # OpenRouter provider options.
    openrouter_app_title: str = "SKN28 Backend Agent"
    openrouter_app_url: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_provider_order: list[str] = Field(default_factory=lambda: ["cerebras"])
    openrouter_allow_fallbacks: bool = True
    openrouter_require_parameters: bool = False

    # Cerebras provider options.
    cerebras_base_url: str | None = None

    @field_validator("openrouter_app_url", "cerebras_base_url", mode="before")
    @classmethod
    def _empty_str_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value


class LlmSettings:
    def __init__(
        self,
        *,
        agent_models: LlmAgentModelSettings | None = None,
        providers: LlmProviderSettings | None = None,
    ) -> None:
        self.agent_models = agent_models or LlmAgentModelSettings()
        self.providers = providers or LlmProviderSettings()
