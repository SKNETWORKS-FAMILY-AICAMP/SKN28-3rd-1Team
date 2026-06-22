from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from agents.speech_text_agent import (
    SpeechTextAgent,
    create_final_response_script_result,
    sanitize_speech_text,
)
from api.chat import ChatRequest, run_chat


class ChatRequestAudioTest(unittest.IsolatedAsyncioTestCase):
    def test_audio_enabled_defaults_to_true(self) -> None:
        request = ChatRequest(message="hello")

        self.assertTrue(request.audio_enabled)

    async def test_run_chat_forwards_audio_enabled(self) -> None:
        with patch(
            "api.chat.run_agent",
            new=AsyncMock(return_value={"answer": "ok"}),
        ) as run_agent:
            response = await run_chat(
                ChatRequest(
                    session_id="session-1",
                    message="hello",
                    audio_enabled=False,
                    metadata={"source": "unit-test"},
                )
            )

        self.assertEqual(response.answer, "ok")
        run_agent.assert_awaited_once_with(
            "hello",
            session_id="session-1",
            audio_enabled=False,
            metadata={"source": "unit-test"},
        )


class SpeechTextSanitizerTest(unittest.IsolatedAsyncioTestCase):
    def test_sanitize_speech_text_removes_markdown(self) -> None:
        script = sanitize_speech_text(
            """
            ## 신청 방법
            - **주민센터**에 방문하세요.
            - [복지로](https://www.bokjiro.go.kr)에서도 확인할 수 있습니다.
            """
        )

        self.assertNotIn("##", script)
        self.assertNotIn("**", script)
        self.assertNotIn("https://", script)
        self.assertIn("주민센터", script)
        self.assertIn("복지로", script)

    async def test_simple_answer_uses_local_sanitizer_without_llm(self) -> None:
        result = await create_final_response_script_result(
            SpeechTextAgent(configured=False),
            "기초연금은 주민센터나 복지로에서 신청할 수 있습니다.",
            config={},
        )

        self.assertEqual(result.source, "local")
        self.assertFalse(result.llm_used)
        self.assertIn("기초연금", result.text)
