from __future__ import annotations
from functools import lru_cache
from langchain_openai import ChatOpenAI
from settings import settings

def _openrouter_headers() -> dict[str, str]:
    headers = {
        "X-Title" : settings.openrouter_app_title,
    }

    if settings.openrouter_app_url:
        headers["HTTP-Referer"] = settings.openrouter_app_url

    return headers

@lru_cache
def get_chat_llm() -> ChatOpenAI:
    if settings.openrouter_api_key is None:
        raise RuntimeError("BACKEND_OPENROUTER_API_KEY is not set.")

    return ChatOpenAI(
        model=settings.openrouter_model,
          api_key=settings.openrouter_api_key,
          base_url=settings.openrouter_base_url,
          temperature=settings.llm_temperature,
          timeout=settings.llm_timeout_ms / 1000,
          max_retries=settings.llm_max_retries,
          reasoning_effort=settings.llm_reasoning_effort,
          default_headers=_openrouter_headers(),
    )
