from __future__ import annotations

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from agent.openrouter_llm import get_chat_llm
from schemas.chat import(
    ChatRequest,
    ChatResponse,
    ClarificationOption,
    QuestionType,
    ResponseKind,
)
from settings import settings

class ClarificationOptionOutput(BaseModel):
    options : list[ClarificationOption] = Field(..., min_length=3, max_length=3)

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

def _build_rag_query(request: ChatRequest) -> str:
    lines = [
          f"사용자 질문: {request.question}",
          "",
          "사용자 기본정보:",
          _profile_context(request),
      ]

    if request.selected_option is not None:
        selected = request.selected_option
        lines.extend(
            [
                "",
                "사용자가 선택한 보기:",
                f"- 제목: {selected.title}",
                f"- 검색 의도: {selected.search_focus or selected.title}",
            ]
        )

    if request.custom_intent:
        lines.extend(
            [
                "",
                "사용자가 기타로 입력한 의도:",
                f"- {request.custom_intent}",
            ]
        )

    return "\n".join(lines)

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

def generate_clarification_options(request: ChatRequest) -> list[ClarificationOption]:
    parser = PydanticOutputParser(pydantic_object=ClarificationOptionOutput)

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
"""
너는 노인복지 RAG 상담 Agent의 질문 해석 모듈이다.

역할:
- 사용자의 질문이 넓거나 모호할 때 답변하지 말고 보기 3개를 만든다.
- 보기는 사용자가 실제로 찾을 가능성이 높은 방향이어야 한다.
- 노인복지, 복지서비스, 요양시설, 지역 정책, 소득 기준 혜택 관점으로 해석한다.
- 법령이나 정책 내용을 단정하지 않는다.
- 사용자가 고르기 쉬운 짧고 쉬운 표현을 쓴다.
- 기타 입력은 프론트에서 별도로 제공하므로 options에는 포함하지 않는다.

반드시 JSON 형식만 출력한다.
{format_instructions}
""",
            ),
            (
                "human",
"""
사용자 질문:{question}
사용자 기본 정보 : {profile_context}
보기 3개를 생성해줘.
""",
            ),
        ]
    )

    chain = prompt | get_chat_llm() | parser

    try:
        result = chain.invoke(
            {
                "question" : request.question,
                "profile_context" : _profile_context(request),
                "format_instructions" : parser.get_format_instructions(),
            }
        )
        return result.options[: settings.agent_clarification_option_count]
    except Exception:
        return _fallback_options()

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
    )

def answer_with_selected_option(request: ChatRequest) -> ChatResponse:
    selected = request.selected_option

    if selected is None:
        return ChatResponse(
            kind=ResponseKind.ANSWER,
            question_type=QuestionType.SEARCH,
            summary="선택한 보기가 없습니다.",
            warning="selected_option이 없어 답변을 생성할 수 없습니다.",
        )

    query = _build_rag_query(request)

    return ChatResponse(
        kind=ResponseKind.ANSWER,
        question_type=QuestionType.SEARCH,
        summary="선택한 보기 기준으로 답변을 생성할 예정입니다.",
        details=[
            f"검색에 사용할 질문 : {query}",
            "다음 단계에서 이 query를 RAG 검색기에 넘기면 됩니다.",
        ],
        warning="아직 실제 RAG검색은 연결되지 않았습니다.",
    )

def answer_with_custom_intent(request: ChatRequest) -> ChatResponse:
    query = _build_rag_query(request)

    return ChatResponse(
        kind=ResponseKind.ANSWER,
        question_type=QuestionType.CUSTOM_INTENT,
        summary="기타 입력 기준으로 답변을 생성할 예정입니다.",
        details=[
            f"검색에 사용할 질문 : {query}",
            "기타 입력은 다시 보기 3개를 만들지 않고 바로 답변으로 갑니다.",
        ],
        warning="아직 실제 RAG검색은 연결되지 않았습니다.",
    )
