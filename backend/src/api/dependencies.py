from __future__ import annotations

from functools import lru_cache

from graph import ChatGraphRunner


@lru_cache
def get_chat_graph_runner() -> ChatGraphRunner:
    return ChatGraphRunner()
