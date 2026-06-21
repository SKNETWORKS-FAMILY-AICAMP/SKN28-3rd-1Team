from __future__ import annotations

from typing import Any

from langchain_openai import ChatOpenAI

from settings import LlmProviderSettings


def openrouter_configured(provider_settings: LlmProviderSettings) -> bool:
    api_key = provider_settings.openrouter_api_key
    return bool(api_key and api_key.get_secret_value().strip())


def create_chat_openrouter(
    *,
    provider_settings: LlmProviderSettings,
    model: str,
    temperature: float,
    timeout_ms: int,
    max_retries: int,
    max_tokens: int | None,
    reasoning_effort: str | None,
) -> ChatOpenAI:
    if not openrouter_configured(provider_settings):
        raise RuntimeError("OPENROUTER_API_KEY is not set.")

    kwargs: dict[str, Any] = {
        "model": model,
        "api_key": provider_settings.openrouter_api_key,
        "base_url": provider_settings.openrouter_base_url,
        "temperature": temperature,
        "timeout": timeout_ms / 1000,
        "max_retries": max_retries,
        "streaming": True,
        "default_headers": _default_headers(provider_settings),
        "extra_body": {"provider": _provider_routing(provider_settings)},
    }
    if max_tokens is not None:
        kwargs["max_completion_tokens"] = max_tokens
    if reasoning_effort:
        kwargs["reasoning"] = {"effort": reasoning_effort}

    return ChatOpenAI(**kwargs)


def _default_headers(provider_settings: LlmProviderSettings) -> dict[str, str]:
    headers = {"X-Title": provider_settings.openrouter_app_title}
    if provider_settings.openrouter_app_url:
        headers["HTTP-Referer"] = provider_settings.openrouter_app_url

    return headers


def _provider_routing(provider_settings: LlmProviderSettings) -> dict[str, Any]:
    provider: dict[str, Any] = {
        "allow_fallbacks": provider_settings.openrouter_allow_fallbacks,
    }

    if provider_settings.openrouter_provider_order:
        provider["order"] = provider_settings.openrouter_provider_order

    if provider_settings.openrouter_require_parameters:
        provider["require_parameters"] = True

    return provider
