from __future__ import annotations

import unittest
from typing import Any
from unittest.mock import patch

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from graph.state import ChatTurnState
from nodes.agent_wrappers import (
    create_screen_control_agent_node,
    create_speech_text_agent_node,
)


class FakeAgent:
    def __init__(
        self,
        output: dict[str, Any] | None = None,
        error: Exception | None = None,
    ) -> None:
        self.inputs: list[dict[str, Any]] = []
        self._output = output or {"messages": [AIMessage(content="child output")]}
        self._error = error

    async def ainvoke(self, payload: dict[str, Any]) -> dict[str, Any]:
        self.inputs.append(payload)
        if self._error is not None:
            raise self._error
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

    async def test_speech_text_wrapper_emits_input_trace(self) -> None:
        agent = FakeAgent({"messages": [AIMessage(content="spoken answer")]})
        node = create_speech_text_agent_node(agent)
        state: ChatTurnState = {
            "session_id": "conversation-1",
            "turn_id": "turn-1",
            "messages": [{"role": "user", "content": "hello"}],
            "final_response": "written answer",
        }
        emitted: list[dict[str, Any]] = []

        with patch("nodes.agent_wrappers.speech_text.get_stream_writer", return_value=emitted.append):
            result = await node(state)

        self.assertEqual(result, {"final_response_script": "spoken answer"})
        self.assertEqual(
            emitted,
            [
                {
                    "type": "speech_text.input",
                    "source_agent": "speech_text_agent",
                    "node": "speech_text_agent",
                    "text": "written answer",
                    "session_id": "conversation-1",
                    "turn_id": "turn-1",
                }
            ],
        )

    async def test_screen_control_wrapper_does_not_return_parent_state_keys(self) -> None:
        agent = FakeAgent()
        node = create_screen_control_agent_node(agent)
        state: ChatTurnState = {
            "session_id": "conversation-1",
            "turn_id": "turn-1",
            "messages": [
                HumanMessage(content="이전 질문"),
                ToolMessage(
                    content='{"results":[{"title":"이전 근거"}]}',
                    name="web.search",
                    tool_call_id="old-tool",
                ),
                HumanMessage(content="hello"),
                ToolMessage(
                    content='{"results":[{"title":"기관 방문 전 전화 확인 필요"}]}',
                    name="web.search",
                    tool_call_id="tool-1",
                ),
                AIMessage(content="answer"),
            ],
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
        self.assertIn("message_turns", content)
        self.assertIn("기관 방문 전 전화 확인 필요", content)
        self.assertNotIn("이전 근거", content)

    async def test_screen_control_wrapper_emits_final_text_without_parent_state_keys(self) -> None:
        agent = FakeAgent({"messages": [AIMessage(content="screen final debug text")]})
        node = create_screen_control_agent_node(agent)
        state: ChatTurnState = {
            "session_id": "conversation-1",
            "turn_id": "turn-1",
            "messages": [{"role": "user", "content": "hello"}],
            "final_response": "answer",
        }
        emitted: list[dict[str, Any]] = []

        with patch("nodes.agent_wrappers.screen_control.get_stream_writer", return_value=emitted.append):
            result = await node(state)

        self.assertEqual(result, {})
        self.assertEqual(emitted[0]["type"], "screen_control.input")
        self.assertEqual(emitted[0]["source_agent"], "screen_control_agent")
        self.assertIn("answer", emitted[0]["text"])
        self.assertEqual(
            emitted[1:],
            [
                {
                    "type": "agent.text.final",
                    "source_agent": "screen_control_agent",
                    "node": "screen_control_agent",
                    "text": "screen final debug text",
                    "session_id": "conversation-1",
                    "turn_id": "turn-1",
                }
            ],
        )

    async def test_screen_control_wrapper_suppresses_auxiliary_agent_failure(self) -> None:
        agent = FakeAgent(error=RuntimeError("provider failed"))
        node = create_screen_control_agent_node(agent)
        state: ChatTurnState = {
            "session_id": "conversation-1",
            "turn_id": "turn-1",
            "messages": [{"role": "user", "content": "hello"}],
            "final_response": "answer",
        }
        emitted: list[dict[str, Any]] = []

        with (
            patch(
                "nodes.agent_wrappers.screen_control.get_stream_writer",
                return_value=emitted.append,
            ),
            patch("nodes.agent_wrappers.screen_control.logger.exception") as log_exception,
        ):
            result = await node(state)

        self.assertEqual(result, {})
        self.assertEqual(len(agent.inputs), 1)
        self.assertEqual(len(emitted), 1)
        self.assertEqual(emitted[0]["type"], "screen_control.input")
        log_exception.assert_called_once()


if __name__ == "__main__":
    unittest.main()
