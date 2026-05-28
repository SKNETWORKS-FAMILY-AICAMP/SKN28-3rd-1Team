from __future__ import annotations

from langchain.agents import create_agent
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field, ValidationError

from agent.openrouter_llm import get_chat_llm
from agent.tool import get_tools
from prompt import create_clarification_prompt, render_prompt
from schemas.chat import (
    ChatRequest,
    ChatResponse,
    ClarificationOption,
    EvidenceStatus,
    QuestionType,
    ResponseKind,
)

from session_store import ConversationTurn
from settings import settings
from logger import get_logger

logger = get_logger(__name__)
FOLLOW_UP_CONTEXT_TURNS = 2
FOLLOW_UP_CONTEXT_CHARS = 240

# Main Agent 생성
def create_main_agent():
    system_prompt = render_prompt("system_prompt.j2")
    return create_agent(
        model=get_chat_llm(),
        tools=get_tools(),
        system_prompt=system_prompt,
    )
    
# 사용자 메세지를 Main Agent에 전달하고, 최종 텍스트 답변 반환
def run_agent(message:str) -> str:
    agent = create_main_agent()
    result = agent.invoke(
        {
            "messages" : [
                {
                    "role" : "user",
                    "content" : message
                }
            ]
        }
    )
    return result["messages"][-1].content





# LLM이 생성한 보기 3개 파싱 출력 모델
class ClarificationOptionOutput(BaseModel):
    options : list[ClarificationOption] = Field(..., min_length=3, max_length=3)

# 사용자 기본정보를 prompt에 넣을 문자열로 변환
def _profile_context(request: ChatRequest) -> str:
    profile = request.user_profile
    if profile is None:
        return "사용자 기본정보 없음"

    location = profile.location
    location_text = "위치 정보 없음"
    if location:
        parts = [location.city, location.district, location.town]
        location_text = " ".join(part for part in parts if part) or "위치 정보 없음"

    return "\n".join(
        [
            f"나이 : {profile.age if profile.age is not None else '미입력'}",
            f"거주지 : {location_text}",
            f"월소득 : {profile.monthly_income_krw if profile.monthly_income_krw is not None else '미입력'}원",
            f"가구원 수 : {profile.household_size if profile.household_size is not None else '미입력'}",
            f"소득 메모 : {profile.income_note or '없음'}",
        ]
    )


# 텍스트에 지정한 키워드 중 하나라도 들어있는지 확인
def _contains_any(text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in text for keyword in keywords)


# 질문 의도에 따라 RAG 검색에 보조로 붙일 사용자 정보 조건 선정
def _profile_search_terms(request: ChatRequest, primary_text: str) -> list[str]:
    profile = request.user_profile
    if profile is None:
        return []

    terms: list[str] = []
    normalized = primary_text.replace(" ", "")

    age_keywords = ("나이", "연령", "대상", "자격", "조건", "노인", "어르신", "고령", "시니어")
    income_keywords = ("소득", "중위소득", "재산", "가구", "수급", "기초연금", "지원금", "자격", "조건", "대상")
    location_keywords = (
        "지역",
        "거주",
        "동네",
        "근처",
        "주변",
        "지자체",
        "시청",
        "구청",
        "군청",
        "주민센터",
        "행정복지센터",
        "관할",
    )

    if profile.age is not None and _contains_any(normalized, age_keywords):
        terms.append(f"{profile.age}세")

    location = profile.location
    if location is not None:
        location_parts = [location.city, location.district, location.town]
        location_text = " ".join(part for part in location_parts if part)
        explicit_location = any(part and part.replace(" ", "") in normalized for part in location_parts)
        if location_text and (_contains_any(normalized, location_keywords) or explicit_location):
            terms.append(location_text)

    if _contains_any(normalized, income_keywords):
        if profile.monthly_income_krw is not None:
            terms.append(f"월소득 {profile.monthly_income_krw}원")
        if profile.household_size is not None:
            terms.append(f"{profile.household_size}인 가구")
        if profile.income_note:
            terms.append(profile.income_note)

    return terms

# 출처 표시용 긴 원문 -> 짧은 발췌문으로 축소
def _excerpt(text: str, limit: int = 500) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[: limit - 3]}..."


# 검색 쿼리 조각의 공백을 정리
def _normalize_query_part(text: str | None) -> str:
    return " ".join((text or "").split())


# 검색 쿼리 조각을 중복 없이 추가
def _append_unique_query_part(parts: list[str], text: str | None) -> None:
    normalized = _normalize_query_part(text)
    if normalized and normalized not in parts:
        parts.append(normalized)


# 긴 검색 쿼리를 설정된 길이 안으로 축소
def _trim_query_text(text: str, limit: int | None = None) -> str:
    max_chars = limit or settings.rag_search_query_max_chars
    normalized = text.strip()
    if len(normalized) <= max_chars:
        return normalized
    return normalized[: max_chars - 3].rstrip() + "..."


# 원 질문 + 선택/기타 의도 + 필요 맥락 = RAG 검색 쿼리 생성
def _build_rag_query(request: ChatRequest, context: str | None = None) -> str:
    primary_terms: list[str] = []
    _append_unique_query_part(primary_terms, request.question)

    if request.selected_option is not None:
        selected = request.selected_option
        _append_unique_query_part(primary_terms, selected.search_focus or selected.title)

    if request.custom_intent:
        _append_unique_query_part(primary_terms, request.custom_intent)

    primary_text = " ".join(primary_terms)
    lines = [primary_text]

    normalized_context = _normalize_query_part(context)
    if normalized_context:
        lines.append(f"이전 맥락: {_trim_query_text(normalized_context, FOLLOW_UP_CONTEXT_CHARS)}")

    profile_terms = _profile_search_terms(request, primary_text)
    if profile_terms:
        lines.append(" ".join(profile_terms))

    return _trim_query_text("\n".join(line for line in lines if line))


# RAG tool 연결 전까지 검색 질문을 확인할 수 있는 임시 답변을 만든다.
def _tool_pending_response(query: str, question_type: QuestionType) -> ChatResponse:
    return ChatResponse(
        kind=ResponseKind.ANSWER,
        question_type=question_type,
        summary="RAG 검색 도구 연결이 필요합니다.",
        details=[f"검색에 사용할 질문: {query}"],
        confidence=0.0,
        evidence_status=EvidenceStatus.INSUFFICIENT,
        warning="agent/tool.py의 LangChain tool 연결 후 최종 답변 생성이 가능합니다.",
    )


# LLM 보기 생성 실패 시, 사용할 기본 보기 3개 반환
def _fallback_options() -> list[ClarificationOption]:
    return [
        ClarificationOption(
            id="1",
            title="복지서비스 찾기",
            description="받을 수 있는 복지서비스와 신청 방법을 찾습니다.",
            search_focus="노인 복지서비스 지원 대상 신청 방법",
        ),
        ClarificationOption(
            id="2",
            title="요양원/돌봄시설 찾기",
            description="요양원, 돌봄시설, 입소 조건을 찾습니다.",
            search_focus="요양원 노인요양시설 돌봄시설 입소 조건",
        ),
        ClarificationOption(
            id="3",
            title="소득 기준 혜택 찾기",
            description="소득 기준에 맞는 지원금과 혜택을 찾습니다.",
            search_focus="노인 소득 기준 복지 혜택 지원금",
        ),
    ]

# 사용자 질문에 맞는 선택 보기 3개 LLM으로 생성
def generate_clarification_options(request: ChatRequest) -> list[ClarificationOption]:
    parser = PydanticOutputParser(pydantic_object=ClarificationOptionOutput)
    prompt = create_clarification_prompt()

    try:
        chain = prompt | get_chat_llm() | parser
        result = chain.invoke(
            {
                "question" : request.question,
                "profile_context" : _profile_context(request),
                "format_instructions" : parser.get_format_instructions(),
            }
        )
        return result.options[: settings.agent_clarification_option_count]
    except Exception:
        logger.exception("clarification option generation failed")
        return _fallback_options()

# 최초 질문에 대해 보기 선택 응답 생성
def create_clarification_response(request: ChatRequest) -> ChatResponse:
    return ChatResponse(
        kind=ResponseKind.CLARIFICATION,
        question_type=QuestionType.BROAD_OR_AMBIGUOUS,
        summary="질문 범위를 먼저 좁혀 주세요.",
        details=[
            "아래 보기 중 가장 가까운 항목을 선택해 주세요.",
            "해당하는 보기가 없으면 기타에 직접 입력해 주세요.",
        ],
        options=generate_clarification_options(request),
        allow_custom_input=settings.agent_custom_input_enabled,
        confidence=None,
        evidence_status=EvidenceStatus.NOT_APPLICABLE,
    )

# 사용자가 보기 1~3 중 하나를 선택 시, RAG 기반 답변 생성
def answer_with_selected_option(
    request: ChatRequest,
    history: list[ConversationTurn] | None = None,
) -> ChatResponse:
    selected = request.selected_option

    if selected is None:
        return ChatResponse(
            kind=ResponseKind.ANSWER,
            question_type=QuestionType.SEARCH,
            summary="선택한 보기가 없습니다.",
            confidence=0.0,
            evidence_status=EvidenceStatus.INSUFFICIENT,
            warning="selected_option이 없어 답변을 생성할 수 없습니다.",
        )

    query = _build_rag_query(request)
    return _tool_pending_response(query, QuestionType.SEARCH)

# 사용자가 기타 의견을 직접 입력 시, RAG 기반 답변 생성
def answer_with_custom_intent(
    request: ChatRequest,
    history: list[ConversationTurn] | None = None,
    context: str | None = None,
) -> ChatResponse:
    query = _build_rag_query(request, context)
    return _tool_pending_response(query, QuestionType.CUSTOM_INTENT)

# 후속 질문 + 이전 대화 맥락 = RAG 기반 답변 생성
def answer_with_follow_up(
    request: ChatRequest,
    history: list[ConversationTurn] | None = None,
) -> ChatResponse:
    recent_context = _recent_user_context(history)
    follow_up_intent = request.custom_intent or request.question

    request = request.model_copy(
        update={
            "custom_intent": follow_up_intent,
        }
    )
    response = answer_with_custom_intent(request, history, context=recent_context)
    return response.model_copy(update={"question_type": QuestionType.FOLLOW_UP})

# 이전 대화 기록을 prompt에 넣을 문자열로 변환
def _history_text(history: list[ConversationTurn] | None) -> str:
    if not history:
        return "이전 대화 없음"

    return "\n".join(
        f"{turn.role} : {turn.content}"
        for turn in history[-6:]
    )


# 최근 사용자 발화만 모아 후속 질문 검색 맥락으로 생성
def _recent_user_context(history: list[ConversationTurn] | None) -> str:
    if not history:
        return ""

    user_turns: list[str] = []
    for turn in reversed(history):
        if turn.role != "user":
            continue
        text = _normalize_query_part(turn.content)
        if text:
            user_turns.append(_trim_query_text(text, FOLLOW_UP_CONTEXT_CHARS // 2))
        if len(user_turns) >= FOLLOW_UP_CONTEXT_TURNS:
            break

    return _trim_query_text(" | ".join(reversed(user_turns)), FOLLOW_UP_CONTEXT_CHARS)
