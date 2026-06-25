from __future__ import annotations

from typing import Any

from logger import configure_logging, get_logger
from settings import settings

logger = get_logger(__name__)


# FastMCP 서버를 ASGI 앱으로 바꿔서 uvicorn이 실행할 수 있게 만든다.
def create_app() -> Any:
    """MCP Streamable HTTP ASGI app을 만든다."""

    from server import create_external_mcp

    mcp = create_external_mcp()
    return mcp.streamable_http_app()


# 로컬 개발 환경에서 External MCP HTTP 서버를 직접 실행한다.
def main() -> None:
    """로컬 개발용 MCP HTTP 서버를 실행한다."""

    import uvicorn

    configure_logging()
    logger.info(
        "external MCP service starting",
        extra={
            "event": "external_mcp.service.starting",
            "host": settings.host,
            "port": settings.port,
            "path": settings.path,
        },
    )
    app = create_app()
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
