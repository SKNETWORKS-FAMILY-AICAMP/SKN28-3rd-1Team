from __future__ import annotations

from typing import Any, NotRequired

from langchain.agents import AgentState


class ChatTurnState(AgentState):
    session_id: str | None
    turn_id: str

    # Transport compatibility only. Graph nodes must split concrete state below
    # instead of passing this generic blob through agent prompts.
    metadata: NotRequired[dict[str, Any]]

    # Read-only user/application state. Main agent may use this to answer, but
    # it does not receive UI control tools.
    user_input_state: NotRequired[dict[str, Any]]
    application_state: NotRequired[dict[str, Any]]

    # Main agent output consumed by downstream agents.
    final_response: NotRequired[str]
    used_information: NotRequired[list[dict[str, Any]]]

    # Speech path output.
    final_response_script: NotRequired[str]
    tts_configured: NotRequired[bool]
