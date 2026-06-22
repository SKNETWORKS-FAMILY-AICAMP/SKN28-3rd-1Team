from __future__ import annotations

# LangGraph checkpoint memory lives here so agent construction does not own
# thread persistence or TTL cleanup.

from collections.abc import Callable
from functools import lru_cache
from time import monotonic
from typing import Any

from langgraph.checkpoint.memory import InMemorySaver

from logger import get_logger

logger = get_logger(__name__)

CHAT_THREAD_CONTEXT_TTL_SECONDS = 20 * 60


class ChatThreadContextStore:
    def __init__(
        self,
        *,
        checkpointer: Any | None = None,
        ttl_seconds: int = CHAT_THREAD_CONTEXT_TTL_SECONDS,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        self._checkpointer = checkpointer or InMemorySaver()
        self._ttl_seconds = ttl_seconds
        self._clock = clock
        self._last_seen: dict[str, float] = {}

    @property
    def checkpointer(self) -> Any:
        return self._checkpointer

    @property
    def ttl_seconds(self) -> int:
        return self._ttl_seconds

    def activate(self, conversation_id: str | None) -> str | None:
        if conversation_id is None:
            logger.info("chat thread context ignored: conversation_id is missing")
            return None

        normalized = conversation_id.strip()
        if not normalized:
            logger.info("chat thread context ignored: conversation_id is empty")
            return None

        now = self._clock()
        self.expire_inactive(now=now)
        self._last_seen[normalized] = now
        return normalized

    def expire_inactive(self, *, now: float | None = None) -> list[str]:
        current = self._clock() if now is None else now
        expired = [
            conversation_id
            for conversation_id, last_seen in self._last_seen.items()
            if current - last_seen >= self._ttl_seconds
        ]

        for conversation_id in expired:
            self._last_seen.pop(conversation_id, None)
            self._delete_thread(conversation_id)

        return expired

    def _delete_thread(self, conversation_id: str) -> None:
        delete_thread = getattr(self._checkpointer, "delete_thread", None)
        if not callable(delete_thread):
            logger.warning(
                "chat thread context expired but checkpointer cannot delete thread conversation_id=%s",
                conversation_id,
            )
            return

        delete_thread(conversation_id)
        logger.info("chat thread context expired conversation_id=%s", conversation_id)


@lru_cache
def get_chat_thread_context_store() -> ChatThreadContextStore:
    return ChatThreadContextStore()


def get_checkpointer() -> Any:
    return get_chat_thread_context_store().checkpointer


def clear_chat_thread_context_store_cache() -> None:
    get_chat_thread_context_store.cache_clear()
