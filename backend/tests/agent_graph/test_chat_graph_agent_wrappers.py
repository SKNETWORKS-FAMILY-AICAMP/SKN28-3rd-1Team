from __future__ import annotations

import unittest
from typing import Any

from langchain_core.messages import AIMessage
from langgraph.checkpoint.memory import InMemorySaver

from graph.graph import build_chat_turn_graph


class FakeAgent:
    def __init__(self, output: dict[str, Any] | None = None) -> None:
        self.inputs: list[dict[str, Any]] = []
        self._output = output or {"messages": [AIMessage(content="child output")]}

    async def ainvoke(self, payload: dict[str, Any]) -> dict[str, Any]:
        self.inputs.append(payload)
        return self._output


class FakeSpeechSynthesisNode:
    async def stream_speech(self, _: Any):
        yield {"type": "tts.completed", "configured": False, "chunks": 0}


class RecordingMainAgent:
    def __init__(self) -> None:
        self.seen_messages: list[list[str]] = []
        self._count = 0

    async def __call__(self, state: dict[str, Any]) -> dict[str, Any]:
        self._count += 1
        self.seen_messages.append([_content(message) for message in state.get("messages", [])])
        return {"messages": [AIMessage(content=f"main answer {self._count}")]}


def _content(message: Any) -> str:
    if isinstance(message, dict):
        return str(message.get("content", ""))
    return str(getattr(message, "content", ""))


class ChatGraphAgentWrapperTest(unittest.IsolatedAsyncioTestCase):
    async def test_wrapped_downstream_agents_do_not_pollute_checkpointed_messages(self) -> None:
        main_agent = RecordingMainAgent()
        speech_agent = FakeAgent({"messages": [AIMessage(content="spoken answer")]})
        window_agent = FakeAgent()
        graph = build_chat_turn_graph(
            main_agent=main_agent,
            speech_text_agent=speech_agent,
            speech_synthesis_node=FakeSpeechSynthesisNode(),
            screen_control_agent=window_agent,
            checkpointer=InMemorySaver(),
        )
        config = {"configurable": {"thread_id": "conversation-1"}}

        first = await graph.ainvoke(
            {
                "session_id": "conversation-1",
                "turn_id": "turn-1",
                "messages": [{"role": "user", "content": "first"}],
            },
            config=config,
        )
        second = await graph.ainvoke(
            {
                "session_id": "conversation-1",
                "turn_id": "turn-2",
                "messages": [{"role": "user", "content": "second"}],
            },
            config=config,
        )

        self.assertEqual(first["final_response_script"], "spoken answer")
        self.assertEqual(second["final_response_script"], "spoken answer")
        self.assertEqual(
            main_agent.seen_messages,
            [
                ["first"],
                ["first", "main answer 1", "second"],
            ],
        )
        self.assertEqual(len(speech_agent.inputs), 2)
        self.assertEqual(len(window_agent.inputs), 2)
        self.assertNotIn("spoken answer", main_agent.seen_messages[1])
        self.assertNotIn("child output", main_agent.seen_messages[1])


if __name__ == "__main__":
    unittest.main()
