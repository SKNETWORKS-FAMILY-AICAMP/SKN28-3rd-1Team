from __future__ import annotations

from typing import Any

from langchain_openrouter import ChatOpenRouter

from settings import LlmProviderSettings


def openrouter_configured(provider_settings: LlmProviderSettings) -> bool:
    api_key = provider_settings.openrouter_api_key
    return bool(api_key and api_key.get_secret_value().strip())


def create_chat_openrouter(
    *,
    provider_settings: LlmProviderSettings,
    model: str,
    timeout_ms: int,
    max_retries: int,
    max_tokens: int | None,
) -> ChatOpenRouter:
    if not openrouter_configured(provider_settings):
        raise RuntimeError("LLM_PROVIDER_OPENROUTER_API_KEY is not set.")

    kwargs: dict[str, Any] = {
        "model": model,
        "api_key": provider_settings.openrouter_api_key,
        "app_title": provider_settings.openrouter_app_title,
        "app_url": provider_settings.openrouter_app_url,
        "timeout": timeout_ms,
        "max_retries": max_retries,
        "streaming": True,
        "openrouter_provider": _provider_routing(provider_settings),
    }
    if provider_settings.openrouter_base_url is not None:
        kwargs["base_url"] = provider_settings.openrouter_base_url
    if max_tokens is not None:
        kwargs["max_tokens"] = max_tokens

    return ChatOpenRouter(**kwargs)


def _provider_routing(provider_settings: LlmProviderSettings) -> dict[str, Any]:
    provider: dict[str, Any] = {
        "allow_fallbacks": provider_settings.openrouter_allow_fallbacks,
    }

    if provider_settings.openrouter_provider_order:
        provider["order"] = provider_settings.openrouter_provider_order

    if provider_settings.openrouter_require_parameters:
        provider["require_parameters"] = True

    return provider
