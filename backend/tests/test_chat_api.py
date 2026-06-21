from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

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
