from __future__ import annotations

from pathlib import Path
from typing import Any

from langchain.agents import create_agent

from llm import get_sanitize
from logger import get_logger
from utils import render_prompt

logger = get_logger(__name__)
_SYSTEM_PROMPT_TEMPLATE = Path(__file__).with_name("speech_text_prompt.j2")


async def create_speech_text_agent() -> Any:
    from graph.state import ChatTurnState

    agent = create_agent(
        model=get_sanitize(),
        tools=[],
        system_prompt=render_prompt(_SYSTEM_PROMPT_TEMPLATE),
        state_schema=ChatTurnState,
    )
    logger.debug(
        "created speech text agent",
        extra={
            "event": "agent.created",
            "agent": "speech_text_agent",
        },
    )
    return agent
