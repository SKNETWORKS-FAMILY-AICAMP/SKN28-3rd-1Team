from __future__ import annotations

import streamlit as st

from pages.design_notes import render_design_notes
from pages.home import render_home
from pages.json_schema import render_json_schema
from pages.llm_parsing import render_llm_parsing
from pages.mock_ui import render_mock_ui
from pages.usecases import render_usecases
from settings import settings

PAGES = {
    "Search": render_home,
    "Use Cases": render_usecases,
    "JSON Schema": render_json_schema,
    "Mock Response UI": render_mock_ui,
    "LLM Parsing Test": render_llm_parsing,
    "Design Notes": render_design_notes,
}


def render_sidebar() -> str:
    st.sidebar.title(settings.app_title)
    st.sidebar.caption("페이지 이동")
    page = st.sidebar.radio("선택하세요", list(PAGES.keys()))

    st.sidebar.markdown("---")
    st.sidebar.write(
        "Streamlit 기준으로 질문 입력, 응답 스키마, mock 렌더링, "
        "유스케이스를 함께 확인하는 프론트엔드 작업 공간입니다."
    )
    st.sidebar.caption(f"Backend API: {settings.backend_base_url}")

    return page


def main() -> None:
    st.set_page_config(page_title=settings.page_title, layout=settings.layout)
    selected_page = render_sidebar()
    PAGES[selected_page]()


if __name__ == "__main__":
    main()
