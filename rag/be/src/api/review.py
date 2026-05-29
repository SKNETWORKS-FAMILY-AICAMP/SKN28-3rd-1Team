from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter
from fastapi import Query

from query.service import MemgraphQueryService

router = APIRouter(prefix="/api/review", tags=["review"])


@router.get("/edge-candidates")
def list_edge_candidates(
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> dict[str, object]:
    return MemgraphQueryService().list_pending_edge_candidates(limit=limit)
