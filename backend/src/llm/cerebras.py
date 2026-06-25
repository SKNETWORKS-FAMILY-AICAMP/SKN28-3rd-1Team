from __future__ import annotations

from typing import Any, Literal

from langchain_cerebras import ChatCerebras

from settings import LlmProviderSettings


def cerebras_configured(provider_settings: LlmProviderSettings) -> bool:
    api_key = provider_settings.cerebras_api_key
    return bool(api_key and api_key.get_secret_value().strip())


def create_chat_cerebras(
    *,
    provider_settings: LlmProviderSettings,
    model: str,
    timeout_ms: int,
    max_retries: int,
    max_tokens: int | None,
    reasoning_effort: Literal["low", "medium", "high"] | None = None,
    reasoning_format: Literal["parsed", "raw", "hidden", "none"] | None = None,
    clear_thinking: bool | None = None,
) -> ChatCerebras:
    if not cerebras_configured(provider_settings):
        raise RuntimeError("LLM_PROVIDER_CEREBRAS_API_KEY is not set.")

    kwargs: dict[str, Any] = {
        "model": model,
        "api_key": provider_settings.cerebras_api_key,
        "timeout": timeout_ms / 1000,
        "max_retries": max_retries,
        "streaming": True,
    }
    if provider_settings.cerebras_base_url is not None:
        kwargs["base_url"] = provider_settings.cerebras_base_url
    if max_tokens is not None:
        kwargs["max_tokens"] = max_tokens
    if reasoning_effort is not None:
        kwargs["reasoning_effort"] = reasoning_effort
    extra_body: dict[str, Any] = {}
    if reasoning_format is not None:
        extra_body["reasoning_format"] = reasoning_format
    if clear_thinking is not None and _supports_clear_thinking(model):
        extra_body["clear_thinking"] = clear_thinking
    if extra_body:
        kwargs["extra_body"] = extra_body

    return ChatCerebras(**kwargs)


def _supports_clear_thinking(model: str) -> bool:
    normalized_model = model.strip().lower()
    return "glm" in normalized_model
