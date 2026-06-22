from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ChatStreamRequest(BaseModel):
    session_id: str | None = None
    message: str = Field(..., min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)
