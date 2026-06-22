from __future__ import annotations

import unittest
from typing import Any
from unittest.mock import AsyncMock, patch

from graph.runner import ChatGraphRunner
from memory import ChatThreadContextStore


class FakeCheckpointer:
    def __init__(self) -> None:
        self.deleted_threads: list[str] = []

    def delete_thread(self, thread_id: str) -> None:
        self.deleted_threads.append(thread_id)


class ChatThreadContextStoreTest(unittest.TestCase):
    def test_missing_conversation_id_is_ignored(self) -> None:
        checkpointer = FakeCheckpointer()
        store = ChatThreadContextStore(checkpointer=checkpointer)

        self.assertIsNone(store.activate(None))
        self.assertEqual(checkpointer.deleted_threads, [])

    def test_inactive_thread_expires_and_deletes_thread(self) -> None:
        now = 0.0

        def clock() -> float:
            return now

        checkpointer = FakeCheckpointer()
        store = ChatThreadContextStore(
            checkpointer=checkpointer,
            ttl_seconds=20,
            clock=clock,
        )

        self.assertEqual(store.activate("conversation-a"), "conversation-a")
        now = 19.0
        self.assertEqual(store.expire_inactive(), [])
        self.assertEqual(checkpointer.deleted_threads, [])

        now = 20.0
        self.assertEqual(store.activate("conversation-b"), "conversation-b")
        self.assertEqual(checkpointer.deleted_threads, ["conversation-a"])


class FakeGraph:
    def __init__(self) -> None:
        self.config: dict[str, Any] | None = None
        self.state: dict[str, Any] | None = None

    async def astream(self, state: dict[str, Any], config: dict[str, Any], **_: Any):
        self.state = state
        self.config = config
        yield {
            "type": "custom",
            "data": {
                "type": "final",
                "answer": "ok",
                "tool_calls": [],
                "sources": [],
            },
        }


class ChatGraphRunnerThreadContextTest(unittest.IsolatedAsyncioTestCase):
    async def test_missing_session_id_does_not_invoke_graph(self) -> None:
        runner = ChatGraphRunner(thread_context=ChatThreadContextStore())

        with patch.object(runner, "_get_graph", new_callable=AsyncMock) as get_graph:
            result = await runner.run_once("hello", session_id=None)

        self.assertEqual(result["answer"], "")
        get_graph.assert_not_called()

    async def test_session_id_becomes_thread_id(self) -> None:
        fake_graph = FakeGraph()
        runner = ChatGraphRunner(thread_context=ChatThreadContextStore())
        runner._graph = fake_graph

        result = await runner.run_once("hello", session_id="conversation-1")

        self.assertEqual(result["answer"], "ok")
        self.assertEqual(
            fake_graph.config,
            {"configurable": {"thread_id": "conversation-1"}},
        )


if __name__ == "__main__":
    unittest.main()
