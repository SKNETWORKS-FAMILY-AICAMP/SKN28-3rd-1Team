# Chat Workspace Surface Plan

Status: draft for discussion

## Purpose

`frontend_migration`의 `/chat` 오른쪽 workspace를 어떤 surface 묶음으로 구성할지 정리한다.

이 문서는 임의로 유스케이스를 새로 만든 문서가 아니다. 아래 레퍼런스에서 확인한 기존 구조, mock scene, backend/RAG/MCP 데이터 경계를 바탕으로 workspace surface 후보와 책임 경계를 잡는다.

## References Checked

### Legacy frontend

- `frontend/src/app/chat_page/chat-page-client.tsx`
  - 기존 오른쪽 workspace에 강남구 노인일자리 기관, 문서 레퍼런스, 지도/목록/detail 상태가 하드코딩되어 있었다.
  - `isProfileStep`, `tab`, `selectedId`, `showDocuments`, `showDocumentDetail`, `selectedDocumentId` 같은 page-local state가 workspace 화면을 직접 제어했다.
  - 상담 시작 직후 특정 지역/주제 결과가 보이는 문제의 출처다.
- `frontend/src/app/mocks/mock-scenes.tsx`
  - `chat-start`, `profile-form`, `map-results`, `list-results`, `document-references` scene이 이미 있었다.
  - 이 scene들은 workspace surface 후보를 검증하기 위한 직접적인 레거시 기준이다.
- `frontend/src/features/chat/components/chat-empty-state.tsx`
  - 생년, 거주지, 추천 질문 입력이 empty chat state에 있었다.
- `frontend/src/lib/mock-legal.ts`
  - 기초연금, 노인복지, 노인일자리, 연령차별, 퇴직금 같은 상담 도메인 예시가 있었다.

### Frontend migration

- `frontend_migration/src/page/mocks/scenes.ts`
  - 레거시와 같은 scene 이름이 남아 있다.
  - 현재는 `character-animation`을 제외하면 placeholder 성격이다.
- `frontend_migration/src/page/mocks/scene-page.tsx`
  - mock scene은 이후 workspace surface catalog를 확인하는 장소로 쓰기 적합하다.
- `frontend_migration/src/bff/chat/contract.ts`
  - 현재 chat stream은 대화, trace, 음성 상태 중심이고 workspace 화면 변경 흐름은 아직 분리되어 있지 않다.
- `frontend_migration/src/bff/chat/backend-chat-stream-adapter.ts`
  - screen control 계열 정보는 현재 workspace 화면을 직접 바꾸지 않는다.

### 2026 Seoul Big Data reference

- `reference/2026_seoul_big_data/docs/architectural-decisions/01-agent-tool-rendering-boundaries.md`
  - Agent는 React/DOM을 직접 렌더링하지 않는다.
  - 외부 API 결과는 화면에서 쓰기 좋은 정보로 정리한 뒤 보여준다.
  - surface는 미리 정해둔 화면 상태를 받아 렌더링한다.
- `reference/2026_seoul_big_data/docs/architectural-decisions/02-use-case-component-coverage.md`
  - 유스케이스별 필요한 surface를 먼저 정리하고, 실제 구현은 surface catalog와 state controller로 연결한다.
  - 지도, 후보 카드, 상세 패널, 근거/source, progress, 공유/요약 같은 surface 범주가 정리되어 있다.
- `reference/2026_seoul_big_data/docs/architectural-decisions/03-agent-controller-tool-contract.md`
  - controlled generative UI 방향이다.
  - agent가 임의 화면을 만드는 것이 아니라, 정해진 화면 상태를 바꾸는 방향으로 설계되어 있다.
- `reference/2026_seoul_big_data/docs/architectural-decisions/05-agent-runtime-and-frontend-tools.md`
  - 현재 UI shell과 실제 agent runtime을 분리한다.
  - frontend tool은 browser/controller에서 실행되고 React state를 바꾼다.
- `reference/2026_seoul_big_data/state/agent-ui-store.tsx`
  - shared UI state가 surface rendering의 source of truth가 되는 패턴을 사용한다.
  - `frame`, `route`, `selection`, `voice` 같은 상태를 store가 들고, 화면은 이 상태를 보고 렌더링한다.
  - 사용자의 선택도 대화 메시지로 다시 보내는 것이 아니라 selection state에 반영한다.
- `reference/2026_seoul_big_data/components/tiling-manager/agent-scenarios.md`
  - 사용자 요청에 따라 surface 조합과 layout을 바꾸는 시나리오가 정리되어 있다.
- `reference/2026_seoul_big_data/agent/tools/ui-modification/README.md`
  - main agent가 frontend state를 바꾸기 위해 호출하는 UI state tool 경계가 정리되어 있다.
  - 진행 상태 표시는 main agent tool registry에서 제외한다.
- `reference/2026_seoul_big_data/frames/use-main-agent-chat-endpoint.ts`
  - frontend가 compact UI snapshot을 agent request context에 포함한다.
  - agent는 이 snapshot을 보고 다음 화면 상태 변경을 판단할 수 있다.

### A2UI / AG-UI reference

- `reference/a2ui-agui-demo/flow.md`
  - backend가 main workspace를 직접 렌더링하지 않는다.
  - frontend tool handler가 shared state를 업데이트하고 workspace component가 그 state를 렌더링한다.
  - workspace 안의 사용자 선택은 action/state로 agent loop에 다시 전달된다.

### Backend / RAG / External MCP

- `backend/src/agents/main_agent/system_prompt.j2`
  - main agent는 화면 제어, frontend component, tool invocation JSON을 직접 만들지 않는다.
  - 화면 제어는 별도 화면 제어 agent가 처리한다고 본다.
- `backend/src/tools/from_mcp.py`
  - MCP tool 이름은 LangChain-safe name으로 정규화된다.
  - 예: `tmap.search_poi`는 agent tool 이름에서 `tmap_search_poi`가 될 수 있다.
- `external_mcp/README.md`
  - `naver.search`, `web.search`, `tmap.search_poi`, `tmap.route_pedestrian` tool을 제공한다.
  - 장소 검색, 웹 출처, 보행 경로 데이터를 workspace surface의 원천 데이터로 쓸 수 있다.
- `rag/be/src/knowledge_runtime/schemas.py`
  - `SearchResult`는 `content`, `source_title`, `file_name`, `file_type`, `location`, `url`, `score`를 가진다.
  - 문서 근거 화면의 출처와 원문 일부를 구성하는 기준으로 쓰기 적합하다.

## Design Principles

1. `/chat` 진입 직후 특정 지역/정책 결과를 보여주지 않는다.
2. 기본 workspace는 로디/마스코트 중심의 default state로 시작한다.
3. Agent가 React component 이름이나 JSX를 직접 만들지 않는다.
4. Backend/RAG/MCP 결과는 화면에서 사용할 수 있는 상담, 지도, 문서 정보로 정리한 뒤 보여준다.
5. page layer는 화면 조립과 흐름 제어를 맡고, workspace component는 오른쪽 화면 표현에 집중한다.
6. workspace rendering component는 chat workspace component 영역에서 관리한다.
7. `/mocks`는 agent 없이 fixture state로 surface catalog를 확인하는 장소로 사용한다.
8. tool call, 검색, 분석, 실행 상태를 별도 workspace surface로 분리하지 않는다. 처리 중 표현은 로디/마스코트 animation state로 흡수한다.
9. 레거시 mock scene의 디자인 톤을 우선 존중한다. surface를 새로 만들더라도 원본 목업의 화면 밀도, 색감, 카드/지도 배치 감각을 출발점으로 삼는다.
10. 화면 변경은 상태 기반으로 이뤄진다. 렌더링은 frontend가 하고, backend agent는 현재 화면 상태를 본 뒤 제공된 state 변경 도구로 상태를 바꾼다.
11. AI agent는 이미 backend 관할이다. `frontend_migration`은 agent를 새로 만들지 않고, agent가 바꿀 수 있는 workspace state와 그 state를 렌더링하는 surface를 준비한다.

## Surface Catalog

| Surface | 근거 레퍼런스 | 목적 | 필요 정보 |
| --- | --- | --- | --- |
| `DefaultWorkspaceSurface` | `chat-start`, `character-animation` | 상담 시작 직후 기본 로디 화면 | mascot state, assistant status |
| `ProfileIntakeSurface` | legacy `profile-form`, `chat-empty-state` | 태어난 년도, 사는 곳 입력 | 원본 필드명과 현재 입력값 |
| `InstitutionResultsSurface` | legacy `map-results`, `list-results`, external MCP | 기관/시설/장소 후보를 지도/목록/detail로 확인 | 기관 이름, 위치, 연락처, 운영 정보 |
| `EvidenceDocumentsSurface` | legacy `document-references`, RAG `SearchResult` | 답변 근거 문서, 원문 일부, 출처 확인 | 문서명, 원문 일부, 위치, 링크 |
| `SelectionOptionsSurface` | 2026 `SelectionOption`, A2UI state flow | 여러 정책/기관/절차 후보 중 선택 | 선택 후보, 추천 이유, 출처 정보 |
| `ActionChecklistSurface` | main agent 답변 원칙, 상담 도메인 | 신청 절차, 필요 서류, 확인 항목 정리 | checklist items, due/required flags |

## Surface Details

### DefaultWorkspaceSurface

초기 화면이다. 상담이 시작되었다는 이유만으로 강남구 노인일자리 결과를 보여주면 안 된다.

역할:

- 로디 기본 상태 표시
- 대화 대기, 분석 중, 말하는 중 같은 visual state 수용
- 이후 3D avatar나 animation state를 붙일 자리 제공

기본 상태는 대기, 듣는 중, 생각하는 중, 말하는 중 같은 로디 행동 상태만으로 충분하다.

### ProfileIntakeSurface

사용자 상황 판단에 필요한 조건이 부족할 때만 열리는 surface다. 레거시처럼 초기 진입을 막는 gate로 쓰는 것은 보류한다.

역할:

- 원본 프론트엔드의 `태어난 년도` 입력
- 원본 프론트엔드의 `사는 곳` 입력
- agent가 필요한 확인 질문을 구조화해서 보여주기
- 입력 완료 후 workspace state와 chat agent context에 반영

원본 필드:

- `태어난 년도`
  - 예시 값: `1958`
  - 입력 안내: 숫자 4자리 연도
- `사는 곳`
  - 예시 값: `서울 강남구`
  - 입력 안내: 사용자의 거주 지역 또는 상담 기준 지역

### InstitutionResultsSurface

기관, 복지관, 주민센터, 병원, 일자리 수행기관 같은 장소 후보를 보여주는 surface다.

레거시의 `map-results`, `list-results`가 직접적인 기준이지만, 데이터는 하드코딩하지 않는다. `external_mcp`의 장소 검색 결과를 화면용 정보로 정리해서 사용한다.

필요 view:

- `map`: marker, selected place, viewport
- `list`: 비교 가능한 기관 목록
- `detail`: 전화, 주소, 운영시간, 신청 방법, 준비서류, 출처

Naver Maps SDK API key가 제공될 예정이므로, 지도 surface는 레퍼런스 코드베이스의 SDK 사용 방식과 원본 목업의 지도 배치 흐름을 기준으로 실제 지도 연결을 전제로 한다.

원본 mockup의 가짜 지도 영역은 Naver Maps JavaScript SDK가 렌더링하는 실제 지도 영역으로 교체한다. "지도 디자인을 얼마나 유지할 것인가"가 아니라, 기존 지도 placeholder 자리에 실제 Naver map을 넣는 것이 기준이다.

경로 polyline이나 full directions UI는 1차 범위가 아니다. 지도는 "여기에 있다"를 보여주는 장소 확인 중심이고, 이동 정보는 대략적인 시간과 권장 이동수단 정도로 제한한다.

### EvidenceDocumentsSurface

RAG 검색 결과와 답변 근거 chunk를 보여주는 surface다.

RAG 시스템은 문서를 파싱하고 chunking해 둔다. main agent는 질문과 관련된 chunk를 받아 답변하고, workspace는 그 근거 chunk 중 사용자가 확인할 수 있는 원문 일부를 보여준다.

내부 chunk id, score, row 같은 실행 세부값은 사용자 화면에 직접 노출하지 않는다. 문서명이나 출처명이 있으면 함께 보여주고, 없으면 원문 일부와 확인 가능한 출처 범위까지만 보여준다.

필요 view:

- evidence list
- selected evidence detail
- 관련 chunk의 원문 일부
- 문서명 또는 출처명
- 확인 가능한 위치 또는 링크

### SelectionOptionsSurface

사용자가 선택해야 하는 후보를 보여주는 surface다.

예시:

- 가능한 복지 서비스 후보
- 가까운 기관 후보
- 신청 방식 후보
- 법률/복지 상담 다음 행동 후보

각 option에는 왜 추천되는지와 어떤 source에 근거하는지가 붙어야 한다. 2026 레퍼런스의 `SelectionOption` 방향과 맞다.

### ActionChecklistSurface

답변을 듣고 실제로 해야 할 일을 정리하는 surface다.

예시:

- 신청 전 확인 항목
- 준비 서류
- 방문 전 전화 확인
- 접수 기간 확인
- 추가로 확인해야 하는 조건

레거시에 완성된 화면은 없지만, main agent가 다루는 상담 도메인과 잘 맞는다.

제외:

- polyline 기반 길찾기
- turn-by-turn 경로 안내
- 복잡한 route comparison
- 지도 위 경로 편집

## Interaction Notes

### Tool progress

tool call, 검색, 분석, 실행 중 상태는 workspace surface catalog에서 제외한다.

이 상태는 다음 방식으로 표현한다.

- 로디가 책을 읽는 상태
- 로디가 찾고 있는 상태
- 로디가 생각하는 상태
- 로디가 결과를 가져온 상태

즉, tool execution visibility는 trace/debug 영역이나 animation state의 책임이고, 오른쪽 workspace의 별도 surface로 만들지 않는다. 2026 레퍼런스에서도 진행 상태 전용 tool은 registry에서 제외되어 있다.

### Map scope

지도는 Naver Maps SDK 연결을 전제로 한다. API key는 별도로 주입한다.

1차 지도 범위는 기관/장소의 위치 확인이다. 길찾기 polyline, 상세 route editor, route comparison은 현재 범위에서 제외한다.

이동 정보는 "대략 얼마나 걸리는지", "무엇을 타고 가면 되는지", "방문 전 무엇을 확인해야 하는지" 정도의 접근 요약으로 둔다.

### State boundary

workspace를 바꾸는 지시는 React component 이름이나 JSX가 아니라 surface state 변경으로 표현한다.

기준 흐름:

1. frontend가 현재 workspace state의 compact snapshot을 agent request context에 포함한다.
2. backend agent는 대화 내용과 state snapshot을 함께 보고 다음에 보여줄 화면 상태를 판단한다.
3. agent는 frontend에 노출된 state 변경 도구를 호출한다.
4. frontend는 그 state를 반영하고, workspace surface는 변경된 state를 렌더링한다.
5. surface 내부에서 사용자가 고른 값은 대화 메시지가 아니라 selection/workspace state로 반영된다.

이 문서는 구체적인 tool 이름이나 event 이름을 확정하지 않는다. 중요한 결정은 state 기반 렌더링과 agent의 state 변경 권한이다.

## Mock Catalog Direction

`frontend_migration/src/page/mocks`는 workspace surface catalog로 확장한다.

기존 scene:

- `chat-start`
- `character-animation`
- `profile-form`
- `map-results`
- `list-results`
- `document-references`

추가 후보:

- `selection-options`
- `action-checklist`

단, 새 scene은 화면에 필요한 정보와 디자인 기준이 정리된 뒤 추가한다. 이름만 먼저 늘려서 placeholder를 만드는 것은 피한다.

## Suggested Discussion Order

1. `DefaultWorkspaceSurface`를 canonical 초기 화면으로 고정한다.
2. 원본 mockup의 지도 placeholder를 Naver Maps SDK 렌더링 영역으로 교체하는 화면 기준을 정한다.
3. `ProfileIntakeSurface`는 원본 필드인 `태어난 년도`, `사는 곳`만 우선 사용한다.
4. `EvidenceDocumentsSurface`는 RAG chunk의 원문 일부를 보여주는 방향으로 정한다.
5. `InstitutionResultsSurface`, `SelectionOptionsSurface`, `ActionChecklistSurface`의 조합 순서를 정한다.

## Confirmed Decisions

1. `AgentProgressSurface`는 만들지 않는다. 검색/분석/처리 중 표현은 로디 animation state로 흡수한다.
2. 지도는 Naver Maps JavaScript SDK 사용을 전제로 한다. API key는 별도 주입한다.
3. 경로 polyline, turn-by-turn directions, route comparison은 1차 범위가 아니다.
4. `ProfileIntakeSurface`의 기본 필드는 원본 프론트엔드의 `태어난 년도`, `사는 곳`이다.
5. RAG evidence detail은 문서 부가정보 화면이 아니라 관련 chunk의 원문 일부를 보여주는 화면이다.
6. workspace 화면 변경은 state 기반이다. backend agent가 state를 보고 state 변경 도구를 호출하고, frontend가 그 state를 렌더링한다.
7. surface 내부 사용자 선택은 대화 메시지로 되돌리지 않고 selection/workspace state로 반영한다.
