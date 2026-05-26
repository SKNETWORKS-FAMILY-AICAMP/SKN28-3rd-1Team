# Streamlit

Streamlit 기반 법률 RAG 프론트엔드 작업 공간입니다.

## Runtime

- Python 3.13
- Streamlit
- Pydantic / pydantic-settings
- Pandas

## Layout

```text
streamlit/
├── src/
│   ├── app.py          # Streamlit entry point 및 페이지 네비게이션
│   ├── settings.py     # Streamlit 설정 단일 로딩 지점
│   └── pages/          # 화면별 렌더링 모듈
│       ├── home.py
│       ├── usecases.py
│       ├── json_schema.py
│       ├── mock_ui.py
│       ├── llm_parsing.py
│       └── design_notes.py
├── frontend_design.md
├── frontend_usecases.md
├── pyproject.toml
└── uv.lock
```

## Toolchain

이 디렉토리는 `uv`를 사용합니다.

```bash
uv sync
uv run streamlit run src/app.py
```

의존성 추가는 이 디렉토리 안에서 실행합니다.

```bash
uv add <package>
```

## 페이지 구성

- `src/app.py`: 사이드바 기반 페이지 네비게이션 메인
- `src/pages/home.py`: 사용자 검색 UI
- `src/pages/usecases.py`: 프론트엔드 유스케이스와 화면 요소 매핑
- `src/pages/json_schema.py`: 백엔드 응답 JSON 스키마 문서
- `src/pages/mock_ui.py`: mock response 기반 렌더링 테스트
- `src/pages/llm_parsing.py`: LLM 출력 파싱 테스트
- `src/pages/design_notes.py`: 질문 유형별 렌더링 / UX 노트

## 프론트 응답 JSON 스키마

프론트는 백엔드 응답을 다음과 같은 고정된 JSON 구조로 받는 것을 권장합니다.

```json
{
  "summary": "...",
  "details": ["..."],
  "laws": [{"name": "...", "article": "..."}],
  "table": {"headers": ["..."], "rows": [["...", "..."]]},
  "sources": ["..."],
  "warning": "..."
}
```

## 프론트 UI 설계 요약

- 응답 구조 고정 → Markdown 출력 대신 구조화된 JSON 기반 렌더링
- Streamlit 컴포넌트로 안정적으로 표시
  - `st.dataframe`, `st.expander`, `st.info`, `st.warning`, `st.chat_message`
- citation / 출처는 별도 패널로 분리
- 긴 답변은 `st.expander` 또는 `st.tabs`로 접기

## mock response 기반 테스트

현재 `src/pages/mock_ui.py`가 mock 데이터를 사용한 렌더링 예시입니다. 백엔드가 준비되지 않은 상태에서도 UI를 검증할 수 있습니다.

## 추가 문서

- `frontend_design.md`: 프론트 설계 가이드 문서
- `frontend_usecases.md`: 사용자 유스케이스와 렌더링 화면 요소 매핑 문서

## Environment

- 예시 파일: `.env.example`
- 실제 로컬 환경 파일: `.env` (커밋 금지)
- 환경 변수는 `STREAMLIT_` prefix를 사용하며 `src/settings.py`에서 pydantic-settings로 로딩합니다.
