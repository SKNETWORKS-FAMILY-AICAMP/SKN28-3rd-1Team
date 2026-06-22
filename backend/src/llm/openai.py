from __future__ import annotations

from typing import Any

from langchain_openai import ChatOpenAI

from settings import LlmProviderSettings


def openai_configured(provider_settings: LlmProviderSettings) -> bool:
    api_key = provider_settings.openai_api_key
    return bool(api_key and api_key.get_secret_value().strip())


def create_chat_openai(
    *,
    provider_settings: LlmProviderSettings,
    model: str,
    timeout_ms: int,
    max_retries: int,
    max_tokens: int | None,
) -> ChatOpenAI:
    if not openai_configured(provider_settings):
        raise RuntimeError("LLM_PROVIDER_OPENAI_API_KEY is not set.")

    kwargs: dict[str, Any] = {
        "model": model,
        "api_key": provider_settings.openai_api_key,
        "timeout": timeout_ms / 1000,
        "max_retries": max_retries,
        "streaming": True,
    }
    if provider_settings.openai_base_url is not None:
        kwargs["base_url"] = provider_settings.openai_base_url
    if max_tokens is not None:
        kwargs["max_completion_tokens"] = max_tokens

    return ChatOpenAI(**kwargs)
