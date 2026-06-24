# Docs

프로젝트 문서를 관리하는 디렉토리입니다.

## 문서 목록

- `agent_guidelines/`: 에이전트 작업 흐름과 브랜치/커밋/PR 기준
  - `agent_workspace_guidelines.md`: AGENTS.md의 공통 규칙을 확장한 작업 가이드
- `backend_logging_policy.md`: backend logging level boundary, structured field 계약, 민감정보 logging 금지 기준
- `chat_route_boundary.md`: `/chat_page`, `/api/chat`, `/api/chat_page`, backend `/chat/stream`, static asset route 책임 경계
- `chat_thread_policy.md`: backend chat thread ownership, TTL, missing conversation id 처리 기준
- `issue_81_chat_page_ai_sdk_scope.md`: `/chat_page` sidebar chat의 AI SDK streaming/BFF 전환 작업 범위
- `llm_env_naming_convention.md`: LLM/agent/provider 환경 변수 naming convention과 Infisical 동기화 기준
- `requirement_list_ops.md`: 서버 계정별 Codex/MCP/secret/env bootstrap 요구사항
- `additional_docs/`: 온보딩, 도구 설정, 협업 참고 문서
  - `ai_agent_dependency_prereq_guide.docx`: AI 에이전트 의존성/사전 준비 가이드
  - `linear_mcp_token_setup_guide.docx`: Linear MCP 토큰 발급 및 Codex 연결 가이드
  - `linear_mcp_vscode_port_forwarding_guide.docx`: Linear MCP와 VS Code 포트 포워딩 가이드
  - `server_onboarding_human_guide.docx`: 사람에게 공유하는 서버 접속 온보딩 문서
  - `vscode_workspace_usage_guide.docx`: VS Code 워크스페이스 사용 가이드

문서 작성 원칙:

- 구조, 실행 방법, 협업 규칙이 바뀌면 관련 README와 함께 업데이트합니다.
- 결정 사항은 가능한 한 근거와 함께 남깁니다.
- README 파일은 Markdown 형식을 유지합니다.
