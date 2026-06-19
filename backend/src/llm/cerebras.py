from __future__ import annotations

from typing import Any

from langchain_cerebras import ChatCerebras

from settings import LlmProviderSettings


def cerebras_configured(provider_settings: LlmProviderSettings) -> bool:
    api_key = provider_settings.cerebras_api_key
    return bool(api_key and api_key.get_secret_value().strip())


def create_chat_cerebras(
    *,
    provider_settings: LlmProviderSettings,
    model: str,
    temperature: float,
    timeout_ms: int,
    max_retries: int,
    max_tokens: int | None,
    reasoning_effort: str | None,
) -> ChatCerebras:
    if not cerebras_configured(provider_settings):
        raise RuntimeError("CEREBRAS_API_KEY is not set.")

    kwargs: dict[str, Any] = {
        "model": model,
        "api_key": provider_settings.cerebras_api_key,
        "base_url": provider_settings.cerebras_base_url,
        "temperature": temperature,
        "timeout": timeout_ms / 1000,
        "max_retries": max_retries,
        "streaming": True,
    }
    if max_tokens is not None:
        kwargs["max_tokens"] = max_tokens
    if reasoning_effort in {"low", "medium", "high"}:
        kwargs["reasoning_effort"] = reasoning_effort

    return ChatCerebras(**kwargs)
