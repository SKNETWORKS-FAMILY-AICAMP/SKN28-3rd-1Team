from __future__ import annotations

import unittest
from unittest.mock import patch

from pydantic import SecretStr

from llm.cerebras import create_chat_cerebras
from settings import LlmProviderSettings


class CerebrasLlmTest(unittest.TestCase):
    def test_gpt_oss_does_not_send_glm_clear_thinking_parameter(self) -> None:
        provider_settings = LlmProviderSettings(
            LLM_PROVIDER_CEREBRAS_API_KEY=SecretStr("test-key")
        )

        with patch("llm.cerebras.ChatCerebras", return_value="llm") as chat_cerebras:
            result = create_chat_cerebras(
                provider_settings=provider_settings,
                model="gpt-oss-120b",
                timeout_ms=1000,
                max_retries=1,
                max_tokens=None,
                reasoning_effort="high",
                reasoning_format="hidden",
                clear_thinking=False,
            )

        self.assertEqual(result, "llm")
        extra_body = chat_cerebras.call_args.kwargs["extra_body"]
        self.assertEqual(extra_body, {"reasoning_format": "hidden"})

    def test_glm_keeps_clear_thinking_parameter(self) -> None:
        provider_settings = LlmProviderSettings(
            LLM_PROVIDER_CEREBRAS_API_KEY=SecretStr("test-key")
        )

        with patch("llm.cerebras.ChatCerebras", return_value="llm") as chat_cerebras:
            result = create_chat_cerebras(
                provider_settings=provider_settings,
                model="zai-glm-4.7",
                timeout_ms=1000,
                max_retries=1,
                max_tokens=None,
                reasoning_effort="high",
                reasoning_format="hidden",
                clear_thinking=False,
            )

        self.assertEqual(result, "llm")
        extra_body = chat_cerebras.call_args.kwargs["extra_body"]
        self.assertEqual(
            extra_body,
            {
                "reasoning_format": "hidden",
                "clear_thinking": False,
            },
        )


if __name__ == "__main__":
    unittest.main()
