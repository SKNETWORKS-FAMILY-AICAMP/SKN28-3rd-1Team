from __future__ import annotations

import json
from typing import Any

from langgraph.config import get_stream_writer

from graph.state import ChatTurnState
from logger import get_logger
from nodes.agent_wrappers.utils import final_message_text, invoke_agent

logger = get_logger(__name__)


def create_screen_control_agent_node(screen_control_agent: Any) -> Any:
    async def invoke_screen_control_agent(state: ChatTurnState) -> dict[str, Any]:
        final_response = str(state.get("final_response") or "").strip()
        if not final_response:
            final_response = final_message_text(state)

        instruction = _screen_control_instruction(state, final_response)
        logger.debug(
            "screen control agent input prepared",
            extra={
                "event": "screen_control_agent.input_prepared",
                "conversation_id": state.get("session_id"),
                "turn_id": state.get("turn_id"),
                "agent": "screen_control_agent",
                "final_response_chars": len(final_response),
                "instruction_chars": len(instruction),
                "application_state": _application_state_summary(
                    state.get("application_state")
                ),
                "user_input_state": _state_key_summary(state.get("user_input_state")),
                "instruction_text": instruction,
                "final_response_text": final_response,
                "application_state_payload": state.get("application_state") or {},
                "user_input_state_payload": state.get("user_input_state") or {},
            },
        )
        _emit_screen_control_input(state, instruction)
        logger.debug(
            "screen control agent invocation started",
            extra={
                "event": "screen_control_agent.invocation.started",
                "conversation_id": state.get("session_id"),
                "turn_id": state.get("turn_id"),
                "agent": "screen_control_agent",
            },
        )

        try:
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
        except Exception:
            logger.exception(
                "screen control agent invocation failed",
                extra={
                    "event": "screen_control_agent.invocation.failed",
                    "conversation_id": state.get("session_id"),
                    "turn_id": state.get("turn_id"),
                    "agent": "screen_control_agent",
                },
            )
            raise

        if isinstance(result, dict):
            final_text = final_message_text(result)
            logger.debug(
                "screen control agent invocation completed",
                extra={
                    "event": "screen_control_agent.invocation.completed",
                    "conversation_id": state.get("session_id"),
                    "turn_id": state.get("turn_id"),
                    "agent": "screen_control_agent",
                    "output_keys": sorted(str(key) for key in result.keys()),
                    "message_count": len(result.get("messages") or []),
                    "final_text_chars": len(final_text),
                },
            )
            _emit_screen_control_final(state, final_text)
        else:
            logger.debug(
                "screen control agent invocation completed",
                extra={
                    "event": "screen_control_agent.invocation.completed",
                    "conversation_id": state.get("session_id"),
                    "turn_id": state.get("turn_id"),
                    "agent": "screen_control_agent",
                    "output_type": type(result).__name__,
                },
            )
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


def _state_key_summary(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {"present": False, "key_count": 0, "keys": []}

    keys = sorted(str(key) for key in value.keys())
    return {
        "present": bool(value),
        "key_count": len(keys),
        "keys": keys,
    }


def _application_state_summary(value: Any) -> dict[str, Any]:
    summary = _state_key_summary(value)
    if not isinstance(value, dict):
        return summary

    surface = value.get("surface")
    if isinstance(surface, dict):
        summary["surface_type"] = surface.get("type")
        summary["surface_view"] = surface.get("view")
        summary["selected_institution_id"] = surface.get("selectedInstitutionId")
        summary["selected_document_id"] = surface.get("selectedDocumentId")
        summary["institution_count"] = surface.get("institutionCount")
        summary["document_count"] = surface.get("documentCount")
        summary["checklist_item_count"] = surface.get("checklistItemCount")
        summary["field_count"] = surface.get("fieldCount")

    return summary
