import pandas as pd
import streamlit as st


RENDER_MAPPING = [
    {"질문 유형": "법률 질문", "추천 렌더링": "법 조항 카드"},
    {"질문 유형": "수치 질문", "추천 렌더링": "표"},
    {"질문 유형": "절차 질문", "추천 렌더링": "step UI"},
    {"질문 유형": "조건 질문", "추천 렌더링": "체크리스트"},
    {"질문 유형": "신청 방법 질문", "추천 렌더링": "링크/버튼"}
]


def render_design_notes() -> None:
    st.title("Design Notes")
    st.write("사용자가 실제 검색 인터페이스에서 편하게 사용할 수 있도록 질문 유형별 UI를 정리한 페이지입니다.")

    status = getattr(st, "status", None)
    if status:
        status("UI 설계 노트 확인 중")
    else:
        st.info("UI 설계 노트 확인 중")

    st.markdown("### 추천 Streamlit 컴포넌트")
    st.write(
        "- `st.chat_message`: 사용자/봇 대화형 인터페이스\n"
        "- `st.dataframe`: 수치/표 형태 응답 자동 렌더링\n"
        "- `st.expander`: 긴 답변 접기/펼치기\n"
        "- `st.tabs`: 상세, 출처, 원본 JSON 분리 보기\n"
        "- `st.status` 또는 `st.info`: 처리 상태 표시"
    )

    st.subheader("질문 유형별 UI 매핑")
    st.table(pd.DataFrame(RENDER_MAPPING))

    st.markdown("### 질문 유형별 렌더링 예시")
    st.write(
        "- 법률 질문 → 조항 카드\n"
        "- 수치 질문 → 표\n"
        "- 절차 질문 → 단계별 리스트\n"
        "- 조건 질문 → 체크리스트\n"
        "- 신청 방법 질문 → 링크/버튼"
    )

    st.markdown("### Citation UX")
    st.write(
        "- 출처는 별도 패널로 분리\n"
        "- 법령명, 조문, 원문 일부를 보여주는 카드 형태 추천\n"
        "- ‘출처 보기’ 버튼으로 확장 가능한 UI를 구성"
    )

    st.markdown("### 긴 답변 처리")
    st.write(
        "- 중요 정보는 상단에 요약 박스로 고정\n"
        "- 상세 답변은 `st.expander` 또는 `st.tabs`로 감춤\n"
        "- 긴 텍스트는 `st.markdown` 대신 리스트형 구조로 분리"
    )
