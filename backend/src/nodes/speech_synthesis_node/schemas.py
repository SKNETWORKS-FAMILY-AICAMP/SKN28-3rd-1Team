from __future__ import annotations

from pydantic import BaseModel


class SpeechSynthesisRequest(BaseModel):
    session_id: str
    turn_id: str
    text: str
