# Memgraph MCP GraphRAG PRD

## 1. Executive Summary

### Problem Statement

현재 RAG 시스템은 파일 기반 검색과 Microsoft GraphRAG 초기 계획에 가까운 형태이며, 문서가 계속 추가될수록 지식 그래프가 성장하고 관계 기반 질의가 정교해지는 구조가 아직 명확히 정의되어 있지 않다.

장애인·취약계층 복지/법률 도메인은 법령, 조례, 시행규칙, 지역별 조건, 개정 시점이 서로 연결되어 있으므로 단순 벡터 검색만으로는 근거 관계와 적용 범위를 안정적으로 설명하기 어렵다.

### Proposed Solution

`rag/`를 독립적인 Python RAG 서버로 구성하고, Memgraph를 그래프/벡터 저장소로 사용한다. RAG 서버는 텍스트 문서 ingest, LLM 기반 chunking, embedding, graph candidate 생성, 저신뢰 관계 검수, Memgraph 저장, MCP 기반 query tool 제공을 담당한다.

`backend/`의 LangChain/FastAPI Agent Orchestrator는 RAG 구현 세부사항을 직접 알지 않고, Streamable HTTP 기반 external MCP endpoint를 통해 read-only Memgraph query tools를 호출한다.

### Success Criteria

- 새 텍스트 문서를 ingest하면 `Document`, `Chunk`, `Entity`, `Law`, `Ordinance`, `EnforcementRule`, `Region` 관련 노드와 관계가 Memgraph에 누적 저장된다.
- 동일 주제 문서를 추가 ingest했을 때 기존 그래프와 연결되는 candidate edge가 생성되고, 저신뢰/맥락 의존 edge만 human review queue로 분리된다.
- backend agent는 LangChain MCP adapter를 통해 external read-only Memgraph query tools를 호출하고, 직접 생성한 Cypher 또는 search wrapper 호출 결과를 근거로 답변을 생성할 수 있다.
- ingest/graph construction agent는 internal LangChain read-write tools를 사용해 기존 DB 상태를 probe하고, 새 문서를 기존 그래프 안에 배치할 수 있다.
- 구현은 Memgraph, MCP Python SDK, LangChain MCP adapter, FastAPI, OpenRouter, OpenAI embedding 관련 공식 문서와 실제 repo/reference codebase를 확인한 뒤 진행한다.

## 2. User Experience & Functionality

### User Personas

- 장애인 및 취약계층 당사자와 가족: 복지 혜택, 신청 조건, 노동권 보호 절차를 쉬운 한국어로 확인하려는 사용자.
- 중소기업 인사담당자 및 고용주: 장애인 의무고용, 고용장려금, 정당한 편의 제공 기준을 확인하려는 사용자.
- 복지사 및 상담 실무자: 민원인의 상황에 맞는 법령/조례/시행규칙 근거를 빠르게 찾으려는 사용자.
- RAG 운영자: public 문서를 추가하고, LLM이 제안한 그래프 관계 중 검수가 필요한 항목을 승인/거절/재시도하려는 관리자.
- Backend agent 개발자: RAG 내부 구현과 분리된 MCP tool contract만 보고 agent에 검색 기능을 연결하려는 개발자.

### User Stories

#### Story 1: 문서 누적 ingest

As a RAG 운영자, I want to add new public text documents so that the RAG knowledge graph continuously grows without rebuilding the whole system manually.

Acceptance Criteria:

- `.txt`, `.md`, `.json`, `.csv` 등 텍스트 기반 입력을 받을 수 있다.
- PDF는 MVP ingest 입력이 아니며, 추후 VLM/OCR layer가 텍스트로 변환한 결과만 본 pipeline에 들어온다.
- 각 ingest job은 원본 문서 metadata, processing status, 생성된 chunk 수, 생성된 node/edge 수를 추적한다.
- 동일 문서 또는 동일 chunk 중복 ingest를 피하기 위해 content hash 또는 source identifier를 저장한다.

#### Story 2: 법령 구조 인식 그래프 생성

As a RAG 운영자, I want the graph extraction agent to understand Korean legal hierarchy so that 법령, 조례, 시행규칙, 지역별 적용 범위가 올바르게 연결된다.

Acceptance Criteria:

- 그래프 extraction prompt는 `법령 -> 조례 -> 시행규칙(지역별)` 계층을 명시적으로 반영한다.
- `Law`, `Ordinance`, `EnforcementRule`, `Region`, `Article`, `Policy`, `Benefit`, `EligibilityCondition`, `Agency` 같은 도메인 entity 후보를 추출한다.
- 각 edge candidate는 relationship type, source span, confidence, rationale, review requirement를 포함한다.
- 기존 graph와 연결되는 edge는 LLM이 후보를 만들되, 저신뢰 또는 문맥 의존 관계는 자동 저장하지 않고 review queue로 이동한다.

#### Story 3: 선택적 human review

As a RAG 운영자, I want to approve only ambiguous or low-confidence graph edges so that graph quality improves without reviewing every edge manually.

Acceptance Criteria:

- high-confidence edge는 정책 기준을 만족하면 자동 저장될 수 있다.
- low-confidence, 법적 해석이 필요한 관계, 지역/시행규칙 범위가 불명확한 관계는 `pending_review` 상태로 저장된다.
- reviewer는 approve, reject, retry를 선택할 수 있다.
- retry는 동일 chunk/context를 기준으로 graph extraction agent를 다시 실행하고 이전 rationale을 참고한다.

#### Story 4: MCP 기반 agentic Memgraph query

As a backend agent, I want to generate and execute read-only Memgraph queries through MCP so that the main agent can perform agentic GraphRAG instead of relying on a fixed vanilla RAG search endpoint.

Acceptance Criteria:

- RAG server는 Streamable HTTP 기반 MCP endpoint를 제공한다.
- backend는 LangChain MCP adapter로 external read-only tool 목록을 로드한다.
- backend agent는 system instruction과 graph schema를 참고해 직접 Cypher 또는 search wrapper 호출을 생성한다.
- external interface는 read-only로 제한하며 `CREATE`, `MERGE`, `SET`, `DELETE`, `DROP`, index mutation 등 write operation을 거부한다.
- RAG MCP tool은 최종 자연어 답변을 직접 생성하지 않고, backend agent가 query 결과를 근거로 답변 생성을 담당한다.

#### Story 5: ingest agent의 DB probe와 graph placement

As a graph construction agent, I want to inspect and update the Memgraph database while ingesting a new document so that new chunks/entities/relationships are placed into the existing knowledge graph correctly.

Acceptance Criteria:

- ingest agent는 internal LangChain read-write tools를 사용한다.
- 새 문서 처리 중 기존 `Law`, `Ordinance`, `EnforcementRule`, `Region`, `Policy`, `Article`, `Chunk` 상태를 query로 probe할 수 있다.
- ingest agent는 vector search, keyword search, graph traversal, schema/index inspection wrapper를 조합해 유사 chunk와 관련 entity를 찾는다.
- 확정 가능한 node/edge는 internal write tool로 upsert한다.
- 저신뢰/맥락 의존 edge는 자동 write하지 않고 review candidate로 저장한다.

#### Story 6: 문서/그래프 관리 UI

As a RAG 운영자, I want to see stored documents and graph connections so that I can inspect what the system knows.

Acceptance Criteria:

- `rag/fe`는 root `frontend/`와 독립된 Bun/Vite/React 운영 UI로 둔다.
- MVP UI는 drag/drop 기반 문서 추가, ingest job status, graph add trigger, pending review summary를 제공한다.
- graph visualization은 우선 Memgraph Lab을 활용하고, 별도 embedded visualizer는 후속 범위로 둔다.

### Non-Goals

- MVP에서 PDF 직접 파싱을 구현하지 않는다.
- MVP에서 private document access control, per-user permission, tenant isolation을 구현하지 않는다.
- MVP에서 full custom graph visualization을 구현하지 않는다.
- MVP에서 Microsoft GraphRAG를 메인 runtime dependency로 사용하지 않는다.
- RAG MCP server가 최종 상담 답변을 생성하지 않는다. MCP server는 Memgraph query execution/query wrapper layer이며, 최종 답변 orchestration은 `backend/` agent의 책임이다.
- 법률 자문 자동 판단 시스템을 만들지 않는다. 근거 문서 기반 정보 제공과 출처 반환에 집중한다.

## 3. AI System Requirements

### Tool Requirements

#### LLM Provider

- OpenRouter를 기본 LLM gateway로 사용한다.
- graph extraction, chunking, edge confidence 판단은 LangChain 기반 agent 또는 runnable chain으로 구성한다.
- 법령/복지 도메인에서는 hallucination risk가 높으므로 system prompt에 relation schema, allowed edge types, evidence span requirement, uncertainty handling을 명시한다.

#### Embedding Provider

- 기본 추천 모델은 `openai/text-embedding-3-large`이다.
- OpenRouter embeddings API 또는 OpenAI-compatible embeddings client를 사용한다.
- 기본 dimension은 공식 모델 기준 3072이다. Memgraph vector index dimension과 반드시 일치해야 한다.
- 메모리/성능 문제가 있으면 공식 embedding API의 dimension 축소 옵션을 확인한 뒤 1024 또는 1536 dimension을 검토한다.

#### Database

- Memgraph를 MVP의 단일 persistence layer로 우선 사용한다.
- Memgraph에는 graph node/edge, chunk metadata, embedding vector, ingest job metadata를 저장한다.
- 별도 vector DB는 MVP 기본값이 아니다. 단, Memgraph 공식 기능 또는 실제 성능 검증에서 한계가 확인되면 후속 PRD에서 분리 저장소를 검토한다.

#### MCP Server

- Python MCP SDK의 FastMCP를 우선 사용한다.
- 서버 transport는 Streamable HTTP를 기준으로 한다.
- MCP server는 vanilla RAG search API가 아니라 external read-only Memgraph query tool server이다.
- Internal ingest/graph construction agent는 MCP를 거치지 않고 LangChain tools를 직접 사용한다.
- 구현 시 MCP Python SDK 공식 문서에서 `transport="streamable-http"` 실행 방식과 endpoint path 설정을 확인한다.
- backend의 LangChain MCP adapter 설정은 설치된 `langchain-mcp-adapters` 버전의 공식 README/API를 확인해 transport key를 맞춘다.

### Agentic Memgraph Tool Interfaces

#### External MCP Interface

Purpose:

- `backend/` main agent와 외부 consumer가 GraphRAG를 읽기 위해 사용하는 read-only interface이다.
- LLM은 사용자 질문을 보고 직접 Cypher 또는 wrapper call을 작성한다.
- Tool server는 query validation, timeout, row limit, operation allowlist를 적용한 뒤 Memgraph에 실행한다.

Endpoint:

```text
/mcp
```

Permissions:

- read-only only
- allowed: `MATCH`, read-only `CALL`, vector search, keyword/full-text search, bounded graph traversal, schema read
- denied: `CREATE`, `MERGE`, `SET`, `DELETE`, `REMOVE`, `DROP`, `CREATE INDEX`, `DROP INDEX`, arbitrary file/network procedure calls

Tools:

- `memgraph.read_query`
  - Executes validated read-only Cypher.
  - Returns rows, columns, elapsed time, row count, and warnings.
- `memgraph.vector_search`
  - Wraps Memgraph vector search over `Chunk.embedding`.
  - Input includes query text or embedding, index name, top_k, and filters.
- `memgraph.keyword_search`
  - Wraps keyword/full-text style lookup over document/chunk/entity properties.
  - Exact implementation must follow the installed Memgraph version and available index support.
- `memgraph.graph_traverse`
  - Runs bounded traversal from a node/entity/chunk/document id.
  - Requires max depth and max rows.
- `memgraph.schema_read`
  - Returns labels, relationship types, key properties, vector index names, and tool instructions for the agent.

#### Internal LangChain Tool Interface

Purpose:

- RAG ingest/graph construction agent가 새 문서를 기존 graph에 위치시키기 위해 직접 사용하는 read-write LangChain tool interface이다.
- 이 interface는 MCP endpoint로 노출하지 않는다.
- 새 문서 ingest 중 DB 내부를 probe하고, 확정된 node/edge/chunk를 upsert하며, 검수 필요한 edge candidate를 저장한다.

Code location:

```text
rag/be/src/agents/graph_ingest/tools.py
```

Permissions:

- read-write
- allowed: external read-only tool 전체, idempotent `MERGE`/upsert, review candidate write, ingest job status write
- denied by default: destructive delete/drop/truncate operations unless a separate maintenance-only tool is created

Tools:

- `memgraph.read_query`
- `memgraph.write_query`
  - Executes validated write Cypher only for internal callers.
  - Requires operation purpose, job_id, dry_run option, and expected labels/relationship types.
- `memgraph.upsert_document_graph`
  - Upserts `Document`, `Chunk`, extracted entities, approved edges, and embeddings in an idempotent way.
- `memgraph.store_edge_candidates`
  - Stores low-confidence/context-dependent relationship candidates as pending review items.
- `memgraph.probe_existing_context`
  - Combines vector search, keyword search, and graph traversal to find where a new chunk/entity should connect.
- `memgraph.review_edge_candidate`
  - approve/reject/retry action for pending candidates.

#### Raw Cypher Instruction Contract

The LLM is expected to write database queries directly. Therefore each MCP interface must expose instructions that include:

- current graph schema and relationship vocabulary
- examples of valid read queries and valid internal write/upsert queries
- vector index names and embedding dimension
- region/legal hierarchy conventions: `Law -> Ordinance -> EnforcementRule`, with regional rules connected to `Region`
- query safety rules, row limits, timeout, and forbidden operations
- instruction to prefer wrapper tools for vector/keyword/graph traversal when wrapper semantics are enough
- instruction to use raw Cypher when wrapper tools cannot express the required graph reasoning

### Document Ingest API

Document ingest itself remains HTTP-first in MVP.

- `POST /ingest` remains as a compatibility endpoint for backend-uploaded file paths.
- `POST /api/ingest/jobs` creates a RAG-owned text document ingest job.
- `POST /api/ingest/jobs/{job_id}/start` starts the graph add pipeline for a staged document.
- The ingest pipeline invokes internal LangChain tools from `agents.graph_ingest.tools`.
- Document ingest does not need to be exposed to the backend main agent unless later product requirements allow agents to add documents.

### Prompt Requirements

Graph extraction system prompt는 최소한 아래 규칙을 포함해야 한다.

- 입력 chunk에 직접 근거가 없는 entity/edge를 만들지 않는다.
- relationship type은 사전에 정의된 schema 안에서만 선택한다.
- 법령 계층은 `법령 -> 조례 -> 시행규칙` 방향을 기본으로 해석한다.
- 지역별 시행규칙은 반드시 `Region` 또는 지역 metadata와 연결한다.
- 적용 대상, 신청 조건, 담당 기관, 금액/비율, 시행일은 별도 entity/property 후보로 추출한다.
- confidence가 낮거나 문맥 외부 지식이 필요한 관계는 자동 확정하지 않고 review 대상으로 표시한다.
- edge마다 source chunk id, evidence span, confidence, rationale을 반환한다.

Memgraph query generation prompt는 최소한 아래 규칙을 포함해야 한다.

- 이 시스템은 agentic GraphRAG이며, 고정된 vanilla RAG search endpoint에 의존하지 않는다.
- 사용자 질문 또는 ingest task를 graph schema와 tool instruction으로 변환해 직접 Cypher 또는 wrapper call을 작성한다.
- external interface에서는 반드시 read-only query만 작성한다.
- internal ingest/graph construction interface에서만 write/upsert query를 작성한다.
- write query는 idempotent해야 하며 `job_id`, source chunk, evidence span, expected labels/relationship types를 남긴다.
- 먼저 `schema_read` 또는 cached schema instruction을 확인하고, 존재하지 않는 label/relationship/index를 임의로 만들지 않는다.
- vector, keyword, graph traversal wrapper로 충분한 경우 raw Cypher보다 wrapper를 우선한다.
- raw Cypher가 필요할 때는 row limit, traversal depth, timeout을 고려해 bounded query로 작성한다.

### Evaluation Strategy

MVP에서는 backbone 완성을 우선하되, 구현 후 아래 기준으로 품질을 튜닝한다.

- Retrieval Precision@5: 대표 질문 30개 기준 관련 근거가 top 5 안에 포함되는 비율을 측정한다.
- Citation Accuracy: 답변에 사용된 source가 실제 근거 문서/조항과 일치하는지 샘플링 검수한다.
- Edge Approval Precision: 자동 승인된 edge 중 reviewer가 사후 반려할 만한 edge 비율을 추적한다.
- Ingest Regression: 동일 fixture 문서를 ingest했을 때 node/edge/chunk 수와 주요 관계가 의도대로 생성되는지 테스트한다.
- MCP Contract Test: backend에서 external read-only MCP tools를 로딩하고 `memgraph.read_query` 또는 search wrapper 호출이 성공하는지 확인한다.

## 4. Technical Specifications

### Architecture Overview

```text
Public text documents
  -> rag ingest HTTP API
  -> parser / normalizer
  -> LLM chunking agent
  -> embedding generator
  -> graph extraction agent
  -> edge confidence policy
  -> Memgraph storage
       - graph nodes / edges
       - chunk embeddings
       - document metadata
       - ingest jobs
       - pending review edges
  -> RAG MCP server
       - external read-only interface (/mcp)
  -> RAG internal LangChain tools
       - internal read-write tools for ingest / graph construction
  -> backend LangChain MCP adapter (external read-only tools)
  -> backend main agent
  -> frontend /chat response
```

### Runtime Structure

`agent-init` skill의 기본 원칙은 참고하되, 이 서비스는 단일 main agent가 외부 응답을 직접 생성하는 서버가 아니다. `rag/be`는 아래 두 runtime을 같은 Python 서비스 안에 갖는 RAG backend monolith로 설계한다. `rag/fe`는 이 backend를 호출하는 독립 Bun/Vite React 운영 UI이다.

- FastAPI runtime: ingest, ingest status, review workflow 같은 운영 HTTP API를 제공한다.
- FastMCP runtime: external read-only Memgraph query tools를 Streamable HTTP MCP endpoint로 제공한다.
- Internal LangChain tools: RAG 내부 ingest/graph construction agent에게 read-write tools를 Python object로 제공한다.

Runtime boundary:

- `rag/be/src/app.py`는 FastAPI bootstrap과 router/mount wiring만 담당한다.
- MCP 노출은 `rag/be/src/api/mcp.py`에서만 담당한다.
- LLM 기반 chunking, graph extraction, edge confidence 판단은 API 함수 안에 두지 않고 `rag/be/src/ingest/`와 `rag/be/src/agents/graph_ingest/`로 분리한다.
- OpenRouter LLM/embedding client는 pipeline 내부에 흩어두지 않고 재사용 가능한 client/factory boundary로 둔다.
- Memgraph 접근과 query business logic은 `rag/be/src/query/`로 분리하고, `backend/`가 Memgraph query를 직접 알지 않게 한다.
- External FastMCP endpoint는 `backend/` LangChain MCP adapter와의 contract이며, 최종 사용자 답변 생성은 계속 `backend/` main agent가 담당한다.

### Service Boundary

#### `rag/be`

Responsibilities:

- document ingest API
- text parsing and normalization
- LLM-based chunking
- embedding creation
- graph candidate extraction
- confidence-based edge review routing
- Memgraph write/read queries
- MCP tool server

#### `rag/fe`

Responsibilities:

- independent RAG operations UI
- document drag/drop and text upload workflow
- ingest job status display
- pending review summary
- graph add action trigger

Non-responsibilities:

- final user chat UI
- direct Memgraph connection
- write-capable graph mutation outside backend APIs

#### Memgraph Container

Responsibilities:

- graph persistence
- vector index storage/search
- Cypher query execution
- graph traversal for context expansion

#### `backend/`

Responsibilities:

- `POST /chat` API
- OpenRouter chat LLM orchestration
- LangChain agent execution
- MCP tool loading
- final answer generation with citations

Non-responsibilities:

- direct document parsing
- direct Memgraph query logic
- graph construction
- embedding storage

### Data Model Draft

#### Nodes

- `Document`
  - `id`
  - `title`
  - `source_type`
  - `source_url`
  - `hash`
  - `created_at`
  - `effective_date`
  - `jurisdiction`
- `Chunk`
  - `id`
  - `document_id`
  - `content`
  - `content_hash`
  - `chunk_index`
  - `embedding`
  - `token_count`
- `Law`
  - `name`
  - `law_number`
  - `effective_date`
- `Ordinance`
  - `name`
  - `region`
  - `effective_date`
- `EnforcementRule`
  - `name`
  - `region`
  - `effective_date`
- `Article`
  - `article_number`
  - `title`
- `Region`
  - `name`
  - `code`
- `Policy`
  - `name`
  - `category`
- `Benefit`
  - `name`
  - `amount`
  - `unit`
- `EligibilityCondition`
  - `description`
- `Agency`
  - `name`

#### Relationships

- `(Document)-[:HAS_CHUNK]->(Chunk)`
- `(Chunk)-[:MENTIONS]->(Entity)`
- `(Law)-[:HAS_ARTICLE]->(Article)`
- `(Law)-[:DELEGATES_TO]->(Ordinance)`
- `(Ordinance)-[:HAS_ENFORCEMENT_RULE]->(EnforcementRule)`
- `(Ordinance)-[:APPLIES_TO_REGION]->(Region)`
- `(EnforcementRule)-[:APPLIES_TO_REGION]->(Region)`
- `(Policy)-[:HAS_BENEFIT]->(Benefit)`
- `(Policy)-[:HAS_ELIGIBILITY]->(EligibilityCondition)`
- `(Policy)-[:ADMINISTERED_BY]->(Agency)`
- `(Article)-[:SUPPORTS]->(Policy)`
- `(Chunk)-[:EVIDENCE_FOR]->(RelationshipCandidate)`

### Ingest Pipeline

1. Validate input file type and metadata.
2. Normalize text into UTF-8 content.
3. Create or update `Document`.
4. Split document into semantic chunks using LLM-guided chunking.
5. Generate embedding for each chunk.
6. Upsert `Chunk` nodes and vector properties.
7. Run graph extraction agent per chunk or chunk group.
8. Match extracted entities against existing graph.
9. Generate edge candidates with confidence and rationale.
10. Auto-approve high-confidence edges that satisfy policy.
11. Store low-confidence/context-dependent edges as `pending_review`.
12. Return ingest job summary.

### Agentic Query Pipelines

#### External read-only query pipeline

1. Backend main agent receives a user question.
2. Backend main agent loads external MCP tool instructions and current graph schema.
3. LLM chooses one or more of `memgraph.read_query`, `memgraph.vector_search`, `memgraph.keyword_search`, `memgraph.graph_traverse`, and `memgraph.schema_read`.
4. If raw Cypher is needed, LLM writes read-only Cypher directly.
5. MCP tool server validates that the query is read-only, bounded, and allowed for external callers.
6. MCP tool server executes the query against Memgraph and returns rows/metadata.
7. Backend main agent uses query results, source chunks, and graph context to generate the final answer.

#### Internal ingest/graph placement query pipeline

1. `POST /ingest` or `POST /api/ingest/jobs` stages a document ingest job.
2. Parser/chunker creates normalized text chunks.
3. Ingest agent uses internal LangChain tools to inspect schema, vector-similar chunks, keyword matches, and graph neighborhoods.
4. Ingest agent generates entities and relationship candidates for the new chunks.
5. Ingest agent uses internal read-write tools to upsert high-confidence document/chunk/entity nodes and approved relationships.
6. Low-confidence/context-dependent edges are stored as pending review candidates.
7. Ingest job summary records created/updated nodes, created/updated edges, pending review count, and query/tool execution audit.

### Memgraph Query Requirements

- Vector index dimension must match embedding dimension.
- Query implementation must use official Memgraph Cypher/vector search syntax for the installed Memgraph version.
- Graph traversal must be bounded by depth and result count to prevent large responses.
- Write queries must be idempotent where possible, using stable IDs and content hashes.
- Relationship candidate storage must preserve source chunk and evidence span.
- External query validator must reject write operations before sending Cypher to Memgraph.
- Internal write query executor must require caller identity, job_id, operation purpose, dry_run support, timeout, and audit logging.
- Query wrapper functions should cover Memgraph vector search, keyword/property search, graph traversal, schema/index inspection, idempotent upsert, and review candidate storage.
- Raw Cypher is allowed because this is agentic RAG, but it must pass permission-specific validation.

### API Surface

#### HTTP APIs in `rag/be`

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

Approve/reject/retry review mutation APIs can remain phased until the detailed review UI is implemented.
`rag/fe` MVP calls read/list/status endpoints and triggers graph add.

#### MCP Endpoint

- External read-only interface: `/mcp`
- The MCP interface supports `POST` and `GET` only as required by MCP Streamable HTTP session behavior.

FastMCP를 사용해 MCP tools를 정의하고, FastAPI/Starlette app에 Streamable HTTP app을 mount하는 방식을 우선 검토한다. Internal LangChain tools는 MCP에 등록하지 않는다. Exact routing must follow MCP Python SDK official docs and the installed SDK version.

### Environment Variables

Use `RAG_` prefix in `rag/be/.env`.

```bash
RAG_MEMGRAPH_URI=bolt://127.0.0.1:7687
RAG_MEMGRAPH_USERNAME=
RAG_MEMGRAPH_PASSWORD=
RAG_OPENROUTER_API_KEY=
RAG_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
RAG_GRAPH_LLM_MODEL=
RAG_EMBEDDING_MODEL=openai/text-embedding-3-large
RAG_EMBEDDING_DIMENSIONS=3072
RAG_MCP_HOST=127.0.0.1
RAG_MCP_PORT=8010
RAG_EXTERNAL_MCP_PATH=/mcp
RAG_CORS_ALLOWED_ORIGINS=["http://127.0.0.1:5173","http://localhost:5173"]
RAG_QUERY_TIMEOUT_MS=30000
RAG_QUERY_MAX_ROWS=100
RAG_EDGE_AUTO_APPROVE_THRESHOLD=0.85
RAG_EDGE_REVIEW_THRESHOLD=0.65
```

Memgraph Docker Compose 환경 변수는 `rag/infra/.env`에서 관리한다.

```bash
MEMGRAPH_IMAGE=memgraph/memgraph-mage:latest
MEMGRAPH_CONTAINER_NAME=rag-memgraph
MEMGRAPH_BOLT_PORT=7687
MEMGRAPH_LOG_PORT=7444
MEMGRAPH_LOG_LEVEL=INFO
MEMGRAPH_SCHEMA_INFO_ENABLED=true
MEMGRAPH_LAB_IMAGE=memgraph/lab:latest
MEMGRAPH_LAB_CONTAINER_NAME=rag-memgraph-lab
MEMGRAPH_LAB_PORT=3000
```

Secrets must stay in local `.env` only.

### Security & Privacy

- MVP handles public documents only.
- Do not store API keys or secrets in graph nodes, logs, or committed files.
- MCP Streamable HTTP server must bind to localhost by default during local development.
- If exposed beyond localhost, add authentication, Origin validation, and host validation according to MCP official security guidance.
- Logs may include job id, document id, counts, and model names, but must not log full confidential prompts or secrets.

### Official Documentation Requirement

Before implementation, developers must verify current official documentation and installed package behavior for:

- Memgraph Docker, Python client, Cypher, vector index/search, and graph algorithms.
- Memgraph Docker Compose, `memgraph/memgraph-mage`, `memgraph/lab`, healthcheck, and Lab quick-connect behavior.
- MCP Python SDK FastMCP Streamable HTTP server.
- MCP Streamable HTTP specification and security guidance.
- LangChain MCP adapter `MultiServerMCPClient` and transport configuration.
- FastAPI routing/lifespan behavior.
- OpenRouter chat and embeddings API.
- OpenAI `text-embedding-3-large` embedding dimensions and dimension reduction option.
- Any referenced Memgraph GraphRAG or unstructured-to-graph examples.

Implementation must prefer official docs and actual reference code over blog posts. The LangChain knowledge-graph RAG article may be used as conceptual reference, not as the only source for API behavior.

### Reference Links

- Memgraph Docker install: https://memgraph.com/docs/getting-started/install-memgraph/docker
- Memgraph Docker Compose: https://memgraph.com/docs/getting-started/install-memgraph/docker-compose
- Memgraph vector search: https://memgraph.com/docs/querying/vector-search
- Memgraph GraphRAG overview: https://memgraph.com/docs/ai-ecosystem/graph-rag
- Memgraph knowledge graph creation: https://memgraph.com/docs/ai-ecosystem/graph-rag/knowledge-graph-creation
- Memgraph Python client: https://memgraph.com/docs/client-libraries/python
- MCP specification: https://modelcontextprotocol.io/specification
- MCP Python SDK: https://github.com/modelcontextprotocol/python-sdk
- LangChain MCP adapters: https://github.com/langchain-ai/langchain-mcp-adapters
- OpenRouter API docs: https://openrouter.ai/docs
- OpenAI embeddings guide: https://platform.openai.com/docs/guides/embeddings
- LangChain knowledge-graph RAG article: https://www.langchain.com/blog/enhancing-rag-based-applications-accuracy-by-constructing-and-leveraging-knowledge-graphs

## 5. Risks & Roadmap

### Phased Rollout

#### MVP: Memgraph-backed GraphRAG backbone

- Add Memgraph container/runtime configuration under `rag/infra/`.
- Define graph schema and vector index strategy.
- Implement text ingest API.
- Implement chunking, embedding, graph extraction, and Memgraph upsert.
- Implement external read-only Memgraph MCP interface over Streamable HTTP.
- Implement internal read-write LangChain tools for ingest/graph construction agents.
- Connect backend MCP client only to the external read-only interface.
- Add fixture-based ingest/query tests.

#### v1.1: Review workflow and graph quality loop

- Implement pending edge review APIs.
- Add approve/reject/retry workflow.
- Tune graph extraction prompt and confidence policy.
- Add regression fixtures for 법령/조례/시행규칙 hierarchy.
- Add query ranking that combines vector score and graph context.

#### v1.2: Operator visibility

- Expand the existing `rag/fe` document list and ingest status UI.
- Add approve/reject/retry pending edge review UI.
- Add graph visualization using Memgraph Lab or a lightweight frontend integration.
- Add basic graph inspection by document/entity.

#### v2.0: Document expansion and production hardening

- Add VLM/OCR/PDF-to-text preprocessing layer before ingest.
- Add auth if documents become private.
- Add batch ingest scheduling.
- Add monitoring, tracing, and cost tracking.
- Add stricter eval datasets and automated quality gates.

### Technical Risks

- Graph extraction hallucination: mitigated by schema-constrained prompts, evidence spans, confidence policy, and human review for ambiguous edges.
- Legal hierarchy ambiguity: mitigated by explicit `법령 -> 조례 -> 시행규칙(지역별)` model and domain-specific fixtures.
- Embedding dimension mismatch: mitigated by central settings and startup validation against Memgraph vector index configuration.
- Memgraph vector search performance: mitigated by bounded result count, index tuning, and later dimension reduction if needed.
- MCP transport mismatch: mitigated by checking installed `mcp` and `langchain-mcp-adapters` official docs before implementation.
- Backend/RAG coupling drift: mitigated by treating MCP tool schema as the integration contract.
- Accidental external writes: mitigated by exposing only external read-only MCP tools, keeping internal write tools as in-process LangChain tools, read-only validation, denied operation list, and not registering internal tools in backend.
- Unsafe raw Cypher from LLM: mitigated by schema instructions, query validation, row/depth/time limits, dry_run for internal writes, and query audit logs.
- Cost growth from LLM-based ingest: mitigated by chunk-level hashing, idempotent ingest, and skipping unchanged chunks.

### Open Decisions

- Exact graph extraction model: use OpenRouter model selection after cost/quality test.
- Embedding dimension: default 3072, but reduce only after memory/performance measurement.
- UI implementation location: `rag/fe`, independent from root `frontend/`, using Bun + Vite + React.
- Exact Cypher validator implementation: prefer AST/parser-based validation if available; otherwise enforce conservative token/operation allowlist plus runtime permission checks.
