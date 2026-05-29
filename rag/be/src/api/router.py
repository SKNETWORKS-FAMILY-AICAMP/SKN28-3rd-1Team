from __future__ import annotations

from fastapi import APIRouter

from api.documents import router as documents_router
from api.health import router as health_router
from api.ingest import router as ingest_router
from api.review import router as review_router
from api.search import router as search_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(ingest_router)
api_router.include_router(documents_router)
api_router.include_router(review_router)
api_router.include_router(search_router)
