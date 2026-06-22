from __future__ import annotations

from pathlib import Path
from typing import Any

from langchain.agents import create_agent
from langchain.agents.middleware import ModelRequest, dynamic_prompt

from llm import get_window
from logger import get_logger
from tools import SCREEN_CONTROL_AGENT_PROFILE, get_tools
from utils import application_state, render_prompt, state_json, user_input_state

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
        middleware=[_screen_control_prompt(render_prompt(_SYSTEM_PROMPT_TEMPLATE))],
        state_schema=ChatTurnState,
    )
    logger.info("created screen control agent")
    return _SCREEN_CONTROL_AGENT


def clear_screen_control_agent_cache() -> None:
    global _SCREEN_CONTROL_AGENT
    _SCREEN_CONTROL_AGENT = None


def _screen_control_prompt(base_prompt: str) -> Any:
    @dynamic_prompt
    def screen_control_system_prompt(request: ModelRequest) -> str:
        state = request.state
        return "\n\n".join(
            [
                base_prompt,
                "업스트림 main agent output(read-only):",
                f"final_response:\n{state.get('final_response', '')}",
                f"used_information:\n{state_json(state.get('used_information', []))}",
                "현재 입력/화면 상태(read-only):",
                f"사용자 입력 상태:\n{state_json(user_input_state(state))}",
                f"현재 애플리케이션 상태:\n{state_json(application_state(state))}",
            ]
        )

    return screen_control_system_prompt
