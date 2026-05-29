# RAG Backend

FastAPI 기반 RAG backend입니다. 문서 ingest API, external read-only MCP endpoint, internal graph ingest agent tools, Memgraph query business logic을 포함합니다.

## Runtime

- Python 3.13
- FastAPI
- FastMCP / MCP Streamable HTTP
- LangChain tools for internal graph ingest agent
- Memgraph via Neo4j-compatible Bolt driver
- Pydantic / pydantic-settings

## Layout

```text
be/
├── src/app.py                  # FastAPI bootstrap and MCP mount
├── src/api/                    # HTTP and MCP exposure layer
├── src/agents/graph_ingest/    # Internal LangChain tools and graph ingest agent shell
├── src/ingest/                 # Document ingest, parsing, and local job state
├── src/query/                  # Memgraph query business logic
├── src/settings.py             # Environment settings
├── tests/
├── .env.example
├── pyproject.toml
└── uv.lock
```

## Run

```bash
uv sync
PYTHONPATH=src uv run uvicorn app:app --host 127.0.0.1 --port 8010
```

## API

- `GET /health`
- `GET /api/system/dependencies`
- `POST /ingest`
- `GET /ingest/status/{job_id}`
- `POST /search`
- `POST /api/ingest/jobs`
- `GET /api/ingest/jobs/{job_id}`
- `POST /api/ingest/jobs/{job_id}/start`
- `GET /api/documents`
- `POST /api/documents/search`
- `GET /api/review/edge-candidates`

## MCP

External read-only MCP endpoint:

```text
http://127.0.0.1:8010/mcp
```

External MCP tools:

- `memgraph.read_query`
- `memgraph.vector_search`
- `memgraph.keyword_search`
- `memgraph.graph_traverse`
- `memgraph.schema_read`

MCP only exposes read tools. Write/upsert tools are only available in-process to the graph ingest agent:

```python
from agents.graph_ingest.tools import get_graph_ingest_tools
```

## Environment

- Example file: `.env.example`
- Local file: `.env` (do not commit)
- Settings prefix: `RAG_`

## Checks

```bash
PYTHONPATH=src uv run python -m unittest discover -s tests
PYTHONPATH=src uv run python -m compileall src tests
```
