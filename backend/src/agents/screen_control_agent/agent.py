from __future__ import annotations

from pathlib import Path
from typing import Any

from langchain.agents import create_agent

from llm import get_window
from logger import get_logger
from tools import SCREEN_CONTROL_AGENT_PROFILE, get_tools
from utils import render_prompt

logger = get_logger(__name__)
_SYSTEM_PROMPT_TEMPLATE = Path(__file__).with_name("system_prompt.j2")

_SCREEN_CONTROL_AGENT: Any | None = None


async def create_screen_control_agent() -> Any:
    global _SCREEN_CONTROL_AGENT
    if _SCREEN_CONTROL_AGENT is not None:
        return _SCREEN_CONTROL_AGENT

    from graph.state import ChatTurnState

    _SCREEN_CONTROL_AGENT = create_agent(
        model=get_window(),
        tools=await get_tools(agent_name=SCREEN_CONTROL_AGENT_PROFILE),
        system_prompt=render_prompt(_SYSTEM_PROMPT_TEMPLATE),
        state_schema=ChatTurnState,
    )
    logger.info("created screen control agent")
    return _SCREEN_CONTROL_AGENT


def clear_screen_control_agent_cache() -> None:
    global _SCREEN_CONTROL_AGENT
    _SCREEN_CONTROL_AGENT = None
