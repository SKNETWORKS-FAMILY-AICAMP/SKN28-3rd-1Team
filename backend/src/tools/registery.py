from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from pathlib import Path
from time import perf_counter
from typing import Any

from langchain_core.tools import BaseTool, StructuredTool

from logger import get_logger
from tools.from_mcp import load_external_mcp_tools, load_rag_mcp_tools
from tools.local import get_local_tools

logger = get_logger(__name__)

MAIN_AGENT_PROFILE = "main_agent"
SCREEN_CONTROL_AGENT_PROFILE = "screen_control_agent"
_PROFILE_DIR = Path(__file__).with_name("profiles")


# agent별로 어떤 tool 묶음을 쓸지 표현하는 설정 객체다.
@dataclass(frozen=True)
class ToolProfile:
    name: str
    rag_mcp_enabled: bool
    external_mcp_enabled: bool
    local_enabled: bool = False


_PROFILE_CACHE: dict[str, ToolProfile] = {}
_TOOLS_CACHE: dict[str, list[BaseTool]] = {}
_TOOLS_LOCK: asyncio.Lock | None = None


# 동시에 여러 요청이 와도 tool 목록을 한 번씩만 로드하도록 lock을 만든다.
def _tools_lock() -> asyncio.Lock:
    global _TOOLS_LOCK
    if _TOOLS_LOCK is None:
        _TOOLS_LOCK = asyncio.Lock()
    return _TOOLS_LOCK


# 서로 다른 source에서 같은 이름의 tool이 오면 뒤쪽 tool 이름에 suffix를 붙인다.
def _deduplicate_tool_names(tools: list[BaseTool]) -> list[BaseTool]:
    used_names: set[str] = set()
    for tool in tools:
        if tool.name not in used_names:
            used_names.add(tool.name)
            continue

        base_name = tool.name
        suffix = 2
        candidate = f"{base_name}_{suffix}"
        while candidate in used_names:
            suffix += 1
            candidate = f"{base_name}_{suffix}"

        logger.debug(
            "renaming duplicate tool name",
            extra={
                "event": "tool_registry.tool_renamed",
                "original_tool": base_name,
                "safe_tool": candidate,
                "reason": "duplicate_tool_name",
            },
        )
        tool.name = candidate
        original_description = tool.description or ""
        tool.description = (
            f"{original_description}\nRegistry renamed duplicate tool name from {base_name}."
            if original_description
            else f"Registry renamed duplicate tool name from {base_name}."
        )
        used_names.add(candidate)

    return tools


# 로그에 찍기 좋게 tool 이름만 배열로 뽑는다.
def _tool_names(tools: list[BaseTool]) -> list[str]:
    return [tool.name for tool in tools]


def _tool_arg_keys(payload: dict[str, Any]) -> list[str]:
    return sorted(str(key) for key in payload)


def _tool_result_summary(result: Any) -> dict[str, Any]:
    summary: dict[str, Any] = {"result_type": type(result).__name__}

    if isinstance(result, dict):
        if "success" in result:
            summary["tool_success"] = bool(result.get("success"))
        if isinstance(result.get("count"), int):
            summary["result_count"] = result.get("count")
        if isinstance(result.get("results"), list):
            summary["result_items"] = len(result["results"])
        if isinstance(result.get("warnings"), list):
            summary["warning_count"] = len(result["warnings"])
        return summary

    if isinstance(result, str):
        summary["result_chars"] = len(result)
        return summary

    if isinstance(result, (list, tuple)):
        summary["result_items"] = len(result)
        return summary

    return summary


def _tool_returned_failure(result: Any) -> bool:
    if not isinstance(result, dict):
        return False

    if result.get("success") is False:
        return True

    status = result.get("status")
    if isinstance(status, str) and status.lower() in {"error", "failed", "failure"}:
        return True

    return False


def _duration_ms(started_at: float) -> int:
    return round((perf_counter() - started_at) * 1000)


def _tool_log_context(
    *,
    source: str,
    profile: str,
    tool_name: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    return {
        "source": source,
        "profile": profile,
        "tool_name": tool_name,
        "arg_count": len(payload),
        "arg_keys": _tool_arg_keys(payload),
    }


def _log_tool_started(
    *,
    source: str,
    profile: str,
    tool_name: str,
    payload: dict[str, Any],
) -> None:
    logger.info(
        "backend tool invocation started",
        extra={
            "event": "tool.invocation.started",
            **_tool_log_context(
                source=source,
                profile=profile,
                tool_name=tool_name,
                payload=payload,
            ),
        },
    )


def _log_tool_completed(
    *,
    source: str,
    profile: str,
    tool_name: str,
    payload: dict[str, Any],
    started_at: float,
    result: Any,
) -> None:
    returned_failure = _tool_returned_failure(result)
    event = "tool.invocation.failed" if returned_failure else "tool.invocation.succeeded"
    message = (
        "backend tool invocation failed"
        if returned_failure
        else "backend tool invocation succeeded"
    )
    extra = {
        "event": event,
        **_tool_log_context(
            source=source,
            profile=profile,
            tool_name=tool_name,
            payload=payload,
        ),
        "duration_ms": _duration_ms(started_at),
        **_tool_result_summary(result),
    }
    if returned_failure:
        extra["failure_kind"] = "returned_failure"

    logger.info(message, extra=extra)


def _log_tool_exception(
    *,
    source: str,
    profile: str,
    tool_name: str,
    payload: dict[str, Any],
    started_at: float,
) -> None:
    logger.exception(
        "backend tool invocation failed",
        extra={
            "event": "tool.invocation.failed",
            **_tool_log_context(
                source=source,
                profile=profile,
                tool_name=tool_name,
                payload=payload,
            ),
            "duration_ms": _duration_ms(started_at),
            "failure_kind": "exception",
        },
    )


def _instrument_tool(tool: BaseTool, *, source: str, profile: str) -> BaseTool:
    tool_name = tool.name

    def _run(**payload: Any) -> Any:
        started_at = perf_counter()
        _log_tool_started(
            source=source,
            profile=profile,
            tool_name=tool_name,
            payload=payload,
        )
        try:
            result = tool.invoke(payload)
        except Exception:
            _log_tool_exception(
                source=source,
                profile=profile,
                tool_name=tool_name,
                payload=payload,
                started_at=started_at,
            )
            raise

        _log_tool_completed(
            source=source,
            profile=profile,
            tool_name=tool_name,
            payload=payload,
            started_at=started_at,
            result=result,
        )
        return result

    async def _arun(**payload: Any) -> Any:
        started_at = perf_counter()
        _log_tool_started(
            source=source,
            profile=profile,
            tool_name=tool_name,
            payload=payload,
        )
        try:
            result = await tool.ainvoke(payload)
        except Exception:
            _log_tool_exception(
                source=source,
                profile=profile,
                tool_name=tool_name,
                payload=payload,
                started_at=started_at,
            )
            raise

        _log_tool_completed(
            source=source,
            profile=profile,
            tool_name=tool_name,
            payload=payload,
            started_at=started_at,
            result=result,
        )
        return result

    instrumented = StructuredTool.from_function(
        func=_run,
        coroutine=_arun,
        name=tool.name,
        description=tool.description or f"{tool.name} tool.",
        return_direct=tool.return_direct,
        args_schema=tool.args_schema,
    )
    instrumented.handle_tool_error = tool.handle_tool_error
    instrumented.handle_validation_error = tool.handle_validation_error
    instrumented.tags = tool.tags
    instrumented.metadata = {
        **(tool.metadata or {}),
        "tool_source": source,
        "tool_profile": profile,
    }
    return instrumented


def _instrument_tools(
    tool_entries: list[tuple[BaseTool, str]],
    *,
    profile: str,
) -> list[BaseTool]:
    source_by_id = {id(tool): source for tool, source in tool_entries}
    deduped_tools = _deduplicate_tool_names([tool for tool, _ in tool_entries])
    return [
        _instrument_tool(tool, source=source_by_id[id(tool)], profile=profile)
        for tool in deduped_tools
    ]


# agent profile 이름을 파일 경로로 바꾸되 이상한 문자는 막는다.
def _profile_path(agent_name: str) -> Path:
    if not agent_name.replace("_", "").replace("-", "").isalnum():
        raise ValueError(f"Invalid tool profile name: {agent_name}")
    return _PROFILE_DIR / f"{agent_name}.json"


# JSON profile 파일을 읽어서 agent가 사용할 tool source를 결정한다.
def _get_tool_profile(agent_name: str) -> ToolProfile:
    if agent_name in _PROFILE_CACHE:
        return _PROFILE_CACHE[agent_name]

    profile_path = _profile_path(agent_name)
    if not profile_path.exists():
        raise ValueError(f"Unknown tool profile: {agent_name}")

    data = json.loads(profile_path.read_text(encoding="utf-8"))
    sources = data.get("sources") or {}
    profile = ToolProfile(
        name=str(data.get("name") or agent_name),
        rag_mcp_enabled=bool(sources.get("rag_mcp", False)),
        external_mcp_enabled=bool(sources.get("external_mcp", False)),
        local_enabled=bool(sources.get("local", False)),
    )
    if profile.name != agent_name:
        raise ValueError(
            f"Tool profile name mismatch: expected={agent_name} actual={profile.name}"
    )

    _PROFILE_CACHE[agent_name] = profile
    logger.debug(
        "tool registry profile loaded",
        extra={
            "event": "tool_registry.profile_loaded",
            "profile": profile.name,
            "profile_path": str(profile_path),
            "rag_mcp_enabled": profile.rag_mcp_enabled,
            "external_mcp_enabled": profile.external_mcp_enabled,
            "local_enabled": profile.local_enabled,
        },
    )
    return profile


# 테스트나 설정 변경 후 profile 캐시를 비울 때 사용한다.
def clear_tool_profile_cache() -> None:
    _PROFILE_CACHE.clear()


# profile 설정에 따라 RAG MCP, External MCP, local tool을 실제로 로드한다.
async def _load_tools(profile: ToolProfile) -> list[BaseTool]:
    tool_entries: list[tuple[BaseTool, str]] = []

    if profile.rag_mcp_enabled:
        mcp_tools = await load_rag_mcp_tools()
        logger.debug(
            "tool registry source loaded",
            extra={
                "event": "tool_registry.source_loaded",
                "source": "rag_mcp",
                "profile": profile.name,
                "tool_count": len(mcp_tools),
            },
        )
        logger.debug(
            "tool registry source tool names loaded",
            extra={
                "event": "tool_registry.source_tools_loaded",
                "source": "rag_mcp",
                "profile": profile.name,
                "tools": _tool_names(mcp_tools),
            },
        )
        tool_entries.extend((tool, "rag_mcp") for tool in mcp_tools)
    else:
        logger.debug(
            "tool registry source skipped",
            extra={
                "event": "tool_registry.source_skipped",
                "source": "rag_mcp",
                "profile": profile.name,
                "reason": "disabled_by_profile",
            },
        )

    if profile.external_mcp_enabled:
        external_tools = await load_external_mcp_tools()
        logger.debug(
            "tool registry source loaded",
            extra={
                "event": "tool_registry.source_loaded",
                "source": "external_mcp",
                "profile": profile.name,
                "tool_count": len(external_tools),
            },
        )
        logger.debug(
            "tool registry source tool names loaded",
            extra={
                "event": "tool_registry.source_tools_loaded",
                "source": "external_mcp",
                "profile": profile.name,
                "tools": _tool_names(external_tools),
            },
        )
        tool_entries.extend((tool, "external_mcp") for tool in external_tools)
    else:
        logger.debug(
            "tool registry source skipped",
            extra={
                "event": "tool_registry.source_skipped",
                "source": "external_mcp",
                "profile": profile.name,
                "reason": "disabled_by_profile",
            },
        )

    if profile.local_enabled:
        local_tools = get_local_tools()
        logger.debug(
            "tool registry source loaded",
            extra={
                "event": "tool_registry.source_loaded",
                "source": "local",
                "profile": profile.name,
                "tool_count": len(local_tools),
            },
        )
        logger.debug(
            "tool registry source tool names loaded",
            extra={
                "event": "tool_registry.source_tools_loaded",
                "source": "local",
                "profile": profile.name,
                "tools": _tool_names(local_tools),
            },
        )
        tool_entries.extend((tool, "local") for tool in local_tools)
    else:
        logger.debug(
            "tool registry source skipped",
            extra={
                "event": "tool_registry.source_skipped",
                "source": "local",
                "profile": profile.name,
                "reason": "disabled_by_profile",
            },
        )

    return _instrument_tools(tool_entries, profile=profile.name)


# agent 이름에 맞는 tool 목록을 캐시와 함께 반환한다.
async def get_tools(agent_name: str = MAIN_AGENT_PROFILE) -> list[BaseTool]:
    profile = _get_tool_profile(agent_name)
    if profile.name in _TOOLS_CACHE:
        logger.debug(
            "tool registry cache hit",
            extra={
                "event": "tool_registry.cache_hit",
                "profile": profile.name,
            },
        )
        return _TOOLS_CACHE[profile.name]

    async with _tools_lock():
        if profile.name in _TOOLS_CACHE:
            logger.debug(
                "tool registry cache hit",
                extra={
                    "event": "tool_registry.cache_hit",
                    "profile": profile.name,
                },
            )
            return _TOOLS_CACHE[profile.name]

        tools = await _load_tools(profile)
        _TOOLS_CACHE[profile.name] = tools
        logger.debug(
            "tool registry registered",
            extra={
                "event": "tool_registry.registered",
                "profile": profile.name,
                "tool_count": len(tools),
            },
        )
        logger.debug(
            "tool registry registered tool names",
            extra={
                "event": "tool_registry.registered_tools",
                "profile": profile.name,
                "tools": _tool_names(tools),
            },
        )
        return tools


# 테스트나 설정 변경 후 tool/profile 캐시를 모두 비울 때 사용한다.
def clear_tools_cache() -> None:
    _TOOLS_CACHE.clear()
    clear_tool_profile_cache()
