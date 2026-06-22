from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.runnables import RunnableConfig

from llm import get_speech_text_llm, speech_text_llm_configured
from logger import get_logger
from utils import render_prompt

logger = get_logger(__name__)
_PROMPT_TEMPLATE = Path(__file__).with_name("speech_text_prompt.j2")
_MAX_LOCAL_SCRIPT_CHARS = 1_000
_MAX_FALLBACK_SCRIPT_CHARS = 1_200

_SPEECH_TEXT_AGENT: SpeechTextAgent | None = None


@dataclass(frozen=True)
class SpeechTextResult:
    text: str
    source: str
    llm_used: bool


class SpeechTextAgent:
    def __init__(
        self,
        *,
        system_prompt: str | None = None,
        model: BaseChatModel | None = None,
        configured: bool | None = None,
    ) -> None:
        self.system_prompt = system_prompt or render_prompt(_PROMPT_TEMPLATE)
        self.configured = speech_text_llm_configured() if configured is None else configured
        self.model = model if model is not None else get_speech_text_llm() if self.configured else None


async def create_speech_text_agent() -> SpeechTextAgent:
    global _SPEECH_TEXT_AGENT
    if _SPEECH_TEXT_AGENT is not None:
        return _SPEECH_TEXT_AGENT

    _SPEECH_TEXT_AGENT = SpeechTextAgent()
    logger.info(
        "created speech text agent configured=%s model=%s",
        _SPEECH_TEXT_AGENT.configured,
        getattr(_SPEECH_TEXT_AGENT.model, "model_name", None)
        or getattr(_SPEECH_TEXT_AGENT.model, "model", None),
    )
    return _SPEECH_TEXT_AGENT


def clear_speech_text_agent_cache() -> None:
    global _SPEECH_TEXT_AGENT
    _SPEECH_TEXT_AGENT = None


async def create_final_response_script(
    agent: SpeechTextAgent,
    final_response: str,
    *,
    config: RunnableConfig,
) -> str:
    result = await create_final_response_script_result(
        agent,
        final_response,
        config=config,
    )
    return result.text


async def create_final_response_script_result(
    agent: SpeechTextAgent,
    final_response: str,
    *,
    config: RunnableConfig,
) -> SpeechTextResult:
    if not final_response:
        return SpeechTextResult(
            text="답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            source="fallback",
            llm_used=False,
        )

    local_script = sanitize_speech_text(final_response)
    if not _needs_llm_sanitization(final_response, local_script):
        return SpeechTextResult(text=local_script, source="local", llm_used=False)

    if agent.configured and agent.model is not None:
        try:
            response = await agent.model.ainvoke(
                [
                    {"role": "system", "content": agent.system_prompt},
                    {"role": "user", "content": final_response},
                ],
                config=config,
            )
            llm_response_text = _message_text(response).strip()
            if llm_response_text:
                llm_script = sanitize_speech_text(llm_response_text)
                return SpeechTextResult(
                    text=_limit_script(llm_script, _MAX_FALLBACK_SCRIPT_CHARS),
                    source="llm",
                    llm_used=True,
                )
        except Exception:
            logger.exception("speech text generation failed; falling back")

    return SpeechTextResult(
        text=_limit_script(local_script, _MAX_FALLBACK_SCRIPT_CHARS),
        source="local_fallback",
        llm_used=False,
    )


def sanitize_speech_text(text: str) -> str:
    normalized = str(text or "").replace("\r\n", "\n").replace("\r", "\n")
    normalized = re.sub(r"```[\s\S]*?```", " ", normalized)
    normalized = re.sub(r"`([^`]*)`", r"\1", normalized)
    normalized = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", normalized)
    normalized = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", normalized)
    normalized = re.sub(r"https?://\S+", " ", normalized)
    normalized = re.sub(r"【[^】]+】", " ", normalized)
    normalized = re.sub(r"\[[0-9]+\]", " ", normalized)
    normalized = re.sub(r"[*_~]{1,3}", "", normalized)

    spoken_lines: list[str] = []
    for raw_line in normalized.split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        if re.fullmatch(r"\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?", line):
            continue

        line = re.sub(r"^\s{0,3}#{1,6}\s*", "", line)
        line = re.sub(r"^\s*[-*+]\s+", "", line)
        line = re.sub(r"^\s*\d+[.)]\s+", "", line)
        line = line.strip("| ")

        if "|" in line:
            cells = [cell.strip() for cell in line.split("|") if cell.strip()]
            line = ", ".join(cells)

        line = re.sub(r"\s+", " ", line).strip()
        if line:
            spoken_lines.append(line)

    script = " ".join(spoken_lines)
    script = re.sub(r"\s+", " ", script).strip()
    return script or "답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요."


def _needs_llm_sanitization(original: str, sanitized: str) -> bool:
    if len(sanitized) > _MAX_LOCAL_SCRIPT_CHARS:
        return True

    markdown_list_items = len(re.findall(r"(?m)^\s*(?:[-*+]|\d+[.)])\s+", original))
    table_rows = len(re.findall(r"(?m)^\s*\|.+\|\s*$", original))
    link_count = len(re.findall(r"\[[^\]]+\]\([^)]+\)|https?://\S+", original))
    code_block_count = original.count("```")

    complexity_score = 0
    if markdown_list_items >= 5:
        complexity_score += 2
    elif markdown_list_items >= 3:
        complexity_score += 1
    if table_rows >= 3:
        complexity_score += 2
    if link_count >= 3:
        complexity_score += 1
    if code_block_count:
        complexity_score += 2

    return complexity_score >= 2


def _limit_script(script: str, max_chars: int) -> str:
    if len(script) <= max_chars:
        return script

    boundary = max(
        script.rfind(".", 0, max_chars),
        script.rfind("다.", 0, max_chars),
        script.rfind("요.", 0, max_chars),
        script.rfind("니다.", 0, max_chars),
    )
    if boundary < max_chars // 2:
        boundary = max_chars

    return f"{script[: boundary + 1].strip()} 나머지 자세한 내용은 화면의 답변을 참고해 주세요."


def _message_text(message: Any) -> str:
    text = getattr(message, "text", None)
    if isinstance(text, str):
        return text.strip()

    content = getattr(message, "content", message)
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        return " ".join(
            str(block.get("text") or "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        ).strip()
    return str(content).strip() if content is not None else ""
