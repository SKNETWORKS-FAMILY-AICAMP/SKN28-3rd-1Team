import pandas as pd
import streamlit as st


MOCK_SCENARIOS = {
    "기본 장애인 의무고용 정보": {
        "summary": "장애인 의무고용률은 공공기관 3.8%, 민간기업 3.1%입니다.",
        "details": [
            "상시근로자 50인 이상 사업장은 장애인 의무고용 대상입니다.",
            "의무고용률은 공공기관 3.8%, 민간기업 3.1%로 정해져 있습니다.",
            "미이행 시 장애인고용부담금이 부과될 수 있습니다."
        ],
        "laws": [
            {"name": "장애인고용촉진 및 직업재활법", "article": "제28조"},
            {"name": "장애인복지법", "article": "제15조"}
        ],
        "table": {
            "headers": ["구분", "의무고용률"],
            "rows": [["공공기관", "3.8%"], ["민간기업", "3.1%"]]
        },
        "sources": [
            "국가법령정보센터: 장애인고용촉진 및 직업재활법",
            "한국장애인고용공단: 장애인 의무고용 비율"
        ],
        "warning": "이 페이지는 mock response 기반 렌더링 예시입니다."
    },
    "절차 안내 예시": {
        "summary": "장애인 고용장려금 신청 절차는 온라인 접수와 서류 제출 두 단계로 구성됩니다.",
        "details": [
            "1단계: 지원 대상 여부 확인",
            "2단계: 제출 서류 준비",
            "3단계: 담당 기관에 신청서 제출"
        ],
        "laws": [{"name": "장애인복지법", "article": "제15조"}],
        "table": {
            "headers": ["단계", "내용"],
            "rows": [["1단계", "지원 대상 확인"], ["2단계", "서류 준비"], ["3단계", "신청서 제출"]]
        },
        "sources": ["복지로: 고용장려금 안내"],
        "warning": "실제 서비스에서는 백엔드의 최신 데이터를 사용해야 합니다."
    }
}

MOCK_RESPONSE = MOCK_SCENARIOS["기본 장애인 의무고용 정보"]


def render_table(table_data: dict[str, list]) -> None:
    headers = table_data.get("headers", [])
    rows = table_data.get("rows", [])
    if headers and rows:
        df = pd.DataFrame(rows, columns=headers)
        st.dataframe(df, use_container_width=True)


def render_mock_ui() -> None:
    st.title("Mock Response UI")
    st.write("백엔드 없이도 mock JSON을 기반으로 실제 렌더링을 테스트하는 페이지입니다.")

    scenario = st.selectbox("모의 시나리오 선택", list(MOCK_SCENARIOS.keys()))
    response = MOCK_SCENARIOS[scenario]

    with st.chat_message("user"):
        st.write(f"{scenario} 질문 시나리오")

    with st.chat_message("assistant"):
        st.write(response["summary"])

    st.subheader("요약")
    st.info(response["summary"])

    st.subheader("상세 내용")
    with st.expander("자세히 보기", expanded=True):
        for detail in response["details"]:
            st.markdown(f"- {detail}")

    if response.get("table"):
        st.subheader("자동 렌더링 표")
        render_table(response["table"])

    st.subheader("관련 법 조항")
    for law in response["laws"]:
        st.markdown(f"**{law['name']}** — {law['article']}")

    st.subheader("출처")
    for source in response["sources"]:
        st.markdown(f"- {source}")

    if response.get("warning"):
        st.subheader("주의 메시지")
        st.warning(response["warning"])
