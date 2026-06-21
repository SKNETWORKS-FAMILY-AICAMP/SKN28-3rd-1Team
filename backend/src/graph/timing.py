from __future__ import annotations

import json
from time import perf_counter
from typing import Any

from logger import get_logger

logger = get_logger(__name__)


def new_timer() -> float:
    return perf_counter()


def elapsed_ms(started_at: float) -> int:
    return round((perf_counter() - started_at) * 1000)


def log_chat_timing(
    phase: str,
    *,
    started_at: float,
    session_id: str | None,
    turn_id: str | None,
    audio_enabled: bool | None = None,
    **extra: Any,
) -> None:
    payload: dict[str, Any] = {
        "event": "chat_timing",
        "phase": phase,
        "elapsed_ms": elapsed_ms(started_at),
        "session_id": session_id,
        "turn_id": turn_id,
    }
    if audio_enabled is not None:
        payload["audio_enabled"] = audio_enabled
    payload.update({key: value for key, value in extra.items() if value is not None})

    logger.info("chat_timing %s", json.dumps(payload, ensure_ascii=False, default=str))
