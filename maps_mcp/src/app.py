from __future__ import annotations

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.mcp import create_maps_mcp
from settings import settings

maps_mcp = create_maps_mcp()
maps_mcp_app = maps_mcp.streamable_http_app()


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    async with maps_mcp.session_manager.run():
        yield


app = FastAPI(title="SKN28 Maps MCP", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
app.mount(settings.external_mcp_path, maps_mcp_app)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "maps_mcp", "version": "0.1.0"}


@app.get("/api/system/dependencies")
def dependencies() -> dict[str, object]:
    return {
        "runtime": "FastAPI + FastMCP Streamable HTTP",
        "providers": {
            "naver_search_configured": settings.naver_search_configured,
            "tmap_configured": settings.tmap_configured,
        },
    }


def main() -> None:
    uvicorn.run(
        "app:app",
        host=settings.mcp_host,
        port=settings.mcp_port,
        reload=True,
    )


if __name__ == "__main__":
    main()
