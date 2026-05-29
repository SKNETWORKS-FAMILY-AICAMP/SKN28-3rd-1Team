from __future__ import annotations

from ingest import parser
from ingest.schemas import (
    CreateDocumentIngestJobRequest,
    FileIngestStatusResponse,
    RagDocument,
    RagIngestRequest,
    SearchRequest,
    SearchResponse,
)
from ingest.storage import (
    IngestJobStore,
    create_missing_job_response,
    create_text_job,
    ingest_backend_file,
    mark_graph_add_started,
)
from settings import settings


class IngestService:
    def __init__(self, store: IngestJobStore | None = None) -> None:
        self._store = store or IngestJobStore()

    def dependency_summary(self) -> dict[str, object]:
        return {
            "runtime": "Memgraph Agentic GraphRAG Backend",
            "settings": "pydantic-settings",
            "input_dir": str(settings.input_dir),
            "memgraph_uri": settings.memgraph_uri,
            "external_mcp_endpoint": (
                f"http://{settings.mcp_host}:{settings.mcp_port}{settings.external_mcp_path}"
            ),
            "supported_files": sorted(parser.SUPPORTED_INPUT_SUFFIXES),
        }

    def ingest_backend_file(self, request: RagIngestRequest) -> FileIngestStatusResponse:
        return ingest_backend_file(request, settings.input_dir, self._store)

    def create_text_job(
        self,
        request: CreateDocumentIngestJobRequest,
    ) -> FileIngestStatusResponse:
        return create_text_job(request, settings.input_dir, self._store)

    def get_status(self, job_id: str) -> FileIngestStatusResponse:
        return self._store.get(job_id) or create_missing_job_response(job_id)

    def start_graph_add(self, job_id: str) -> FileIngestStatusResponse:
        job = self._store.get(job_id)
        if job is None:
            return create_missing_job_response(job_id)
        return mark_graph_add_started(job, self._store)

    def list_documents(self) -> list[RagDocument]:
        return parser.load_documents(settings.input_dir)

    def search(self, request: SearchRequest) -> SearchResponse:
        return SearchResponse(
            query=request.query,
            results=parser.search_documents(settings.input_dir, request.query, request.top_k),
        )


ingest_service = IngestService()
