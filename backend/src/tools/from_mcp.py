from __future__ import annotations

import asyncio
import re

from langchain_core.tools import BaseTool, ToolException
from langchain_mcp_adapters.client import MultiServerMCPClient

from logger import get_logger
from settings import settings

logger = get_logger(__name__)

_UNSAFE_TOOL_NAME_CHARS = re.compile(r"[^a-zA-Z0-9_-]")


# LangChain tool 이름으로 쓸 수 없는 문자를 안전한 문자로 바꾼다.
def _safe_tool_name(name: str) -> str:
    safe_name = _UNSAFE_TOOL_NAME_CHARS.sub("_", name).strip("_")
    return safe_name or "mcp_tool"


# MCP tool 이름을 LangChain에서 사용할 수 있는 안전한 이름으로 정리한다.
def _normalize_tool_names(tools: list[BaseTool]) -> list[BaseTool]:
    used_names: set[str] = set()
    for tool in tools:
        original_name = tool.name
        safe_name = _safe_tool_name(original_name)
        if safe_name in used_names:
            suffix = 2
            candidate = f"{safe_name}_{suffix}"
            while candidate in used_names:
                suffix += 1
                candidate = f"{safe_name}_{suffix}"
            safe_name = candidate

        used_names.add(safe_name)
        if safe_name == original_name:
            continue

        logger.debug(
            "renaming MCP tool for LangChain compatibility",
            extra={
                "event": "rag_mcp.tool_renamed",
                "original_tool": original_name,
                "safe_tool": safe_name,
                "reason": "langchain_name_compatibility",
            },
        )
        tool.name = safe_name
        original_description = tool.description or ""
        tool.description = (
            f"{original_description}\nOriginal MCP tool name: {original_name}."
            if original_description
            else f"Original MCP tool name: {original_name}."
        )

    return tools


# tool 실행 오류가 agent 답변 전체를 깨지 않도록 안내 문구로 바꾼다.
def _tool_error_message(error: ToolException) -> str:
    return (
        "MCP 도구 실행 중 오류가 발생했습니다. 이 도구 결과는 근거로 사용하지 말고, "
        f"다른 검색 도구나 이미 확인된 근거로 답변을 계속 작성하세요. 오류: {error}"
    )


# MCP tool에 공통 오류 처리 문구를 붙인다.
def _handle_tool_errors(tools: list[BaseTool]) -> list[BaseTool]:
    for tool in tools:
        tool.handle_tool_error = _tool_error_message
        tool.handle_validation_error = (
            "MCP 도구 입력값이 올바르지 않습니다. 다른 검색 도구나 더 단순한 "
            "키워드로 다시 조회하세요."
        )
    return tools


# 기존 RAG MCP 서버에서 문서 검색 tool 목록을 가져온다.
async def load_rag_mcp_tools() -> list[BaseTool]:
    if not settings.rag.tools_enabled:
        logger.debug(
            "RAG MCP tools disabled by configuration",
            extra={
                "event": "rag_mcp.tools_disabled",
                "source": "rag_mcp",
                "configured": False,
            },
        )
        return []

    client = MultiServerMCPClient(
        {
            "rag": {
                "transport": "http",
                "url": settings.rag.mcp_url,
            }
        }
    )
    tools = await asyncio.wait_for(
        client.get_tools(server_name="rag"),
        timeout=settings.rag.tool_timeout_ms / 1000,
    )
    if not tools:
        raise RuntimeError("RAG MCP server returned no tools.")

    tools = _handle_tool_errors(_normalize_tool_names(tools))
    logger.debug(
        "loaded RAG MCP tools",
        extra={
            "event": "rag_mcp.tools_loaded",
            "source": "rag_mcp",
            "tool_count": len(tools),
        },
    )
    logger.debug(
        "loaded RAG MCP tool names",
        extra={
            "event": "rag_mcp.tool_names_loaded",
            "source": "rag_mcp",
            "mcp_url": settings.rag.mcp_url,
            "tools": [tool.name for tool in tools],
        },
    )
    return tools


# 새 External MCP 서버에서 외부 API tool 목록을 가져온다.
async def load_external_mcp_tools() -> list[BaseTool]:
    if not settings.external_mcp.tools_enabled:
        logger.debug(
            "External MCP tools disabled by configuration",
            extra={
                "event": "external_mcp.tools_disabled",
                "source": "external_mcp",
                "configured": False,
            },
        )
        return []

    client = MultiServerMCPClient(
        {
            "external": {
                "transport": "http",
                "url": settings.external_mcp.url,
            }
        }
    )
    tools = await asyncio.wait_for(
        client.get_tools(server_name="external"),
        timeout=settings.external_mcp.tool_timeout_ms / 1000,
    )
    if not tools:
        raise RuntimeError("External MCP server returned no tools")

    tools = _handle_tool_errors(_normalize_tool_names(tools))
    logger.debug(
        "loaded External MCP tools",
        extra={
            "event": "external_mcp.tools_loaded",
            "source": "external_mcp",
            "tool_count": len(tools),
        },
    )
    logger.debug(
        "loaded External MCP tool names",
        extra={
            "event": "external_mcp.tool_names_loaded",
            "source": "external_mcp",
            "mcp_url": settings.external_mcp.url,
            "tools": [tool.name for tool in tools],
        },
    )
    return tools


_load_rag_mcp_tools = load_rag_mcp_tools
_load_external_mcp_tools = load_external_mcp_tools
