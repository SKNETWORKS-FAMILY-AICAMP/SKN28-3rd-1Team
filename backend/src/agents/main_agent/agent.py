from __future__ import annotations

from pathlib import Path
from typing import Any

from langchain.agents import create_agent

from llm import get_main
from logger import get_logger
from memory import get_checkpointer
from tools import MAIN_AGENT_PROFILE, get_tools
from utils import render_prompt

logger = get_logger(__name__)
_SYSTEM_PROMPT_TEMPLATE = Path(__file__).with_name("system_prompt.j2")

_MAIN_AGENT: Any | None = None


async def create_main_agent() -> Any:
    global _MAIN_AGENT
    if _MAIN_AGENT is not None:
        return _MAIN_AGENT

    from graph.state import ChatTurnState

    _MAIN_AGENT = create_agent(
        model=get_main(),
        tools=await get_tools(agent_name=MAIN_AGENT_PROFILE),
        system_prompt=render_prompt(_SYSTEM_PROMPT_TEMPLATE),
        state_schema=ChatTurnState,
        checkpointer=get_checkpointer(),
    )
    return _MAIN_AGENT


def clear_main_agent_cache() -> None:
    global _MAIN_AGENT
    _MAIN_AGENT = None
