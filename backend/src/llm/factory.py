from __future__ import annotations

from langchain_core.language_models.chat_models import BaseChatModel

from llm.cerebras import cerebras_configured, create_chat_cerebras
from llm.openai import create_chat_openai, openai_configured
from llm.openrouter import create_chat_openrouter, openrouter_configured
from logger import get_logger
from settings import LlmAgentName, settings

logger = get_logger(__name__)


def create_agent_llm(agent: LlmAgentName) -> BaseChatModel:
    llm_settings = settings.llm
    provider = _provider_name(llm_settings.agent_provider(agent))
    model = llm_settings.agent_model(agent)
    request = llm_settings.request
    provider_settings = llm_settings.providers

    logger.info("creating LLM agent=%s provider=%s model=%s", agent, provider, model)
    if provider == "openai":
        return create_chat_openai(
            provider_settings=provider_settings,
            model=model,
            timeout_ms=request.timeout_ms,
            max_retries=request.max_retries,
            max_tokens=request.max_tokens,
        )
    if provider == "openrouter":
        return create_chat_openrouter(
            provider_settings=provider_settings,
            model=model,
            timeout_ms=request.timeout_ms,
            max_retries=request.max_retries,
            max_tokens=request.max_tokens,
        )
    if provider == "cerebras":
        return create_chat_cerebras(
            provider_settings=provider_settings,
            model=model,
            timeout_ms=request.timeout_ms,
            max_retries=request.max_retries,
            max_tokens=request.max_tokens,
        )

    raise RuntimeError(f"Unsupported LLM provider: {provider}")


def agent_llm_configured(agent: LlmAgentName) -> bool:
    provider = _provider_name(settings.llm.agent_provider(agent))
    provider_settings = settings.llm.providers

    if provider == "openai":
        return openai_configured(provider_settings)
    if provider == "openrouter":
        return openrouter_configured(provider_settings)
    if provider == "cerebras":
        return cerebras_configured(provider_settings)
    return False


def _provider_name(value: str | None) -> str:
    provider = (value or "openrouter").strip().lower().replace("-", "_")
    if provider in {"chatopenai", "chat_openai"}:
        return "openai"
    if provider in {"chatopenrouter", "chat_openrouter", "open_router"}:
        return "openrouter"
    if provider in {"chatcerebras", "chat_cerebras"}:
        return "cerebras"
    return provider
