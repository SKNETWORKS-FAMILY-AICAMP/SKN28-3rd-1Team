from __future__ import annotations

import streamlit as st

from settings import settings
from structured_logging import configure_logging, get_logger
from views import render_legal_search, render_major_laws

logger = get_logger(__name__)

PAGES = {
    "내 상황 상담": render_legal_search,
    "주요 법령": render_major_laws,
}


def apply_styles() -> None:
    st.markdown(
        """
        <style>
        :root {
            --bg: #f7f9fc;
            --surface: #ffffff;
            --text: #1f2937;
            --muted: #667085;
            --line: #d8dee9;
            --accent: #0f766e;
            --accent-soft: #e6f4f1;
            --gold-soft: #fff7df;
        }

        .stApp {
            background:
                linear-gradient(180deg, #eef7f4 0, #f7f9fc 260px, #f7f9fc 100%);
            color: var(--text);
        }

        [data-testid="stSidebar"] {
            background: #ffffff;
            border-right: 1px solid var(--line);
            width: 16.5rem !important;
            min-width: 16.5rem !important;
        }

        [data-testid="stSidebarContent"] {
            width: 16.5rem !important;
            padding-left: 1rem;
            padding-right: 1rem;
        }

        [data-testid="stSidebar"] h1 {
            white-space: nowrap;
            font-size: 1.72rem;
            line-height: 1.15;
        }

        [data-testid="stSidebar"] [role="radiogroup"] label {
            border-radius: 8px;
            padding: 0.25rem 0.45rem;
        }

        .block-container {
            max-width: 1040px;
            padding-top: 3.2rem;
        }

        .search-hero {
            max-width: 780px;
            margin: 0 auto 1.5rem;
            text-align: left;
        }

        .search-hero h1 {
            margin: 0.25rem 0 0.75rem;
            font-size: 2.75rem;
            line-height: 1.18;
            letter-spacing: 0;
            color: #172033;
        }

        .hero-copy {
            margin: 0;
            max-width: 780px;
            color: var(--muted);
            font-size: 1.05rem;
            line-height: 1.7;
        }

        .eyebrow {
            margin: 0;
            color: var(--accent);
            font-weight: 700;
            letter-spacing: 0;
        }

        div[data-testid="stForm"] {
            max-width: 780px;
            margin: 0 auto 1.4rem;
            padding: 0;
            border: 0;
            background: transparent;
        }

        div[class*="st-key-profile_card"],
        div[class*="st-key-example_section"] {
            max-width: 780px;
            margin: 0 auto 1.4rem;
        }

        div[class*="st-key-profile_card"] div[data-testid="stVerticalBlockBorderWrapper"] {
            width: 100%;
            max-width: 100%;
            margin: 0;
        }

        div[data-testid="stTextInput"] input,
        div[data-testid="stNumberInput"] input,
        div[data-testid="stTextArea"] textarea {
            box-sizing: border-box;
            min-height: 44px;
            border: 1px solid var(--line);
            border-radius: 8px;
            background: var(--surface);
            box-shadow: none;
            font-size: 1.02rem;
            line-height: 1.4;
        }

        div[data-testid="stTextInput"],
        div[data-testid="stNumberInput"],
        div[data-testid="stTextArea"] {
            margin-bottom: 0.8rem;
            padding-bottom: 0.2rem;
            overflow: visible;
        }

        div[data-testid="stNumberInput"] > div,
        div[data-testid="stTextInput"] > div {
            min-height: 44px;
            overflow: visible;
        }

        div[data-testid="stNumberInput"] button {
            min-height: 44px;
            border-radius: 8px;
        }

        div[data-testid="stTextArea"] textarea {
            padding-top: 1rem;
        }

        .location-button-spacer {
            height: 1.75rem;
        }

        iframe[title="streamlit_geolocation.streamlit_geolocation"] {
            width: 54px !important;
            min-width: 54px !important;
            height: 54px !important;
            display: block;
            background: transparent !important;
            transform: scale(1.32);
            transform-origin: top left;
        }

        div[data-testid="stIFrame"] {
            width: 72px !important;
            min-width: 72px !important;
            height: 72px !important;
            overflow: hidden;
            background: transparent !important;
        }

        div[data-testid="stButton"] button,
        div[data-testid="stFormSubmitButton"] button {
            border-radius: 8px;
            border: 1px solid var(--line);
            font-weight: 700;
        }

        div[data-testid="stFormSubmitButton"] button {
            background: var(--accent);
            color: white;
            border-color: var(--accent);
        }

        div[data-testid="stVerticalBlockBorderWrapper"] {
            border-radius: 8px;
            border-color: var(--line);
            background: var(--surface);
        }

        div[data-testid="stVerticalBlockBorderWrapper"] [data-testid="stCaptionContainer"] {
            margin-bottom: -0.35rem;
        }

        .law-card-heading {
            margin-bottom: 0.35rem;
        }

        .law-card-heading p {
            margin: 0 0 0.15rem;
            color: var(--muted);
            font-size: 0.92rem;
            line-height: 1.2;
        }

        .law-card-heading h3 {
            margin: 0;
            color: var(--text);
            font-size: 1.45rem;
            line-height: 1.25;
            letter-spacing: 0;
        }

        .law-article-box {
            display: inline-block;
            margin: 0.25rem 0 0.75rem;
            padding: 0.55rem 0.75rem;
            border: 1px solid rgba(15, 118, 110, 0.18);
            border-radius: 8px;
            background: rgba(230, 244, 241, 0.62);
            color: var(--text);
            line-height: 1.35;
        }

        .law-article-box strong {
            color: var(--accent);
            margin-right: 0.35rem;
        }

        </style>
        """,
        unsafe_allow_html=True,
    )


def render_sidebar() -> str:
    st.sidebar.title(settings.app_title)
    page = st.sidebar.radio("선택하세요", list(PAGES.keys()), label_visibility="collapsed")

    st.sidebar.markdown("---")
    st.sidebar.caption(f"Backend API: {settings.backend_base_url}")

    return page


def main() -> None:
    configure_logging()
    logger.info("streamlit_app_started", page_count=len(PAGES))
    st.set_page_config(page_title=settings.page_title, layout=settings.layout)
    apply_styles()
    selected_page = render_sidebar()
    logger.info("streamlit_page_selected", page=selected_page)
    PAGES[selected_page]()


if __name__ == "__main__":
    main()
