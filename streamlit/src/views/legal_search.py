from __future__ import annotations

import json
from datetime import date
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import streamlit as st
from streamlit_geolocation import streamlit_geolocation

from .legal_data import FALLBACK_RESULT, LAW_SUMMARIES


EXAMPLE_SITUATIONS = [
    "장애인 지원 알려줘",
    "장애인 등록이 되어 있는데 받을 수 있는 지원이 궁금해요",
    "회사에서 장애 때문에 불이익을 받은 것 같아요",
    "국가유공자인 가족이 복지 혜택을 받을 수 있는지 알고 싶어요",
]

INTENT_OPTIONS = [
    {
        "label": "복지 서비스",
        "hint": "등록, 급여, 활동지원, 생활 지원",
        "follow_up": "어떤 지원을 받고 싶은지 알려주세요. 예: 활동지원, 교통비, 보조기기",
    },
    {
        "label": "고용 지원",
        "hint": "취업, 의무고용, 사업주 기준",
        "follow_up": "어떤 고용 문제인지 알려주세요. 예: 취업, 해고, 임금, 편의제공, 의무고용",
    },
    {
        "label": "차별/권리구제",
        "hint": "불이익, 편의제공 거부, 진정",
        "follow_up": "언제, 어디서, 어떤 불이익이 있었는지 짧게 적어주세요.",
    },
    {
        "label": "지역별 지원",
        "hint": "거주지 기준 지자체 사업",
        "follow_up": "확인할 시/군/구와 원하는 지원 분야를 알려주세요.",
    },
    {
        "label": "신청 절차",
        "hint": "대상, 서류, 처리 기간",
        "follow_up": "이미 신청하려는 제도나 기관명이 있으면 적어주세요.",
    },
]

AMBIGUOUS_WORDS = ["지원", "혜택", "도움", "신청", "받을 수"]
SPECIAL_CONDITION_OPTIONS = [
    {
        "question": "장애 등록이 되어 있나요?",
        "condition": "장애인 등록 완료",
    },
    {
        "question": "아직 장애 등록 전인가요?",
        "condition": "장애인 등록 전",
    },
    {
        "question": "국가유공자이신가요?",
        "condition": "국가유공자",
    },
    {
        "question": "국가유공자 가족이신가요?",
        "condition": "국가유공자 가족",
    },
    {
        "question": "근로자 입장에서 궁금하신가요?",
        "condition": "근로자",
    },
    {
        "question": "사업주 입장에서 궁금하신가요?",
        "condition": "사업주",
    },
    {
        "question": "신청이 거절되거나 중단된 적이 있나요?",
        "condition": "신청 거절 또는 중단 경험",
    },
    {
        "question": "긴급 지원이 필요한 상황인가요?",
        "condition": "긴급 지원 필요",
    },
]
QUESTION_FOCUS_WORDS = [
    "장애인",
    "국가유공자",
    "회사",
    "사업주",
    "근로자",
    "차별",
    "해고",
    "임금",
    "등록",
    "복지",
    "고용",
    "민원",
    "서류",
    "처리기간",
]
MIN_CLEAR_QUESTION_LENGTH = 22


@st.cache_data(ttl=3600)
def _reverse_geocode_region(latitude: float, longitude: float) -> str:
    params = urlencode(
        {
            "format": "jsonv2",
            "lat": latitude,
            "lon": longitude,
            "accept-language": "ko",
        }
    )
    request = Request(
        f"https://nominatim.openstreetmap.org/reverse?{params}",
        headers={"User-Agent": "SKN28-Streamlit-Legal-Assistant/0.1"},
    )
    with urlopen(request, timeout=5) as response:
        payload = json.loads(response.read().decode("utf-8"))

    address = payload.get("address", {})
    city = (
        address.get("city")
        or address.get("municipality")
        or address.get("province")
        or address.get("state")
    )
    district = address.get("borough") or address.get("city_district") or address.get("county")

    if city and district:
        return f"{city} {district}"
    return city or district or ""


def _is_ambiguous_question(question: str) -> bool:
    return bool(_get_clarification_context(question)["needs_clarification"])


def _get_clarification_context(question: str) -> dict[str, object]:
    stripped_question = question.strip()
    normalized_question = stripped_question.replace(" ", "").lower()
    reasons = []

    has_focus_word = any(
        word.replace(" ", "").lower() in normalized_question
        for word in QUESTION_FOCUS_WORDS
    )
    generic_word_count = sum(
        1 for word in AMBIGUOUS_WORDS if word.replace(" ", "") in normalized_question
    )

    if len(stripped_question) < MIN_CLEAR_QUESTION_LENGTH:
        reasons.append("질문이 짧아서 대상과 상황을 더 확인해야 합니다.")
    if generic_word_count and not has_focus_word:
        reasons.append("지원·혜택처럼 범위가 넓은 표현이 있어 주제를 먼저 좁혀야 합니다.")
    if not any(
        keyword.lower() in stripped_question.lower()
        for law in LAW_SUMMARIES
        for keyword in law["keywords"]
    ):
        reasons.append("현재 임시 법령 데이터와 바로 연결되는 핵심 단어가 적습니다.")

    suggestions = [
        "누가 겪는 일인지: 본인, 가족, 근로자, 사업주",
        "원하는 결과: 지원 신청, 법령 확인, 불이익 대응, 서류 확인",
        "진행 단계: 알아보는 중, 신청 전, 거절됨, 분쟁 발생",
        "특수 조건: 장애 등록 여부, 국가유공자 여부, 근로자/사업주 여부",
    ]

    return {
        "needs_clarification": bool(reasons),
        "reasons": reasons,
        "suggestions": suggestions,
    }


def _clear_pending_question() -> None:
    for key in [
        "pending_question",
        "pending_intent",
        "pending_age",
        "pending_region",
        "pending_conditions",
        "pending_clarification_context",
    ]:
        st.session_state.pop(key, None)


def _start_consultation(
    question: str,
    *,
    age: int | None = None,
    region: str = "",
    conditions: list[str] | None = None,
) -> None:
    if _is_ambiguous_question(question):
        st.session_state["pending_question"] = question
        st.session_state["pending_age"] = age
        st.session_state["pending_region"] = region
        st.session_state["pending_conditions"] = conditions or []
        st.session_state["pending_clarification_context"] = (
            _get_clarification_context(question)
        )
        st.session_state.pop("legal_result", None)
        return

    st.session_state["legal_result"] = _find_result(
        question,
        age=age,
        region=region,
        conditions=conditions or [],
    )
    _clear_pending_question()


def _collect_selected_conditions(
    key_prefix: str,
    *,
    default_conditions: list[str] | None = None,
) -> list[str]:
    default_conditions = default_conditions or []
    selected_conditions = []
    condition_cols = st.columns(2)
    for index, condition_option in enumerate(SPECIAL_CONDITION_OPTIONS):
        condition = str(condition_option["condition"])
        with condition_cols[index % 2]:
            if st.checkbox(
                str(condition_option["question"]),
                value=condition in default_conditions,
                key=f"{key_prefix}_{condition}",
            ):
                selected_conditions.append(condition)
    return selected_conditions


def _find_result(
    question: str,
    *,
    age: int | None = None,
    region: str = "",
    intent: str = "",
    conditions: list[str] | None = None,
) -> dict[str, object]:
    normalized_question = question.lower()
    scored_laws = []
    conditions = conditions or []

    for law in LAW_SUMMARIES:
        score = sum(
            1 for keyword in law["keywords"] if keyword.lower() in normalized_question
        )
        if law["category"].lower() in normalized_question:
            score += 1
        if score:
            scored_laws.append((score, law))

    if not scored_laws:
        result = dict(FALLBACK_RESULT)
        result["profile"] = _build_profile_summary(age, region, intent, conditions)
        return result

    scored_laws.sort(key=lambda item: item[0], reverse=True)
    matched_laws = [law for _, law in scored_laws[:3]]
    primary_law = matched_laws[0]

    return {
        "title": primary_law["name"],
        "summary": primary_law["summary"],
        "laws": [f"{law['name']} {law['articles']}" for law in matched_laws],
        "details": primary_law["details"],
        "sources": primary_law["sources"],
        "profile": _build_profile_summary(age, region, intent, conditions),
        "cases": [
            "관련 판례는 RAG/판례 데이터 연결 후 질문 의도에 맞춰 노출합니다.",
            "현재 화면에서는 판례 영역과 렌더링 구조만 먼저 확인합니다.",
        ],
    }


def _build_profile_summary(
    age: int | None,
    region: str,
    intent: str,
    conditions: list[str],
) -> list[str]:
    summary = []
    if age:
        summary.append(f"나이: {age}세")
    else:
        summary.append("나이: 미입력")

    if region.strip():
        summary.append(f"지역: {region.strip()}")
    else:
        summary.append("지역: 미입력")

    if intent:
        summary.append(f"질문 의도: {intent}")

    if conditions:
        summary.append(f"특수 조건: {', '.join(conditions)}")

    summary.append("연령 기준 필터링은 추후 정책 기준 확정 후 적용합니다.")
    return summary


def _calculate_age_from_birth_year(birth_year: int | None) -> int | None:
    if not birth_year:
        return None
    return date.today().year - birth_year


def _get_profile_inputs() -> tuple[int | None, str]:
    autofill_region = st.session_state.pop("pending_autofill_region", "")
    if autofill_region:
        st.session_state["region_input"] = autofill_region

    with st.container(border=True, key="profile_card"):
        st.markdown("#### 기본 정보")

        age_col, region_col, location_col, _ = st.columns([0.75, 1.125, 0.14, 1.175])
        with age_col:
            current_year = date.today().year
            selected_birth_year = st.selectbox(
                "태어난 연도",
                ["선택하세요", *range(current_year, 1899, -1)],
                index=0,
                key="birth_year_select",
            )
            if selected_birth_year == "선택하세요":
                birth_year = None
            else:
                birth_year = int(selected_birth_year)
        with region_col:
            region = st.text_input(
                "사는 지역",
                placeholder="예: 서울시 강남구",
                key="region_input",
            )
        with location_col:
            st.markdown(
                '<div class="location-button-spacer"></div>',
                unsafe_allow_html=True,
            )
            location = streamlit_geolocation()
            if location and location.get("latitude") and location.get("longitude"):
                st.session_state["user_location"] = location
                latitude = float(location["latitude"])
                longitude = float(location["longitude"])
                try:
                    detected_region = _reverse_geocode_region(latitude, longitude)
                except Exception:
                    detected_region = ""

                if detected_region:
                    if st.session_state.get("region_input") != detected_region:
                        st.session_state["pending_autofill_region"] = detected_region
                        st.rerun()

    return _calculate_age_from_birth_year(birth_year), region


def _render_popular_questions(age: int | None, region: str) -> None:
    cols = st.columns(2)
    for index, question in enumerate(EXAMPLE_SITUATIONS):
        with cols[index % 2]:
            if st.button(question, width="stretch"):
                _start_consultation(question, age=age, region=region, conditions=[])
                st.rerun()


def _render_result(result: dict[str, object]) -> None:
    with st.container(border=True):
        st.subheader(str(result["title"]))
        st.info(str(result["summary"]))

        law_tab, info_tab, case_tab, source_tab = st.tabs(
            ["관련 법령", "정보 정리", "판례", "출처"]
        )
        with law_tab:
            for law in result["laws"]:
                st.markdown(f"- **{law}**")
        with info_tab:
            for detail in result["details"]:
                st.markdown(f"- {detail}")
        with case_tab:
            for case in result.get("cases", ["판례 데이터 연결 후 표시합니다."]):
                st.markdown(f"- {case}")
        with source_tab:
            for source in result["sources"]:
                st.markdown(f"- {source}")

        st.warning("실제 법률 판단이나 신청 전에는 최신 법령과 담당 기관 안내를 확인하세요.")


def _render_intent_choices() -> None:
    pending_question = st.session_state.get("pending_question")
    if not pending_question:
        return

    pending_intent = st.session_state.get("pending_intent")
    with st.container(border=True):
        if not pending_intent:
            st.markdown("#### 1. 의도 선택")
            cols = st.columns(3)
            for index, intent_option in enumerate(INTENT_OPTIONS):
                intent = str(intent_option["label"])
                with cols[index % 3]:
                    if st.button(intent, width="stretch", key=f"intent_choice_{intent}"):
                        st.session_state["pending_intent"] = intent
                        st.session_state["pending_conditions"] = []
                        st.session_state.pop("legal_result", None)
                        st.rerun()
            return

        selected_option = next(
            option for option in INTENT_OPTIONS if option["label"] == pending_intent
        )
        st.markdown(f"#### 2. 추가 조건 확인: {pending_intent}")
        selected_conditions = _collect_selected_conditions(
            "pending_condition",
            default_conditions=st.session_state.get("pending_conditions", []),
        )

        st.divider()
        extra_detail = st.text_input(
            "추가 상황",
            placeholder=str(selected_option["follow_up"]),
            label_visibility="collapsed",
        )
        if st.button("상담 답변 보기", width="stretch"):
            refined_question = str(pending_question)
            if extra_detail.strip():
                refined_question = f"{refined_question} {extra_detail.strip()}"
            st.session_state["legal_result"] = _find_result(
                refined_question,
                age=st.session_state.get("pending_age"),
                region=st.session_state.get("pending_region", ""),
                intent=str(pending_intent),
                conditions=selected_conditions,
            )
            _clear_pending_question()
            st.rerun()

        if st.button("의도 다시 선택", width="stretch"):
            st.session_state.pop("pending_intent", None)
            st.session_state["pending_conditions"] = selected_conditions
            st.rerun()


def render_legal_search() -> None:
    st.markdown(
        """
        <section class="search-hero">
            <p class="eyebrow">상담 시작하기</p>
            <h1>법률 상담소</h1>
            <p class="hero-copy">법을 몰라도 괜찮습니다. 내가 겪은 상황을 적으면 관련 법령·정보·판례를 알려드립니다</p>
        </section>
        """,
        unsafe_allow_html=True,
    )

    age, region = _get_profile_inputs()

    with st.form("legal_search_form"):
        question = st.text_area(
            "상황 설명",
            key="legal_question",
            placeholder="예: 장애인 등록이 되어 있는데 서울에서 받을 수 있는 지원을 알고 싶어요.",
            label_visibility="collapsed",
            height=96,
        )
        submitted = st.form_submit_button("상담 시작", width="stretch")

    if submitted:
        if question.strip():
            _start_consultation(
                question,
                age=age,
                region=region,
                conditions=[],
            )
        else:
            st.warning("상황을 한두 문장으로 입력해 주세요.")

    _render_intent_choices()

    with st.container(key="example_section"):
        st.markdown("#### 예시 상황")
        _render_popular_questions(age, region)

    if "legal_result" in st.session_state:
        st.divider()
        _render_result(st.session_state["legal_result"])
