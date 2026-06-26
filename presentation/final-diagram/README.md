# Final Diagram Artifacts

이 디렉터리는 발표용 최종 아키텍처 다이어그램 원본을 보관합니다. Eraser 전용 MCP/API는 현재 세션에 노출되어 있지 않아, repo-diagrammer 스킬 기준에 맞춰 Eraser diagram-as-code 파일로 작성했습니다.

## Generated Files

| 파일 | 목적 |
| --- | --- |
| `01-integrated-high-level-architecture.eraserdiagram` | 전체 프로젝트 통합 하이레벨 아키텍처. active frontend/BFF, backend agent runtime, tool registry/profile, RAG/MCP, graph data layer, external provider를 큰 덩어리로 표시합니다. |
| `01-integrated-high-level-architecture_simplified.eraserdiagram` | 슬라이드 삽입용 단순화 버전. 16:9 슬라이드에서 가로로 과하게 길어지지 않도록 active frontend, BFF, backend agent loop, runtime capabilities 4단으로 축약합니다. |
| `02-backend-agent-harness-architecture.eraserdiagram` | backend 서비스 내부 구조. Django SSE boundary, ChatGraphRunner, LangGraph node, agent factory, tool registry, provider, stream contract를 표시합니다. |
| `03-backend-agent-runtime-sequence.eraserdiagram` | 한 번의 `/chat` 요청이 Main Agent, tool, Screen Control Agent, Speech Text Agent, TTS node를 거쳐 UI로 돌아오는 sequence를 표시합니다. |
| `04-frontend-migration-architecture.eraserdiagram` | `frontend_migration` L2 아키텍처. App Router, chat page hooks, BFF adapter, workspace renderer, browser/provider runtime을 표시합니다. |
| `05-backend-agent-orchestrator-architecture.eraserdiagram` | `backend` L2 아키텍처. Django ASGI/SSE transport, LangGraph runtime, agent factories, tool registry/profile, provider layer를 표시합니다. |
| `06-external-mcp-architecture.eraserdiagram` | `external_mcp` L2 아키텍처. FastMCP runtime, registered tools, provider adapters, Naver/Firecrawl/TMAP external APIs를 표시합니다. |

## Mapping Depth

- `01`은 L1 top-level component map입니다.
- `01_simplified`는 발표 슬라이드용 L1 요약 map입니다.
- `02`는 backend L2 internal component map입니다.
- `03`은 backend runtime request/data-flow sequence입니다.
- `04`, `05`, `06`은 서비스별 L2 component map입니다.
- 함수·클래스 단위 L3 상세도는 발표용 하이레벨 목적에서 제외했습니다.

## Sources Inspected

| Source | Used for |
| --- | --- |
| `README.md` | 프로젝트 목적, active frontend, 서비스 구성, 실행/검증 흐름 |
| `deploy/docker/docker-compose.yml` | Docker 통합 topology, backend/RAG/Memgraph/Redis wiring |
| `frontend_migration/README.md` | active `/chat`, `/api/chat`, `/mocks`, env boundary |
| `frontend_migration/src/app/api/chat/route.ts` | Next.js BFF route entrypoint |
| `frontend_migration/src/bff/chat/route.ts` | UIMessage request, application state metadata, backend stream merge |
| `frontend_migration/src/bff/chat/backend-chat-stream-adapter.ts` | backend SSE to UIMessage/data part mapping |
| `frontend_migration/src/bff/chat/workspace-command-schema.ts` | Zod validation for workspace commands |
| `frontend_migration/src/page/chat/hooks/*.ts` | chat session, page controller, dictation, TTS playback, workspace controller |
| `frontend_migration/src/ui/components/chat/workspace_root/*` | typed workspace state, reducer, renderer boundary |
| `frontend_migration/src/ui/components/chat/workspace_surface/*` | concrete frontend workspace surfaces |
| `backend/README.md` | backend architecture and runtime event contract |
| `backend/src/django_backend/urls.py` | `/health`, `/api/system/dependencies`, `/chat/stream` SSE boundary |
| `backend/src/graph/graph.py` | LangGraph node topology and branch edges |
| `backend/src/graph/runner.py` | `ChatGraphRunner`, session activation, stream mode mapping |
| `backend/src/agents/*/agent.py` | main, screen control, speech text agent factory wiring |
| `backend/src/tools/profiles/*.json` | agent-specific tool profile boundaries |
| `backend/src/tools/from_mcp.py` | RAG and external MCP loader behavior |
| `backend/src/tools/screen_control_workspace.py` | local workspace command schema emitted by screen control agent |
| `rag/README.md` | RAG backend, MCP endpoint, Memgraph, Redis, RAG operations UI |
| `external_mcp/README.md` | Naver, Firecrawl, TMAP MCP provider scope |
| `external_mcp/src/app.py` | uvicorn ASGI app entrypoint |
| `external_mcp/src/server.py` | FastMCP server construction and tool registration |
| `external_mcp/src/external/*.py` | Naver, Firecrawl, TMAP provider adapters and response normalization |
| `external_mcp/src/settings.py` | external MCP env/config contract |

## Confirmed Dependencies

| Source | Target | Transport | Evidence |
| --- | --- | --- | --- |
| `frontend_migration /chat` | `frontend_migration /api/chat` | HTTP POST UIMessage | `frontend_migration/src/bff/chat/route.ts` |
| `frontend_migration chat page hooks` | workspace renderer | React state/reducer | `use-chat-page-controller.ts`, `workspace-state.ts` |
| `frontend_migration BFF adapter` | workspace command schema | Zod parse | `backend-chat-stream-adapter.ts`, `workspace-command-schema.ts` |
| `Next.js BFF /api/chat` | `backend /chat/stream` | HTTP POST + SSE | `backend-chat-stream-adapter.ts`, `backend/src/django_backend/urls.py` |
| `backend /chat/stream` | `ChatGraphRunner` | in-process async call | `backend/src/django_backend/urls.py` |
| `ChatGraphRunner` | `LangGraph ChatTurnState graph` | `astream(..., version="v2")` | `backend/src/graph/runner.py` |
| `LangGraph` | `main_agent` | graph node | `backend/src/graph/graph.py` |
| `LangGraph` | `screen_control_agent`, `speech_text_agent`, `speech_synthesis_node` | graph nodes | `backend/src/graph/graph.py` |
| `main_agent` | RAG MCP tools | LangChain MCP adapter | `backend/src/tools/profiles/main_agent.json`, `backend/src/tools/from_mcp.py` |
| `main_agent` | External MCP tools | LangChain MCP adapter | `backend/src/tools/profiles/main_agent.json`, `external_mcp/README.md` |
| `screen_control_agent` | local workspace tools | LangChain StructuredTool | `backend/src/tools/profiles/screen_control_agent.json`, `backend/src/tools/local.py` |
| `speech_synthesis_node` | ElevenLabs | SDK streaming | `backend/src/graph/graph.py`, `backend/README.md` |
| `backend tool registry` | `external_mcp` | Streamable HTTP MCP | `backend/src/tools/from_mcp.py`, `external_mcp/src/app.py` |
| `external_mcp FastMCP` | Naver Search API | HTTP GET | `external_mcp/src/server.py`, `external_mcp/src/external/naver.py` |
| `external_mcp FastMCP` | Firecrawl Search API | HTTP POST | `external_mcp/src/server.py`, `external_mcp/src/external/firecrawl.py` |
| `external_mcp FastMCP` | TMAP APIs | HTTP GET/POST | `external_mcp/src/server.py`, `external_mcp/src/external/tmap.py` |
| `RAG backend` | Memgraph | Bolt | `deploy/docker/docker-compose.yml`, `rag/README.md` |
| `RAG backend` | Redis | Redis URL | `deploy/docker/docker-compose.yml` |
| `RAG operations UI` | RAG backend | HTTP API | `deploy/docker/docker-compose.yml`, `rag/README.md` |

## DTO and Interface Boundaries

| Boundary | Object/schema/type | Evidence |
| --- | --- | --- |
| Browser to BFF | AI SDK `UIMessage`, `applicationState` | `frontend_migration/src/bff/chat/route.ts` |
| BFF to backend | `session_id`, `message`, `metadata.application_state` | `frontend_migration/src/bff/chat/route.ts`, `backend/src/django_backend/urls.py` |
| Backend to BFF | SSE events: `agent.text.*`, `agent.tool_call.*`, `speech_text.*`, `tts.*`, `node.updated`, `task.*` | `backend/src/graph/runner.py`, `backend/src/graph/graph.py` |
| Backend screen agent to frontend | workspace command payload | `backend/src/tools/screen_control_workspace.py`, `frontend_migration/src/bff/chat/workspace-command-schema.ts` |
| Main agent to RAG/External tools | LangChain `BaseTool` via MCP adapter | `backend/src/tools/from_mcp.py` |
| External MCP tool output | provider, success, count, results, warnings | `external_mcp/src/external/naver.py`, `external_mcp/src/external/firecrawl.py`, `external_mcp/src/external/tmap.py` |
| TMAP POI to frontend map surfaces | name, address, lon, lat, naver map URLs | `external_mcp/src/external/tmap.py`, `frontend_migration/src/ui/components/chat/workspace_surface/institution_results/*` |
| RAG backend to Memgraph | graph nodes and edges over Bolt | `rag/README.md`, `deploy/docker/docker-compose.yml` |

## Inferred or Presentation-Level Edges

- `frontend_migration` is the active UI in repository docs. The integrated diagram now focuses on active frontend/BFF surfaces and intentionally omits inactive UI surfaces.
- `External MCP` is documented as Naver/Firecrawl/TMAP provider scope. The exact deployed container wiring is not present in `deploy/docker/docker-compose.yml`, so it is shown as a tool/provider boundary rather than a compose service.
- Memgraph Lab is shown only as a direct graph inspection client for Memgraph. It is not drawn as a caller of the RAG Backend API or MCP endpoint.

## How To Use

1. Open Eraser.
2. Create a new diagram from code.
3. Paste the contents of a `.eraserdiagram` file, including the first diagram type line.
4. Export PNG/SVG for the final presentation if needed.

## Follow-up Deep Diagrams

- RAG ingest pipeline and review queue internals.
- Frontend workspace reducer and surface rendering internals.
- External MCP provider tool internals for Naver, Firecrawl, and TMAP.
