from __future__ import annotations

import re
from collections.abc import AsyncIterator

from langchain_core.messages import AIMessageChunk, HumanMessage, SystemMessage

from agents.openrouter_llm import get_speech_text_llm
from logger import get_logger
from prompt import render_prompt
from settings import settings

logger = get_logger(__name__)

_PROMPT_TEMPLATE = "speech_text_prompt.j2"
_EMPTY_SPEECH_TEXT = "읽어 드릴 답변이 없습니다."


# main 최종 답변을 받아 마크다운·표·목록 등 형식을 제거하고
# TTS로 읽기 좋은 자연스러운 구어체 텍스트로 변환하는 에이전트
class SpeechTextAgent:
    def __init__(self, *, system_prompt: str | None = None) -> None:
        self._system_prompt = system_prompt or render_prompt(_PROMPT_TEMPLATE)

    # 최종 답변 텍스트를 받아 구어체 음성 텍스트를 스트리밍으로 생성
    async def stream_speech_text(self, answer: str) -> AsyncIterator[dict[str, object]]:
        source_text = (answer or "").strip()

        if not source_text:
            yield {"type": "speech_text.delta", "text": _EMPTY_SPEECH_TEXT}
            yield {"type": "speech_text.final", "text": _EMPTY_SPEECH_TEXT}
            return

        # OpenRouter 키가 없으면 네트워크 호출 없이 로컬에서 형식만 제거한다.
        if settings.openrouter_api_key is None:
            speech_text = _strip_formatting(source_text)
            yield {"type": "speech_text.delta", "text": speech_text}
            yield {"type": "speech_text.final", "text": speech_text}
            return

        try:
            messages = [
                SystemMessage(content=self._system_prompt),
                HumanMessage(
                    content=(
                        "다음은 메인 어시스턴트의 최종 답변입니다:\n\n"
                        f"{source_text}\n\n"
                        "이제 음성으로 읽을 텍스트를 만들어 주세요."
                    )
                ),
            ]

            parts: list[str] = []
            async for chunk in get_speech_text_llm().astream(messages):
                if not isinstance(chunk, AIMessageChunk):
                    continue
                text = _chunk_text(chunk)
                if not text:
                    continue
                parts.append(text)
                yield {"type": "speech_text.delta", "text": text}

            speech_text = "".join(parts).strip() or _strip_formatting(source_text)
            yield {"type": "speech_text.final", "text": speech_text}
        except Exception:
            logger.exception("speech_text_agent sanitization failed; falling back")
            speech_text = _strip_formatting(source_text)
            yield {"type": "speech_text.delta", "text": speech_text}
            yield {"type": "speech_text.final", "text": speech_text}


def _chunk_text(chunk: AIMessageChunk) -> str:
    text = getattr(chunk, "text", None)
    if isinstance(text, str):
        return text
    content = chunk.content
    return content if isinstance(content, str) else ""


_CODE_BLOCK = re.compile(r"```.*?```", re.DOTALL)
_INLINE_MARKS = re.compile(r"[`*_#>|]+")
_LINK = re.compile(r"\[([^\]]+)\]\([^)]*\)")
_LIST_BULLET = re.compile(r"^\s*(?:[-*+]|\d+\.)\s+", re.MULTILINE)


# LLM을 못 쓸 때 사용하는 최소 형식 제거 fallback (네트워크 불필요)
def _strip_formatting(text: str) -> str:
    text = _CODE_BLOCK.sub(" ", text)
    text = _LINK.sub(r"\1", text)
    text = _LIST_BULLET.sub("", text)
    text = _INLINE_MARKS.sub("", text)
    return " ".join(text.split())
