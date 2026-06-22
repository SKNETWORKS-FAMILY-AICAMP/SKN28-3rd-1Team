from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from settings.llm import LlmAgentSettings, LlmProviderSettings, LlmRequestSettings, LlmSettings


class LlmSettingsTest(unittest.TestCase):
    def test_agent_model_selection_uses_new_namespaces(self) -> None:
        env = {
            "LLM_AGENT_MAIN_PROVIDER": "openrouter",
            "LLM_AGENT_MAIN_MODEL": "openai/gpt-4.1-mini",
            "LLM_AGENT_SANITIZE_PROVIDER": "cerebras",
            "LLM_AGENT_WINDOW_MODEL": "gpt-oss-120b",
        }

        with patch.dict(os.environ, env, clear=True):
            llm_settings = LlmSettings(agents=LlmAgentSettings())

        self.assertEqual(llm_settings.agent_provider("main"), "openrouter")
        self.assertEqual(llm_settings.agent_model("main"), "openai/gpt-4.1-mini")
        self.assertEqual(llm_settings.agent_provider("sanitize"), "cerebras")
        self.assertEqual(llm_settings.agent_model("sanitize"), "openai/gpt-4.1-mini")
        self.assertEqual(llm_settings.agent_provider("window"), "openrouter")
        self.assertEqual(llm_settings.agent_model("window"), "gpt-oss-120b")

    def test_request_and_provider_settings_use_new_namespaces(self) -> None:
        env = {
            "LLM_REQUEST_TIMEOUT_MS": "45000",
            "LLM_REQUEST_MAX_RETRIES": "3",
            "LLM_RESPONSE_MAX_TOKENS": "1024",
            "LLM_PROVIDER_OPENROUTER_PROVIDER_ORDER": '["cerebras"]',
            "LLM_PROVIDER_OPENROUTER_ALLOW_FALLBACKS": "false",
        }

        with patch.dict(os.environ, env, clear=True):
            request_settings = LlmRequestSettings()
            provider_settings = LlmProviderSettings()

        self.assertEqual(request_settings.timeout_ms, 45000)
        self.assertEqual(request_settings.max_retries, 3)
        self.assertEqual(request_settings.max_tokens, 1024)
        self.assertEqual(provider_settings.openrouter_provider_order, ["cerebras"])
        self.assertFalse(provider_settings.openrouter_allow_fallbacks)


if __name__ == "__main__":
    unittest.main()
