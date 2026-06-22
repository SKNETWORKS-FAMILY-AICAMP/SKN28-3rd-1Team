from __future__ import annotations

from typing import Any

from graph.state import ChatTurnState
from nodes.agent_wrappers.utils import final_message_text, invoke_agent


def create_speech_text_agent_node(speech_text_agent: Any) -> Any:
    async def invoke_speech_text_agent(state: ChatTurnState) -> dict[str, Any]:
        final_response = str(state.get("final_response") or "").strip()
        if not final_response:
            final_response = final_message_text(state)
        if not final_response:
            return {}

        result = await invoke_agent(
            speech_text_agent,
            {
                "messages": [
                    {"role": "assistant", "content": final_response},
                    {
                        "role": "user",
                        "content": "위 assistant response를 음성 합성용 자연어로 변환해 주세요.",
                    },
                ]
            },
        )

        if isinstance(result, dict):
            script = final_message_text(result)
        else:
            script = ""

        return {"final_response_script": (script or final_response).strip()}

    return invoke_speech_text_agent
