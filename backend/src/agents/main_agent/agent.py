from __future__ import annotations

from pathlib import Path
from typing import Any

from langchain.agents import create_agent
from langchain.agents.middleware import ModelRequest, dynamic_prompt
from langgraph.checkpoint.memory import InMemorySaver

from llm import get_chat_llm
from logger import get_logger
from tools import MAIN_AGENT_PROFILE, get_tools
from utils import application_state, render_prompt, state_json, user_input_state

logger = get_logger(__name__)
_SYSTEM_PROMPT_TEMPLATE = Path(__file__).with_name("system_prompt.j2")

_MAIN_AGENT: Any | None = None


async def create_main_agent() -> Any:
    global _MAIN_AGENT
    if _MAIN_AGENT is not None:
        return _MAIN_AGENT

    from graph.state import ChatTurnState

    _MAIN_AGENT = create_agent(
        model=get_chat_llm(),
        tools=await get_tools(agent_name=MAIN_AGENT_PROFILE),
        middleware=[_main_agent_prompt(render_prompt(_SYSTEM_PROMPT_TEMPLATE))],
        state_schema=ChatTurnState,
        checkpointer=InMemorySaver(),
    )
    return _MAIN_AGENT


def clear_main_agent_cache() -> None:
    global _MAIN_AGENT
    _MAIN_AGENT = None


def _main_agent_prompt(base_prompt: str) -> Any:
    @dynamic_prompt
    def main_agent_system_prompt(request: ModelRequest) -> str:
        user_state = user_input_state(request.state)
        app_state = application_state(request.state)
        if not user_state and not app_state:
            return base_prompt

        return "\n\n".join(
            [
                base_prompt,
                "추가 입력 컨텍스트(read-only):",
                f"사용자 입력 상태:\n{state_json(user_state)}",
                f"현재 애플리케이션 상태:\n{state_json(app_state)}",
            ]
        )

    return main_agent_system_prompt
