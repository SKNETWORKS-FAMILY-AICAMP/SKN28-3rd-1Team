from __future__ import annotations

from pathlib import Path
from typing import Any

from langchain.agents import create_agent

from llm import get_main
from logger import get_logger
from tools import MAIN_AGENT_PROFILE, get_tools
from utils import render_prompt

logger = get_logger(__name__)
_SYSTEM_PROMPT_TEMPLATE = Path(__file__).with_name("system_prompt.j2")


async def create_main_agent() -> Any:
    from graph.state import ChatTurnState

    # Conversation checkpointing belongs to the parent chat-turn graph. Keeping
    # this child agent stateless prevents nested memory boundaries.
    agent = create_agent(
        model=get_main(),
        tools=await get_tools(agent_name=MAIN_AGENT_PROFILE),
        system_prompt=render_prompt(_SYSTEM_PROMPT_TEMPLATE),
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
