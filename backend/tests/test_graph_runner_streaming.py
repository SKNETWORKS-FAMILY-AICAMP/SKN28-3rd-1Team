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
        additional_kwargs: dict[str, Any] | None = None,
    ) -> None:
        self.content = content
        self.text = text
        self.content_blocks = content_blocks
        self.additional_kwargs = additional_kwargs or {}


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
    async def test_main_agent_text_streams_as_agent_text_delta(self) -> None:
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

        self.assertEqual(
            events,
            [
                {
                    "type": "agent.text.delta",
                    "source_agent": "main_agent",
                    "node": "main_agent",
                    "text": "public token",
                }
            ],
        )

    async def test_screen_control_agent_text_streams_as_agent_text_delta(self) -> None:
        runner = ChatGraphRunner(thread_context=ChatThreadContextStore())
        runner._graph = FakeGraph(
            [
                message_event(
                    "screen_control_agent",
                    FakeMessage(content=[{"type": "text", "text": "screen token"}]),
                )
            ]
        )

        events = [
            event
            async for event in runner.run_stream("hello", session_id="conversation-1")
        ]

        self.assertEqual(
            events,
            [
                {
                    "type": "agent.text.delta",
                    "source_agent": "screen_control_agent",
                    "node": "screen_control_agent",
                    "text": "screen token",
                }
            ],
        )

    async def test_speech_text_agent_text_streams_as_speech_text_delta_and_debug_log(self) -> None:
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
                    "type": "speech_text.delta",
                    "source_agent": "speech_text_agent",
                    "node": "speech_text_agent",
                    "text": "simplified token",
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
        self.assertEqual(extra["stream_event_type"], "speech_text.delta")
        self.assertEqual(extra["stream_kind"], "text")
        self.assertEqual(extra["token_chars"], len("simplified token"))
        self.assertNotIn("simplified token", str(internal_logs[0]))

    async def test_speech_text_agent_reasoning_streams_as_agent_reasoning_delta(self) -> None:
        runner = ChatGraphRunner(thread_context=ChatThreadContextStore())
        runner._graph = FakeGraph(
            [
                message_event(
                    "speech_text_agent",
                    FakeMessage(additional_kwargs={"reasoning": "speech reasoning token"}),
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
                    "type": "agent.reasoning.delta",
                    "source_agent": "speech_text_agent",
                    "node": "speech_text_agent",
                    "text": "speech reasoning token",
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
        self.assertEqual(extra["agent"], "speech_text_agent")
        self.assertEqual(extra["stream_event_type"], "agent.reasoning.delta")
        self.assertEqual(extra["stream_kind"], "reasoning")
        self.assertEqual(extra["token_chars"], len("speech reasoning token"))
        self.assertNotIn("speech reasoning token", str(internal_logs[0]))

    async def test_main_agent_reasoning_block_is_dropped(self) -> None:
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

        self.assertEqual(events, [])
        internal_logs = [
            call
            for call in debug.call_args_list
            if call.kwargs.get("extra", {}).get("event") == "agent.internal_stream_token"
        ]
        self.assertEqual(internal_logs, [])

    async def test_main_agent_additional_kwargs_reasoning_is_dropped(self) -> None:
        runner = ChatGraphRunner(thread_context=ChatThreadContextStore())
        runner._graph = FakeGraph(
            [
                message_event(
                    "main_agent",
                    FakeMessage(additional_kwargs={"reasoning": "cerebras reasoning token"}),
                ),
                message_event(
                    "main_agent",
                    FakeMessage(additional_kwargs={"reasoning_content": "openrouter reasoning token"}),
                ),
            ]
        )

        events = [
            event
            async for event in runner.run_stream("hello", session_id="conversation-1")
        ]

        self.assertEqual(events, [])

    async def test_updates_stream_as_node_lifecycle_event(self) -> None:
        runner = ChatGraphRunner(thread_context=ChatThreadContextStore())
        runner._graph = FakeGraph(
            [
                {
                    "type": "updates",
                    "data": {
                        "main_agent": {
                            "messages": [],
                            "final_response": "ok",
                        }
                    },
                }
            ]
        )

        events = [
            event
            async for event in runner.run_stream("hello", session_id="conversation-1")
        ]

        self.assertEqual(
            events,
            [
                {
                    "type": "node.updated",
                    "source": "langgraph.updates",
                    "node": "main_agent",
                    "nodes": [
                        {
                            "node": "main_agent",
                            "keys": ["final_response", "messages"],
                        }
                    ],
                }
            ],
        )

    async def test_tasks_stream_as_task_lifecycle_event(self) -> None:
        runner = ChatGraphRunner(thread_context=ChatThreadContextStore())
        runner._graph = FakeGraph(
            [
                {
                    "type": "tasks",
                    "data": {
                        "id": "task-1",
                        "name": "main_agent",
                        "triggers": ["start:main_agent"],
                        "input": {},
                    },
                },
                {
                    "type": "tasks",
                    "data": {
                        "id": "task-1",
                        "name": "main_agent",
                        "error": None,
                        "interrupts": [],
                        "result": {"messages": []},
                    },
                },
            ]
        )

        events = [
            event
            async for event in runner.run_stream("hello", session_id="conversation-1")
        ]

        self.assertEqual(
            events,
            [
                {
                    "type": "task.started",
                    "source": "langgraph.tasks",
                    "task_id": "task-1",
                    "node": "main_agent",
                    "triggers": ["start:main_agent"],
                },
                {
                    "type": "task.completed",
                    "source": "langgraph.tasks",
                    "task_id": "task-1",
                    "node": "main_agent",
                    "error": None,
                    "result_keys": ["messages"],
                    "interrupt_count": 0,
                },
            ],
        )


if __name__ == "__main__":
    unittest.main()
