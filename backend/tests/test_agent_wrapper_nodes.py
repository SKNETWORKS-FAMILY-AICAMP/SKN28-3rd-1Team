from __future__ import annotations

import unittest
from typing import Any

from langchain_core.messages import AIMessage

from graph.state import ChatTurnState
from nodes.agent_wrappers import (
    create_screen_control_agent_node,
    create_speech_text_agent_node,
)


class FakeAgent:
    def __init__(self, output: dict[str, Any] | None = None) -> None:
        self.inputs: list[dict[str, Any]] = []
        self._output = output or {"messages": [AIMessage(content="child output")]}

    async def ainvoke(self, payload: dict[str, Any]) -> dict[str, Any]:
        self.inputs.append(payload)
        return self._output


class AgentWrapperNodeTest(unittest.IsolatedAsyncioTestCase):
    async def test_speech_text_wrapper_returns_only_script_key(self) -> None:
        agent = FakeAgent({"messages": [AIMessage(content="spoken answer")]})
        node = create_speech_text_agent_node(agent)
        state: ChatTurnState = {
            "session_id": "conversation-1",
            "turn_id": "turn-1",
            "messages": [{"role": "user", "content": "hello"}],
            "final_response": "written answer",
        }

        result = await node(state)

        self.assertEqual(result, {"final_response_script": "spoken answer"})
        self.assertEqual(agent.inputs[0]["messages"][0]["role"], "assistant")
        self.assertEqual(agent.inputs[0]["messages"][0]["content"], "written answer")
        self.assertNotIn("messages", result)
        self.assertNotIn("session_id", result)
        self.assertNotIn("turn_id", result)

    async def test_screen_control_wrapper_does_not_return_parent_state_keys(self) -> None:
        agent = FakeAgent()
        node = create_screen_control_agent_node(agent)
        state: ChatTurnState = {
            "session_id": "conversation-1",
            "turn_id": "turn-1",
            "messages": [{"role": "user", "content": "hello"}],
            "final_response": "answer",
            "application_state": {"route": "/chat_page"},
            "user_input_state": {"conversation_id": "conversation-1"},
        }

        result = await node(state)

        self.assertEqual(result, {})
        self.assertEqual(len(agent.inputs), 1)
        content = agent.inputs[0]["messages"][0]["content"]
        self.assertIn("answer", content)
        self.assertIn("/chat_page", content)


if __name__ == "__main__":
    unittest.main()
