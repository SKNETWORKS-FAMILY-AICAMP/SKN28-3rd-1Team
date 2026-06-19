from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from langchain.agents import create_agent
from langgraph.checkpoint.memory import InMemorySaver

from llm import get_chat_llm
from logger import get_logger
from tools import MAIN_AGENT_PROFILE, get_tools
from utils import render_prompt

logger = get_logger(__name__)
_SYSTEM_PROMPT_TEMPLATE = Path(__file__).with_name("system_prompt.j2")

_MAIN_AGENT: Any | None = None
_MAIN_AGENT_LOCK: asyncio.Lock | None = None


def _main_agent_lock() -> asyncio.Lock:
    global _MAIN_AGENT_LOCK
    if _MAIN_AGENT_LOCK is None:
        _MAIN_AGENT_LOCK = asyncio.Lock()
    return _MAIN_AGENT_LOCK


async def create_main_agent() -> Any:
    global _MAIN_AGENT
    if _MAIN_AGENT is not None:
        return _MAIN_AGENT

    async with _main_agent_lock():
        if _MAIN_AGENT is not None:
            return _MAIN_AGENT

        _MAIN_AGENT = create_agent(
            model=get_chat_llm(),
            tools=await get_tools(agent_name=MAIN_AGENT_PROFILE),
            system_prompt=render_prompt(_SYSTEM_PROMPT_TEMPLATE),
            checkpointer=InMemorySaver(),
        )
        return _MAIN_AGENT


def clear_main_agent_cache() -> None:
    global _MAIN_AGENT
    _MAIN_AGENT = None
