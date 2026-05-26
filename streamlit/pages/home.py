import streamlit as st

from pages.mock_ui import MOCK_RESPONSE, render_table


def render_home() -> None:
    st.title("검색하기 — 장애인·취약계층 법률 RAG")
    st.write(
        "질문을 입력하면 백엔드에서 받아올 JSON 응답을 기반으로 검색 결과를 보여줍니다."
    )

    question = st.text_input("궁금한 내용을 입력하세요", value="중소기업 장애인 의무고용 비율이 몇 %야?")

    if st.button("검색"):
        response = MOCK_RESPONSE
    else:
        response = {}

    if response:
        st.markdown("---")
        st.subheader("요약")
        st.info(response["summary"])

        st.subheader("상세 답변")
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
    else:
        st.info("질문을 입력하고 검색 버튼을 눌러 결과를 확인하세요.")
