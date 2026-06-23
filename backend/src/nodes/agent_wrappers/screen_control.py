from __future__ import annotations

import json
from typing import Any

from langgraph.config import get_stream_writer

from graph.state import ChatTurnState
from nodes.agent_wrappers.utils import final_message_text, invoke_agent


def create_screen_control_agent_node(screen_control_agent: Any) -> Any:
    async def invoke_screen_control_agent(state: ChatTurnState) -> dict[str, Any]:
        final_response = str(state.get("final_response") or "").strip()
        if not final_response:
            final_response = final_message_text(state)

        instruction = _screen_control_instruction(state, final_response)
        _emit_screen_control_input(state, instruction)
        result = await invoke_agent(
            screen_control_agent,
            {
                "messages": [
                    {
                        "role": "user",
                        "content": instruction,
                    }
                ]
            },
        )
        if isinstance(result, dict):
            _emit_screen_control_final(state, final_message_text(result))
        return {}

    return invoke_screen_control_agent


def _screen_control_instruction(state: ChatTurnState, final_response: str) -> str:
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


def _emit_screen_control_input(state: ChatTurnState, text: str) -> None:
    _writer()(
        {
            "type": "screen_control.input",
            "source_agent": "screen_control_agent",
            "node": "screen_control_agent",
            "text": text,
            "session_id": state.get("session_id"),
            "turn_id": state.get("turn_id"),
        }
    )


def _emit_screen_control_final(state: ChatTurnState, text: str) -> None:
    if not text:
        return

    _writer()(
        {
            "type": "agent.text.final",
            "source_agent": "screen_control_agent",
            "node": "screen_control_agent",
            "text": text,
            "session_id": state.get("session_id"),
            "turn_id": state.get("turn_id"),
        }
    )


def _writer() -> Any:
    try:
        return get_stream_writer()
    except RuntimeError:
        return lambda _: None
