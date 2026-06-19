from __future__ import annotations

import asyncio
from pathlib import Path

from langchain_core.language_models.chat_models import BaseChatModel

from llm import get_speech_text_llm, speech_text_llm_configured
from logger import get_logger
from utils import render_prompt

logger = get_logger(__name__)
_PROMPT_TEMPLATE = Path(__file__).with_name("speech_text_prompt.j2")

_SPEECH_TEXT_AGENT: SpeechTextAgent | None = None
_SPEECH_TEXT_AGENT_LOCK: asyncio.Lock | None = None


class SpeechTextAgent:
    def __init__(
        self,
        *,
        system_prompt: str | None = None,
        model: BaseChatModel | None = None,
        configured: bool | None = None,
    ) -> None:
        self.system_prompt = system_prompt or render_prompt(_PROMPT_TEMPLATE)
        self.configured = speech_text_llm_configured() if configured is None else configured
        self.model = model if model is not None else get_speech_text_llm() if self.configured else None


def _speech_text_agent_lock() -> asyncio.Lock:
    global _SPEECH_TEXT_AGENT_LOCK
    if _SPEECH_TEXT_AGENT_LOCK is None:
        _SPEECH_TEXT_AGENT_LOCK = asyncio.Lock()
    return _SPEECH_TEXT_AGENT_LOCK


async def create_speech_text_agent() -> SpeechTextAgent:
    global _SPEECH_TEXT_AGENT
    if _SPEECH_TEXT_AGENT is not None:
        return _SPEECH_TEXT_AGENT

    async with _speech_text_agent_lock():
        if _SPEECH_TEXT_AGENT is not None:
            return _SPEECH_TEXT_AGENT

        _SPEECH_TEXT_AGENT = SpeechTextAgent()
        logger.info(
            "created speech text agent configured=%s model=%s",
            _SPEECH_TEXT_AGENT.configured,
            getattr(_SPEECH_TEXT_AGENT.model, "model_name", None)
            or getattr(_SPEECH_TEXT_AGENT.model, "model", None),
        )
        return _SPEECH_TEXT_AGENT


def clear_speech_text_agent_cache() -> None:
    global _SPEECH_TEXT_AGENT
    _SPEECH_TEXT_AGENT = None
