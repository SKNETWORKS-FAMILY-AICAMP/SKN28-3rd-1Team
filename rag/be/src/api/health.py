from __future__ import annotations

from fastapi import APIRouter

from ingest.service import ingest_service

router = APIRouter(tags=["system"])


@router.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "rag-be",
    }


@router.get("/api/system/dependencies")
def dependencies() -> dict[str, object]:
    return ingest_service.dependency_summary()

