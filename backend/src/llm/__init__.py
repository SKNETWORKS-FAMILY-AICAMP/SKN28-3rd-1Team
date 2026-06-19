from __future__ import annotations

from functools import lru_cache

from langchain_core.language_models.chat_models import BaseChatModel

from llm.cerebras import cerebras_configured, create_chat_cerebras
from llm.openrouter import create_chat_openrouter, openrouter_configured
from logger import get_logger
from settings import LlmAgentModelSettings, settings

logger = get_logger(__name__)


def _provider_name(value: str | None) -> str:
    provider = (value or "openrouter").strip().lower().replace("-", "_")
    if provider in {"chatopenrouter", "chat_openrouter", "open_router"}:
        return "openrouter"
    if provider in {"chatcerebras", "chat_cerebras"}:
        return "cerebras"
    return provider


def _reasoning_effort(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    if not normalized or normalized.lower() in {"none", "null", "off", "false"}:
        return None

    return normalized


def _create_chat_model(
    *,
    provider: str,
    model: str,
    temperature: float,
    timeout_ms: int,
    max_retries: int,
    max_tokens: int | None,
    reasoning_effort: str | None,
) -> BaseChatModel:
    provider_settings = settings.llm.providers

    logger.info("creating LLM provider=%s model=%s", provider, model)
    if provider == "openrouter":
        return create_chat_openrouter(
            provider_settings=provider_settings,
            model=model,
            temperature=temperature,
            timeout_ms=timeout_ms,
            max_retries=max_retries,
            max_tokens=max_tokens,
            reasoning_effort=reasoning_effort,
        )
    if provider == "cerebras":
        return create_chat_cerebras(
            provider_settings=provider_settings,
            model=model,
            temperature=temperature,
            timeout_ms=timeout_ms,
            max_retries=max_retries,
            max_tokens=max_tokens,
            reasoning_effort=reasoning_effort,
        )

    raise RuntimeError(f"Unsupported LLM provider: {provider}")


@lru_cache
def get_chat_llm() -> BaseChatModel:
    model_settings = settings.llm.agent_models
    return _create_chat_model(
        provider=_provider_name(model_settings.chat_provider),
        model=model_settings.chat_model,
        temperature=model_settings.chat_temperature,
        timeout_ms=model_settings.chat_timeout_ms,
        max_retries=model_settings.chat_max_retries,
        max_tokens=model_settings.chat_max_tokens,
        reasoning_effort=_reasoning_effort(model_settings.chat_reasoning_effort),
    )


@lru_cache
def get_speech_text_llm() -> BaseChatModel:
    model_settings = settings.llm.agent_models
    return _create_chat_model(
        provider=_speech_text_provider(model_settings),
        model=model_settings.speech_text_model,
        temperature=model_settings.speech_text_temperature,
        timeout_ms=model_settings.speech_text_timeout_ms,
        max_retries=model_settings.speech_text_max_retries,
        max_tokens=model_settings.speech_text_max_tokens,
        reasoning_effort=_reasoning_effort(model_settings.speech_text_reasoning_effort),
    )


def speech_text_llm_configured() -> bool:
    provider = _speech_text_provider(settings.llm.agent_models)
    provider_settings = settings.llm.providers
    if provider == "openrouter":
        return openrouter_configured(provider_settings)
    if provider == "cerebras":
        return cerebras_configured(provider_settings)
    return False


def _speech_text_provider(model_settings: LlmAgentModelSettings) -> str:
    return _provider_name(model_settings.speech_text_provider or model_settings.chat_provider)


def clear_llm_cache() -> None:
    get_chat_llm.cache_clear()
    get_speech_text_llm.cache_clear()


__all__ = [
    "clear_llm_cache",
    "get_chat_llm",
    "get_speech_text_llm",
    "speech_text_llm_configured",
]
