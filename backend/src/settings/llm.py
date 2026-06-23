from __future__ import annotations

from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

LlmAgentName = Literal["main", "sanitize", "window"]
LlmReasoningEffort = Literal["low", "medium", "high"]
LlmReasoningFormat = Literal["parsed", "raw", "hidden", "none"]
DEFAULT_MAIN_PROVIDER = "cerebras"
DEFAULT_MAIN_MODEL = "zai-glm-4.7"
DEFAULT_MAIN_REASONING_EFFORT: LlmReasoningEffort = "high"
DEFAULT_MAIN_REASONING_FORMAT: LlmReasoningFormat = "hidden"
DEFAULT_MAIN_CLEAR_THINKING = False
DEFAULT_SANITIZE_REASONING_EFFORT: LlmReasoningEffort = "low"
DEFAULT_WINDOW_REASONING_EFFORT: LlmReasoningEffort = "medium"
DEFAULT_WINDOW_REASONING_FORMAT: LlmReasoningFormat = "hidden"
DEFAULT_WINDOW_CLEAR_THINKING = False
DEFAULT_TIMEOUT_MS = 60_000
DEFAULT_MAX_RETRIES = 2
DEFAULT_OPENROUTER_APP_TITLE = "SKN28 Backend Agent"
DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class LlmAgentSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    main_provider: str = Field(default=DEFAULT_MAIN_PROVIDER, validation_alias="LLM_AGENT_MAIN_PROVIDER")
    main_model: str = Field(default=DEFAULT_MAIN_MODEL, validation_alias="LLM_AGENT_MAIN_MODEL")
    main_reasoning_effort: LlmReasoningEffort | None = Field(
        default=DEFAULT_MAIN_REASONING_EFFORT,
        validation_alias="LLM_AGENT_MAIN_REASONING_EFFORT",
    )
    main_reasoning_format: LlmReasoningFormat | None = Field(
        default=DEFAULT_MAIN_REASONING_FORMAT,
        validation_alias="LLM_AGENT_MAIN_REASONING_FORMAT",
    )
    main_clear_thinking: bool | None = Field(
        default=DEFAULT_MAIN_CLEAR_THINKING,
        validation_alias="LLM_AGENT_MAIN_CLEAR_THINKING",
    )
    sanitize_provider: str | None = Field(default=None, validation_alias="LLM_AGENT_SANITIZE_PROVIDER")
    sanitize_model: str | None = Field(default=None, validation_alias="LLM_AGENT_SANITIZE_MODEL")
    sanitize_reasoning_effort: LlmReasoningEffort | None = Field(
        default=DEFAULT_SANITIZE_REASONING_EFFORT,
        validation_alias="LLM_AGENT_SANITIZE_REASONING_EFFORT",
    )
    window_provider: str | None = Field(default=None, validation_alias="LLM_AGENT_WINDOW_PROVIDER")
    window_model: str | None = Field(default=None, validation_alias="LLM_AGENT_WINDOW_MODEL")
    window_reasoning_effort: LlmReasoningEffort | None = Field(
        default=DEFAULT_WINDOW_REASONING_EFFORT,
        validation_alias="LLM_AGENT_WINDOW_REASONING_EFFORT",
    )
    window_reasoning_format: LlmReasoningFormat | None = Field(
        default=DEFAULT_WINDOW_REASONING_FORMAT,
        validation_alias="LLM_AGENT_WINDOW_REASONING_FORMAT",
    )
    window_clear_thinking: bool | None = Field(
        default=DEFAULT_WINDOW_CLEAR_THINKING,
        validation_alias="LLM_AGENT_WINDOW_CLEAR_THINKING",
    )

    @field_validator(
        "main_reasoning_effort",
        "main_reasoning_format",
        "main_clear_thinking",
        "sanitize_provider",
        "sanitize_model",
        "sanitize_reasoning_effort",
        "window_provider",
        "window_model",
        "window_reasoning_effort",
        "window_reasoning_format",
        "window_clear_thinking",
        mode="before",
    )
    @classmethod
    def _empty_str_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    def provider(self, agent: LlmAgentName) -> str:
        if agent == "main":
            return self.main_provider
        if agent == "sanitize":
            return self.sanitize_provider or self.main_provider
        if agent == "window":
            return self.window_provider or self.main_provider
        raise ValueError(f"Unsupported LLM agent: {agent}")

    def model(self, agent: LlmAgentName) -> str:
        if agent == "main":
            return self.main_model
        if agent == "sanitize":
            return self.sanitize_model or self.main_model
        if agent == "window":
            return self.window_model or self.main_model
        raise ValueError(f"Unsupported LLM agent: {agent}")

    def reasoning_effort(self, agent: LlmAgentName) -> LlmReasoningEffort | None:
        if agent == "main":
            return self.main_reasoning_effort
        if agent == "sanitize":
            return self.sanitize_reasoning_effort
        if agent == "window":
            return self.window_reasoning_effort
        raise ValueError(f"Unsupported LLM agent: {agent}")

    def reasoning_format(self, agent: LlmAgentName) -> LlmReasoningFormat | None:
        if agent == "main":
            return self.main_reasoning_format
        if agent == "sanitize":
            return None
        if agent == "window":
            return self.window_reasoning_format
        raise ValueError(f"Unsupported LLM agent: {agent}")

    def clear_thinking(self, agent: LlmAgentName) -> bool | None:
        if agent == "main":
            return self.main_clear_thinking
        if agent == "sanitize":
            return None
        if agent == "window":
            return self.window_clear_thinking
        raise ValueError(f"Unsupported LLM agent: {agent}")


class LlmRequestSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    timeout_ms: int = Field(default=DEFAULT_TIMEOUT_MS, gt=0, validation_alias="LLM_REQUEST_TIMEOUT_MS")
    max_retries: int = Field(default=DEFAULT_MAX_RETRIES, ge=0, validation_alias="LLM_REQUEST_MAX_RETRIES")
    max_tokens: int | None = Field(default=None, gt=0, validation_alias="LLM_RESPONSE_MAX_TOKENS")

    @field_validator("max_tokens", mode="before")
    @classmethod
    def _empty_str_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value


class LlmProviderSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    openai_api_key: SecretStr | None = Field(default=None, validation_alias="LLM_PROVIDER_OPENAI_API_KEY")
    openrouter_api_key: SecretStr | None = Field(default=None, validation_alias="LLM_PROVIDER_OPENROUTER_API_KEY")
    cerebras_api_key: SecretStr | None = Field(default=None, validation_alias="LLM_PROVIDER_CEREBRAS_API_KEY")

    openai_base_url: str | None = Field(default=None, validation_alias="LLM_PROVIDER_OPENAI_BASE_URL")

    openrouter_app_title: str = Field(
        default=DEFAULT_OPENROUTER_APP_TITLE,
        validation_alias="LLM_PROVIDER_OPENROUTER_APP_TITLE",
    )
    openrouter_app_url: str | None = Field(default=None, validation_alias="LLM_PROVIDER_OPENROUTER_APP_URL")
    openrouter_base_url: str | None = Field(
        default=DEFAULT_OPENROUTER_BASE_URL,
        validation_alias="LLM_PROVIDER_OPENROUTER_BASE_URL",
    )
    openrouter_provider_order: list[str] = Field(
        default_factory=list,
        validation_alias="LLM_PROVIDER_OPENROUTER_PROVIDER_ORDER",
    )
    openrouter_allow_fallbacks: bool = Field(
        default=True,
        validation_alias="LLM_PROVIDER_OPENROUTER_ALLOW_FALLBACKS",
    )
    openrouter_require_parameters: bool = Field(
        default=False,
        validation_alias="LLM_PROVIDER_OPENROUTER_REQUIRE_PARAMETERS",
    )

    cerebras_base_url: str | None = Field(default=None, validation_alias="LLM_PROVIDER_CEREBRAS_BASE_URL")

    @field_validator(
        "openai_api_key",
        "openrouter_api_key",
        "cerebras_api_key",
        "openai_base_url",
        "openrouter_app_url",
        "openrouter_base_url",
        "cerebras_base_url",
        mode="before",
    )
    @classmethod
    def _empty_str_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("openrouter_provider_order", mode="before")
    @classmethod
    def _empty_order_to_list(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return []
        return value


class LlmSettings:
    def __init__(
        self,
        *,
        agents: LlmAgentSettings | None = None,
        request: LlmRequestSettings | None = None,
        providers: LlmProviderSettings | None = None,
    ) -> None:
        self.agents = agents or LlmAgentSettings()
        self.request = request or LlmRequestSettings()
        self.providers = providers or LlmProviderSettings()

    def agent_provider(self, agent: LlmAgentName) -> str:
        return self.agents.provider(agent)

    def agent_model(self, agent: LlmAgentName) -> str:
        return self.agents.model(agent)

    def agent_reasoning_effort(self, agent: LlmAgentName) -> LlmReasoningEffort | None:
        return self.agents.reasoning_effort(agent)

    def agent_reasoning_format(self, agent: LlmAgentName) -> LlmReasoningFormat | None:
        return self.agents.reasoning_format(agent)

    def agent_clear_thinking(self, agent: LlmAgentName) -> bool | None:
        return self.agents.clear_thinking(agent)
