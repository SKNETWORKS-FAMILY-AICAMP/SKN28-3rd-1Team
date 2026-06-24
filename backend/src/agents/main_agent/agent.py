from __future__ import annotations

import os

from pathlib import Path
from typing import Any

from langchain.agents import create_agent

from llm import get_main
from logger import get_logger
from tools import MAIN_AGENT_PROFILE, get_tools
from utils import render_prompt

logger = get_logger(__name__)
_SYSTEM_PROMPT_TEMPLATE = Path(__file__).with_name("system_prompt.j2")
_SYSTEM_PROMPT_TEMPLATE_ENV = "MAIN_AGENT_SYSTEM_PROMPT_PATH"


async def create_main_agent() -> Any:
    from graph.state import ChatTurnState

    # Conversation checkpointing belongs to the parent chat-turn graph. Keeping
    # this child agent stateless prevents nested memory boundaries.
    agent = create_agent(
        model=get_main(),
        tools=await get_tools(agent_name=MAIN_AGENT_PROFILE),
        system_prompt=render_prompt(_system_prompt_template()),
        state_schema=ChatTurnState,
    )
    logger.debug(
        "created main agent",
        extra={
            "event": "agent.created",
            "agent": "main_agent",
        },
    )
    return agent


def _system_prompt_template() -> Path:
    override = os.environ.get(_SYSTEM_PROMPT_TEMPLATE_ENV)
    if override:
        return Path(override).expanduser()
    return _SYSTEM_PROMPT_TEMPLATE
