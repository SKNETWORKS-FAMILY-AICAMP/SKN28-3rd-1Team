from __future__ import annotations

from fastapi import APIRouter

from ingest.schemas import RagDocument, SearchRequest, SearchResponse
from ingest.service import ingest_service

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=list[RagDocument])
def list_documents() -> list[RagDocument]:
    return ingest_service.list_documents()


@router.post("/search", response_model=SearchResponse)
def search_documents(request: SearchRequest) -> SearchResponse:
    return ingest_service.search(request)
