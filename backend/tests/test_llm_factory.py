from __future__ import annotations

import unittest
from unittest.mock import patch

from llm import factory


class FakeRequestSettings:
    timeout_ms = 1000
    max_retries = 1
    max_tokens = 256


class FakeLlmSettings:
    request = FakeRequestSettings()
    providers = object()

    def __init__(self, provider: str = "cerebras") -> None:
        self._provider = provider

    def agent_provider(self, _: str) -> str:
        return self._provider

    def agent_model(self, _: str) -> str:
        return "gpt-oss-120b"

    def agent_reasoning_effort(self, agent: str) -> str | None:
        return {
            "main": "high",
            "sanitize": "low",
            "window": "medium",
        }.get(agent)

    def agent_reasoning_format(self, agent: str) -> str | None:
        return {
            "main": "hidden",
            "window": "hidden",
        }.get(agent)

    def agent_clear_thinking(self, agent: str) -> bool | None:
        return {
            "main": False,
            "window": False,
        }.get(agent)


class FakeSettings:
    def __init__(self, provider: str = "cerebras") -> None:
        self.llm = FakeLlmSettings(provider)


class LlmFactoryTest(unittest.TestCase):
    def test_sanitize_cerebras_llm_uses_low_reasoning_effort(self) -> None:
        with (
            patch.object(factory, "settings", FakeSettings("cerebras")),
            patch.object(factory, "create_chat_cerebras", return_value="llm") as create_chat_cerebras,
        ):
            result = factory.create_agent_llm("sanitize")

        self.assertEqual(result, "llm")
        self.assertEqual(create_chat_cerebras.call_args.kwargs["reasoning_effort"], "low")

    def test_main_cerebras_llm_uses_high_reasoning_effort(self) -> None:
        with (
            patch.object(factory, "settings", FakeSettings("cerebras")),
            patch.object(factory, "create_chat_cerebras", return_value="llm") as create_chat_cerebras,
        ):
            result = factory.create_agent_llm("main")

        self.assertEqual(result, "llm")
        self.assertEqual(create_chat_cerebras.call_args.kwargs["reasoning_effort"], "high")
        self.assertEqual(create_chat_cerebras.call_args.kwargs["reasoning_format"], "hidden")
        self.assertFalse(create_chat_cerebras.call_args.kwargs["clear_thinking"])

    def test_window_cerebras_llm_uses_medium_reasoning_effort(self) -> None:
        with (
            patch.object(factory, "settings", FakeSettings("cerebras")),
            patch.object(factory, "create_chat_cerebras", return_value="llm") as create_chat_cerebras,
        ):
            result = factory.create_agent_llm("window")

        self.assertEqual(result, "llm")
        self.assertEqual(create_chat_cerebras.call_args.kwargs["reasoning_effort"], "medium")
        self.assertEqual(create_chat_cerebras.call_args.kwargs["reasoning_format"], "hidden")
        self.assertFalse(create_chat_cerebras.call_args.kwargs["clear_thinking"])

    def test_sanitize_openrouter_llm_uses_low_reasoning_effort(self) -> None:
        with (
            patch.object(factory, "settings", FakeSettings("openrouter")),
            patch.object(factory, "create_chat_openrouter", return_value="llm") as create_chat_openrouter,
        ):
            result = factory.create_agent_llm("sanitize")

        self.assertEqual(result, "llm")
        self.assertEqual(create_chat_openrouter.call_args.kwargs["reasoning_effort"], "low")


if __name__ == "__main__":
    unittest.main()
