from __future__ import annotations

from pathlib import Path
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.runnables import RunnableConfig

from llm import get_sanitize
from logger import get_logger
from utils import render_prompt

logger = get_logger(__name__)
_PROMPT_TEMPLATE = Path(__file__).with_name("speech_text_prompt.j2")


class SpeechTextAgent:
    def __init__(
        self,
        *,
        system_prompt: str | None = None,
        model: BaseChatModel | None = None,
    ) -> None:
        self.system_prompt = system_prompt or render_prompt(_PROMPT_TEMPLATE)
        self.model = model if model is not None else get_sanitize()


async def create_speech_text_agent() -> SpeechTextAgent:
    agent = SpeechTextAgent()
    logger.info(
        "created speech text agent model=%s",
        getattr(agent.model, "model_name", None) or getattr(agent.model, "model", None),
    )
    return agent


async def create_final_response_script(
    agent: SpeechTextAgent,
    final_response: str,
    *,
    config: RunnableConfig,
) -> str:
    if not final_response:
        return "답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요."

    if agent.model is not None:
        try:
            response = await agent.model.ainvoke(
                [
                    {"role": "system", "content": agent.system_prompt},
                    {"role": "user", "content": final_response},
                ],
                config=config,
            )
            return _message_text(response) or final_response
        except Exception:
            logger.exception("speech text generation failed; falling back")

    return final_response


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
