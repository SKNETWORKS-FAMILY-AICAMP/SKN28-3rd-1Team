# Streamlit

Streamlit 기반 Python 프레임워크 프로젝트입니다.

## Toolchain

이 디렉토리는 `uv`를 사용합니다.

```bash
uv sync
uv run streamlit run main.py
```

의존성 추가는 이 디렉토리 안에서 실행합니다.

```bash
uv add <package>
```

## 페이지 구성

- `main.py`: 페이지 네비게이션 메인
- `pages/home.py`: 사용자 검색 UI
- `pages/usecases.py`: 프론트엔드 유스케이스와 화면 요소 매핑
- `pages/json_schema.py`: 백엔드 응답 JSON 스키마 문서
- `pages/mock_ui.py`: mock response 기반 렌더링 테스트
- `pages/llm_parsing.py`: LLM 출력 파싱 테스트
- `pages/design_notes.py`: 질문 유형별 렌더링 / UX 노트

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

현재 `pages/mock_ui.py`가 mock 데이터를 사용한 렌더링 예시입니다. 백엔드가 준비되지 않은 상태에서도 UI를 검증할 수 있습니다.

## 추가 문서

- `frontend_design.md`: 프론트 설계 가이드 문서
- `frontend_usecases.md`: 사용자 유스케이스와 렌더링 화면 요소 매핑 문서

## Environment

- 예시 파일: `.env.example`
- 실제 로컬 환경 파일: `.env` (커밋 금지)
