from typing import Any

from langchain_core.runnables import RunnableConfig
from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph

from agents.main_agent import create_main_agent
from agents.screen_control_agent import create_screen_control_agent
from agents.speech_text_agent import create_speech_text_agent
from graph.state import ChatTurnState
from logger import get_logger
from nodes.speech_synthesis_node import SpeechSynthesisNode, SpeechSynthesisRequest

logger = get_logger(__name__)


def build_chat_turn_graph(
    *,
    main_agent: Any,
    speech_text_agent: Any,
    speech_synthesis_node: SpeechSynthesisNode,
    window_changing_agent: Any,
) -> Any:
    graph = StateGraph(ChatTurnState)

    graph.add_node("main_agent", main_agent)
    graph.add_node("main_agent_result", _main_agent_result_node)
    graph.add_node("speech_text_agent", speech_text_agent)
    graph.add_node("speech_text_result", _speech_text_result_node)
    graph.add_node("speech_synthesis_node", _speech_synthesis_node(speech_synthesis_node))
    graph.add_node("window_changing_agent", window_changing_agent)

    graph.add_edge(START, "main_agent")
    graph.add_edge("main_agent", "main_agent_result")
    graph.add_edge("main_agent_result", "speech_text_agent")
    graph.add_edge("main_agent_result", "window_changing_agent")
    graph.add_edge("speech_text_agent", "speech_text_result")
    graph.add_edge("speech_text_result", "speech_synthesis_node")
    graph.add_edge("speech_synthesis_node", END)
    graph.add_edge("window_changing_agent", END)

    return graph.compile(name="chat-turn-graph")


async def create_chat_turn_graph() -> Any:
    return build_chat_turn_graph(
        main_agent=await create_main_agent(),
        speech_text_agent=await create_speech_text_agent(),
        speech_synthesis_node=SpeechSynthesisNode(),
        window_changing_agent=await create_screen_control_agent(),
    )


def _main_agent_result_node(state: ChatTurnState) -> dict[str, Any]:
    final_response = _final_message_text(state)
    used_information: list[dict[str, Any]] = []

    _writer()(
        {
            "type": "final",
            "answer": final_response,
            "sources": used_information,
            "session_id": state.get("session_id"),
            "turn_id": state.get("turn_id"),
        }
    )
    return {
        "final_response": final_response,
        "used_information": used_information,
    }


def _speech_text_result_node(state: ChatTurnState) -> dict[str, Any]:
    script = _final_message_text(state) or str(state.get("final_response") or "").strip()
    if not script:
        script = "답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요."

    _writer()(
        {
            "type": "speech_text",
            "text": script,
            "session_id": state.get("session_id"),
            "turn_id": state.get("turn_id"),
        }
    )
    return {"final_response_script": script}


def _speech_synthesis_node(speech_synthesis_node: SpeechSynthesisNode) -> Any:
    async def invoke_speech_synthesis_node(
        state: ChatTurnState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        text = str(state.get("final_response_script") or "").strip()
        if not text:
            return {}

        writer = _writer()
        tts_configured: bool | None = None
        request = SpeechSynthesisRequest(
            session_id=str(state.get("session_id") or ""),
            turn_id=str(state.get("turn_id") or ""),
            text=text,
        )
        async for event in speech_synthesis_node.stream_speech(request):
            if event.get("type") == "tts.completed":
                tts_configured = bool(event.get("configured"))

            payload = _speech_synthesis_payload(event)
            if payload is not None:
                writer(payload)

        return {"tts_configured": tts_configured} if tts_configured is not None else {}

    return invoke_speech_synthesis_node


def _writer() -> Any:
    try:
        return get_stream_writer()
    except RuntimeError:
        return lambda _: None


def _final_message_text(output: dict[str, Any]) -> str:
    for message in reversed(output.get("messages") or []):
        if getattr(message, "type", None) == "ai":
            text = _message_text(message)
            if text:
                return text
    return ""


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


def _speech_synthesis_payload(event: dict[str, Any]) -> dict[str, Any] | None:
    event_type = event.get("type")
    if event_type == "tts.audio.chunk":
        return {
            "type": "audio",
            "audio_base64": event.get("audio_base64"),
            "mime_type": event.get("mime_type"),
            "chunk_index": event.get("chunk_index"),
            "byte_length": event.get("byte_length"),
        }

    if event_type == "tts.completed":
        return {
            "type": "audio_done",
            "chunks": event.get("chunks", 0),
            "configured": event.get("configured"),
        }

    if event_type == "error":
        return {
            "type": "error",
            "code": event.get("code") or "tts_failed",
            "message": event.get("message") or "음성 합성 중 오류가 발생했습니다.",
        }

    logger.debug("ignored speech synthesis event=%s", event_type)
    return None
