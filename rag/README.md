# RAG

Memgraph 기반 GraphRAG, 문서 ingest, MCP query tool, RAG 운영 UI를 관리하는 독립 서브시스템입니다.

## Layout

```text
rag/
├── be/            # FastAPI RAG backend, MCP, ingest task layer, graph ingest runtime
├── fe/            # Bun + Vite + React RAG operations UI
├── docs/          # PRD and architecture docs
├── infra/         # Memgraph and Memgraph Lab Docker Compose
├── RAG_ORIGINAL_DATA/ # RAG 대상 원본 JSON 데이터
├── RAG_PREPROCESSED_DATA/ # RAG 입력용 TOON 전처리 데이터
├── sample_datas/  # Local sample text/JSON data
└── code_reference/ # Legacy/reference scripts kept out of runtime
```

## Services

### Backend

```bash
cd rag
make be-start
```

`make be-start`는 Varlock으로 `rag/be/.env.schema`를 검증하고 `uv sync`로
`rag/be/.venv`를 동기화한 뒤 RAG backend를 실행합니다. 실행 없이 venv만
준비하려면 `make be-sync`를 사용합니다.

External read-only MCP endpoint:

```text
http://127.0.0.1:8010/mcp
```

Internal graph ingest subagents import singleton LangChain tools from
`rag/be/src/tools/`. Runtime job/document context is bound in-process and those
tools are not exposed through MCP.

### Frontend

```bash
cd rag
make fe-start
```

Default FE URL:

```text
http://127.0.0.1:5173
```

Set `VITE_RAG_API_BASE_URL` in `rag/fe/.env` if the backend is not running on `http://127.0.0.1:8010`.

### Local Infra

```bash
cd rag
make infra-up
```

Default endpoints:

- Memgraph Bolt: `bolt://127.0.0.1:7687`
- Memgraph Lab: `http://127.0.0.1:3000`

## Docs

- `docs/memgraph_mcp_graphrag_prd.md`: Memgraph 기반 GraphRAG, MCP query server, 문서 ingest/그래프 확장 설계 PRD
- `docs/query_agent_tool_boundary_correction_prd.md`: query layer, subagent tool, Memgraph write ownership correction PRD
- `be/README.md`: Backend runtime, API, env, and test commands
- `infra/README.md`: Memgraph and Memgraph Lab Docker Compose usage

Makefile target이 있는 작업은 `make`를 우선 사용합니다. Raw `uv`, `bun`, `docker compose` 명령은 Makefile을 디버깅하거나 세부 옵션을 바꿔야 할 때 사용합니다. 현재 Python venv scope는 `rag/be/.venv`이며, `rag/fe`와 `rag/infra`는 Python venv를 사용하지 않습니다. Env field 계약은 `rag/be/.env.schema`, `rag/fe/.env.schema`, `rag/infra/.env.schema`에서 관리하며 `make env-check`로 검증합니다.
