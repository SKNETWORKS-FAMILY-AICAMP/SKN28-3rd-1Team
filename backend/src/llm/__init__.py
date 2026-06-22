from __future__ import annotations

from functools import lru_cache

from langchain_core.language_models.chat_models import BaseChatModel

from llm.factory import create_agent_llm
from logger import get_logger

logger = get_logger(__name__)


@lru_cache
def get_main() -> BaseChatModel:
    return create_agent_llm("main")


@lru_cache
def get_sanitize() -> BaseChatModel | None:
    try:
        # This optional LLM is cached as the availability boundary for speech
        # text sanitization. Unavailable providers resolve to None here, so
        # callers do not need to know provider/config details.
        return create_agent_llm("sanitize")
    except RuntimeError as error:
        logger.warning(
            "sanitize LLM unavailable; speech text sanitization disabled",
            extra={
                "event": "llm.unavailable",
                "agent": "sanitize",
                "error_type": type(error).__name__,
                "reason": str(error),
            },
        )
        return None


@lru_cache
def get_window() -> BaseChatModel:
    return create_agent_llm("window")


def is_sanitizable() -> bool:
    return get_sanitize() is not None


def clear_llm_cache() -> None:
    get_main.cache_clear()
    get_sanitize.cache_clear()
    get_window.cache_clear()


__all__ = [
    "clear_llm_cache",
    "get_main",
    "get_sanitize",
    "get_window",
    "is_sanitizable",
]
