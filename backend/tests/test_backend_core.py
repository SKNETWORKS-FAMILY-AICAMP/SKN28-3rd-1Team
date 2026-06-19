from __future__ import annotations

import asyncio
import base64
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import PropertyMock, patch

from fastapi.testclient import TestClient
from langchain_core.messages import AIMessageChunk, ToolMessage

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from app import app
from agents.graph import (
    AgentRunResult,
    AgentStreamEvent,
    SourceSummary,
    ToolCallSummary,
    _stream_chunk_to_text,
)
from agents import tool as tool_module
import agents.speech_text_agent.agent as speech_text_agent_module
from agents.speech_text_agent import stream_speech_audio
from agents.speech_text_agent.agent import SpeechTextAgent, _strip_formatting
from agents.speech_text_agent.synthesis import SpeechSynthesisNode, SpeechSynthesisRequest


# FastAPI TestClient를 생성해 테스트 간 재사용
client = TestClient(app)


async def _async_events(events: list[AgentStreamEvent]):
    for event in events:
        yield event


# health endpoint가 서비스 상태를 반환하는지 확인
class HealthApiTest(unittest.TestCase):
    def test_health_returns_ok(self) -> None:
        response = client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

# /chat endpoint가 run_agent 결과를 answer로 반환하는지 확인
class ChatApiTest(unittest.TestCase):
    def test_chat_returns_agent_answer(self) -> None:
        with patch(
            "api.chat.run_agent",
            return_value=AgentRunResult(
                answer="신청은 주민센터에서 할 수 있습니다.",
                tool_calls=[
                    ToolCallSummary(
                        name="memgraph_read_query",
                        status="completed",
                        id="call-1",
                    )
                ],
                sources=[
                    SourceSummary(
                        title="노인일자리 안내",
                        excerpt="신청은 주민센터에서 할 수 있습니다.",
                    )
                ],
            ),
        ) as run_agent:
            response = client.post(
                "/chat",
                json={
                    "session_id": "test-session",
                    "message": "노인일자리 신청 방법 알려줘",
                    "metadata": {"source": "unit-test"},
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "answer": "신청은 주민센터에서 할 수 있습니다.",
                "tool_calls": [
                    {
                        "name": "memgraph_read_query",
                        "status": "completed",
                        "id": "call-1",
                    }
                ],
                "sources": [
                    {
                        "title": "노인일자리 안내",
                        "url": None,
                        "excerpt": "신청은 주민센터에서 할 수 있습니다.",
                    }
                ],
                "session_id": "test-session",
            },
        )
        run_agent.assert_called_once_with("노인일자리 신청 방법 알려줘", session_id="test-session")

    def test_chat_stream_returns_sse_event(self) -> None:
        with patch(
            "api.chat.run_agent_stream",
            return_value=_async_events(
                [
                    AgentStreamEvent(
                        type="tool_call",
                        tool_call=ToolCallSummary(
                            name="memgraph_read_query",
                            status="started",
                            id="call-1",
                        ),
                    ),
                    AgentStreamEvent(type="delta", content="신청은 "),
                    AgentStreamEvent(type="delta", content="주민센터에서 "),
                    AgentStreamEvent(type="delta", content="할 수 있습니다."),
                    AgentStreamEvent(
                        type="final",
                        result=AgentRunResult(
                            answer="신청은 주민센터에서 할 수 있습니다.",
                            tool_calls=[
                                ToolCallSummary(
                                    name="memgraph_read_query",
                                    status="completed",
                                    id="call-1",
                                )
                            ],
                        ),
                    ),
                ]
            ),
        ) as run_agent_stream:
            response = client.post(
                "/chat/stream",
                json={
                    "session_id": "stream-session",
                    "message": "노인일자리 신청 방법 알려줘",
                    "metadata": {"source": "unit-test"},
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/event-stream", response.headers["content-type"])

        body = response.text
        self.assertIn("event: delta", body)
        self.assertIn("event: tool_call", body)
        self.assertIn("event: final", body)
        self.assertIn('"name": "memgraph_read_query"', body)
        self.assertIn('"status": "completed"', body)
        self.assertIn('"content": "신청은 "', body)
        self.assertIn('"content": "주민센터에서 "', body)
        self.assertIn('"content": "할 수 있습니다."', body)
        self.assertIn("신청은 주민센터에서 할 수 있습니다.", body)

        run_agent_stream.assert_called_once_with("노인일자리 신청 방법 알려줘", session_id="stream-session")


class AgentStreamChunkTest(unittest.TestCase):
    def test_stream_chunk_to_text_returns_assistant_content(self) -> None:
        chunk = AIMessageChunk(content="신청은 ")

        self.assertEqual(_stream_chunk_to_text(chunk), "신청은 ")

    def test_stream_chunk_to_text_ignores_tool_messages(self) -> None:
        chunk = ToolMessage(content="mock 검색 결과입니다.", tool_call_id="tool-1")

        self.assertEqual(_stream_chunk_to_text(chunk), "")

    def test_stream_chunk_to_text_ignores_tool_call_chunks(self) -> None:
        chunk = AIMessageChunk(
            content="",
            tool_call_chunks=[
                {
                    "name": "mock_policy_search_tool",
                    "args": '{"query":"노인일자리"}',
                    "id": "call-1",
                    "index": 0,
                }
            ],
        )

        self.assertEqual(_stream_chunk_to_text(chunk), "")

    def test_stream_chunk_to_text_ignores_internal_tool_markup(self) -> None:
        chunk = AIMessageChunk(content="｜DSML｜tool_calls>")

        self.assertEqual(_stream_chunk_to_text(chunk), "")


class AgentToolTest(unittest.TestCase):
    def tearDown(self) -> None:
        tool_module.clear_tools_cache()

    def test_get_tools_returns_empty_when_rag_tools_disabled(self) -> None:
        tool_module.clear_tools_cache()

        with (
            patch.object(tool_module.settings.rag, "tools_enabled", False),
            patch.object(tool_module, "_load_rag_mcp_tools") as load_tools,
        ):
            tools = asyncio.run(tool_module.get_tools())

        self.assertEqual(tools, [])
        load_tools.assert_not_called()


async def _collect(agen) -> list:
    return [item async for item in agen]


# speech_text_agent: 형식 제거(평문화)와 fallback 동작 확인
class SpeechTextAgentTest(unittest.TestCase):
    def test_strip_formatting_removes_markdown(self) -> None:
        text = "## 제목\n- 항목 **굵게** `코드`\n[안내](https://example.com)"
        result = _strip_formatting(text)

        for marker in ("#", "*", "`", "https://"):
            self.assertNotIn(marker, result)
        self.assertIn("안내", result)

    def test_stream_speech_text_falls_back_without_api_key(self) -> None:
        agent = SpeechTextAgent(system_prompt="ignored")

        with patch.object(speech_text_agent_module.settings.llm, "openrouter_api_key", None):
            events = asyncio.run(_collect(agent.stream_speech_text("**굵게** 답변입니다")))

        final = next(event for event in events if event["type"] == "speech_text.final")
        self.assertNotIn("*", final["text"])
        self.assertIn("답변입니다", final["text"])

    def test_stream_speech_text_handles_empty_answer(self) -> None:
        agent = SpeechTextAgent(system_prompt="ignored")

        events = asyncio.run(_collect(agent.stream_speech_text("   ")))

        final = next(event for event in events if event["type"] == "speech_text.final")
        self.assertTrue(final["text"])


# speech_text_agent: TTS 미설정 시 네트워크 없이 안전하게 종료하는지 확인
class SpeechSynthesisTest(unittest.TestCase):
    def test_synthesis_unconfigured_yields_error_and_completed(self) -> None:
        request = SpeechSynthesisRequest(session_id="s", turn_id="t", text="안녕하세요")

        with patch("settings.Settings.tts_configured", new_callable=PropertyMock, return_value=False):
            events = asyncio.run(_collect(SpeechSynthesisNode().stream_speech(request)))

        types = [event["type"] for event in events]
        self.assertIn("error", types)
        completed = next(event for event in events if event["type"] == "tts.completed")
        self.assertFalse(completed["configured"])

    def test_pipeline_skips_when_unconfigured(self) -> None:
        with patch("settings.Settings.tts_configured", new_callable=PropertyMock, return_value=False):
            events = asyncio.run(_collect(stream_speech_audio("답변입니다", session_id="s")))

        self.assertEqual(events, [])


# ElevenLabs websocket을 흉내내는 fake (네트워크 없이 audio 청크 -> isFinal 전송)
class _FakeWebSocket:
    def __init__(self, messages: list[str]) -> None:
        self._messages = list(messages)

    async def __aenter__(self) -> "_FakeWebSocket":
        return self

    async def __aexit__(self, *exc: object) -> bool:
        return False

    async def send(self, _: str) -> None:
        return None

    def __aiter__(self) -> "_FakeWebSocket":
        return self

    async def __anext__(self) -> str:
        if not self._messages:
            raise StopAsyncIteration
        return self._messages.pop(0)


# /chat/stream이 final 이후 speech_text/audio/audio_done 이벤트까지 이어 보내는지 e2e 확인
# (OpenRouter는 fallback, ElevenLabs는 fake websocket으로 대체해 네트워크 미사용)
class ChatStreamAudioTest(unittest.TestCase):
    def test_chat_stream_emits_audio_events_when_tts_configured(self) -> None:
        ws_messages = [
            json.dumps({"audio": base64.b64encode(b"chunk-one").decode()}),
            json.dumps({"audio": base64.b64encode(b"chunk-two").decode()}),
            json.dumps({"isFinal": True}),
        ]

        with (
            patch(
                "api.chat.run_agent_stream",
                return_value=_async_events(
                    [
                        AgentStreamEvent(type="delta", content="**굵게** 답변입니다."),
                        AgentStreamEvent(
                            type="final",
                            result=AgentRunResult(answer="**굵게** 답변입니다."),
                        ),
                    ]
                ),
            ),
            patch("settings.Settings.tts_configured", new_callable=PropertyMock, return_value=True),
            patch.object(speech_text_agent_module.settings.llm, "openrouter_api_key", None),
            patch(
                "agents.speech_text_agent.synthesis.connect",
                return_value=_FakeWebSocket(ws_messages),
            ),
        ):
            response = client.post(
                "/chat/stream",
                json={"session_id": "audio-session", "message": "노인일자리 신청 방법"},
            )

        self.assertEqual(response.status_code, 200)
        body = response.text
        self.assertIn("event: final", body)
        self.assertIn("event: speech_text", body)
        self.assertIn("event: audio", body)
        self.assertIn("event: audio_done", body)
        # 평문화 fallback이 마크다운(**)을 제거했는지
        self.assertNotIn('"text": "**', body)
        # 두 오디오 청크가 base64로 전달됐는지
        self.assertIn(base64.b64encode(b"chunk-one").decode(), body)
        self.assertIn(base64.b64encode(b"chunk-two").decode(), body)
        self.assertIn('"chunks": 2', body)


if __name__ == "__main__":
    unittest.main()
