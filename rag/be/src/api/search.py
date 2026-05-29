from __future__ import annotations

from fastapi import APIRouter

from ingest.schemas import SearchRequest, SearchResponse
from ingest.service import ingest_service

router = APIRouter(tags=["search"])


@router.post("/search", response_model=SearchResponse)
def legacy_search(request: SearchRequest) -> SearchResponse:
    return ingest_service.search(request)
