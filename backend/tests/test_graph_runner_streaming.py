from __future__ import annotations

import unittest
from typing import Any
from unittest.mock import patch

from graph.runner import ChatGraphRunner
from memory import ChatThreadContextStore


class FakeMessage:
    def __init__(
        self,
        *,
        content: Any = None,
        text: str | None = None,
        content_blocks: list[dict[str, Any]] | None = None,
    ) -> None:
        self.content = content
        self.text = text
        self.content_blocks = content_blocks


class FakeGraph:
    def __init__(self, events: list[dict[str, Any]]) -> None:
        self._events = events

    async def astream(self, *_: Any, **__: Any):
        for event in self._events:
            yield event


def message_event(
    node_name: str,
    message: FakeMessage,
) -> dict[str, Any]:
    return {
        "type": "messages",
        "ns": (f"{node_name}:run-id",),
        "data": (message, {"langgraph_node": node_name}),
    }


class ChatGraphRunnerStreamingTest(unittest.IsolatedAsyncioTestCase):
    async def test_main_agent_text_still_streams_as_public_delta(self) -> None:
        runner = ChatGraphRunner(thread_context=ChatThreadContextStore())
        runner._graph = FakeGraph(
            [
                message_event(
                    "main_agent",
                    FakeMessage(content=[{"type": "text", "text": "public token"}]),
                )
            ]
        )

        events = [
            event
            async for event in runner.run_stream("hello", session_id="conversation-1")
        ]

        self.assertEqual(events, [{"type": "delta", "content": "public token"}])

    async def test_speech_text_agent_text_streams_as_internal_delta_and_debug_log(self) -> None:
        runner = ChatGraphRunner(thread_context=ChatThreadContextStore())
        runner._graph = FakeGraph(
            [
                message_event(
                    "speech_text_agent",
                    FakeMessage(content=[{"type": "text", "text": "simplified token"}]),
                )
            ]
        )

        with patch("graph.runner.logger.debug") as debug:
            events = [
                event
                async for event in runner.run_stream("hello", session_id="conversation-1")
            ]

        self.assertEqual(
            events,
            [
                {
                    "type": "internal_delta",
                    "agent": "speech_text_agent",
                    "kind": "text",
                    "content": "simplified token",
                }
            ],
        )
        internal_logs = [
            call
            for call in debug.call_args_list
            if call.kwargs.get("extra", {}).get("event") == "agent.internal_stream_token"
        ]
        self.assertEqual(len(internal_logs), 1)
        extra = internal_logs[0].kwargs["extra"]
        self.assertEqual(extra["conversation_id"], "conversation-1")
        self.assertEqual(extra["agent"], "speech_text_agent")
        self.assertEqual(extra["stream_event_type"], "internal_delta")
        self.assertEqual(extra["stream_kind"], "text")
        self.assertEqual(extra["token_chars"], len("simplified token"))
        self.assertNotIn("simplified token", str(internal_logs[0]))

    async def test_reasoning_block_streams_as_thinking_delta_and_debug_log(self) -> None:
        runner = ChatGraphRunner(thread_context=ChatThreadContextStore())
        runner._graph = FakeGraph(
            [
                message_event(
                    "main_agent",
                    FakeMessage(
                        content_blocks=[
                            {
                                "type": "reasoning",
                                "reasoning": "visible reasoning token",
                            }
                        ],
                    ),
                )
            ]
        )

        with patch("graph.runner.logger.debug") as debug:
            events = [
                event
                async for event in runner.run_stream("hello", session_id="conversation-1")
            ]

        self.assertEqual(
            events,
            [
                {
                    "type": "thinking_delta",
                    "agent": "main_agent",
                    "content": "visible reasoning token",
                }
            ],
        )
        internal_logs = [
            call
            for call in debug.call_args_list
            if call.kwargs.get("extra", {}).get("event") == "agent.internal_stream_token"
        ]
        self.assertEqual(len(internal_logs), 1)
        extra = internal_logs[0].kwargs["extra"]
        self.assertEqual(extra["agent"], "main_agent")
        self.assertEqual(extra["stream_event_type"], "thinking_delta")
        self.assertEqual(extra["stream_kind"], "thinking")
        self.assertEqual(extra["token_chars"], len("visible reasoning token"))
        self.assertNotIn("visible reasoning token", str(internal_logs[0]))


if __name__ == "__main__":
    unittest.main()
