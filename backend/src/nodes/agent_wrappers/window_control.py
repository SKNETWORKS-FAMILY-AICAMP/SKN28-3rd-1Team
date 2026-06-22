from __future__ import annotations

import json
from typing import Any

from graph.state import ChatTurnState
from nodes.agent_wrappers.utils import final_message_text, invoke_agent


def create_window_control_agent_node(window_changing_agent: Any) -> Any:
    async def invoke_window_changing_agent(state: ChatTurnState) -> dict[str, Any]:
        final_response = str(state.get("final_response") or "").strip()
        if not final_response:
            final_response = final_message_text(state)

        await invoke_agent(
            window_changing_agent,
            {
                "messages": [
                    {
                        "role": "user",
                        "content": _window_control_instruction(state, final_response),
                    }
                ]
            },
        )
        return {}

    return invoke_window_changing_agent


def _window_control_instruction(state: ChatTurnState, final_response: str) -> str:
    payload = {
        "final_response": final_response,
        "user_input_state": state.get("user_input_state") or {},
        "application_state": state.get("application_state") or {},
    }
    return (
        "아래 JSON은 이번 턴의 main agent 답변과 현재 UI 상태입니다. "
        "화면 제어가 필요하면 제공된 tool만 호출하고, 최종 상담 답변은 작성하지 마세요.\n\n"
        f"{json.dumps(payload, ensure_ascii=False, default=str)}"
    )
