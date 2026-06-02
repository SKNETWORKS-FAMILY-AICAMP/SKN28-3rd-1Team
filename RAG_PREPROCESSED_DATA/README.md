# RAG_PREPROCESSED_DATA

이 디렉터리는 `.toon` 전처리 문서를 사람이 검토 가능한 chunk `.toon` 파일로 나누고, chunk 사이의 관계를 Mermaid diagram으로 정리하기 위한 작업 공간이다.

여기서 chunk 산출물은 별도 형식의 annotation 결과가 아니라 원본 `.toon` 파일을 의미 단위로 쪼갠 `.toon` 파일이다.

상세 작업 규칙은 `workflow.md`를 따른다.

## 핵심 규칙

- `.toon` 원본 문서 1개마다 동일한 이름의 산출 디렉터리를 만든다.
- 산출 디렉터리에는 원본 `.toon` 복사본, `chunks/`, `relationships.md`를 둔다.
- `chunks/` 안에는 원본을 쪼갠 chunk `.toon` 파일들을 둔다.
- chunk 파일명은 작업 전에 사용자에게 물어보고 지정받는다.
- 각 chunk는 가능한 한 500 토큰 이하로 유지한다.
- 모든 chunk 생성 후 chunk 이름, 원본 파일 이름, relationship을 Mermaid diagram으로 정리한다.
- MCP server, graph DB 저장, embedding, retrieval 구현은 현재 scope가 아니다.

## 문서

- `instructions.md`: 다른 작업자 또는 agent에게 바로 전달할 수 있는 작업 지시문
- `workflow.md`: AI agent에게 chunk 생성과 관계 정리를 맡길 때의 세부 절차
- `rag_datas/`: 처리 대상 `.toon` 문서 위치
