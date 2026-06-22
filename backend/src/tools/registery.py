from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from pathlib import Path

from langchain_core.tools import BaseTool

from logger import get_logger
from tools.from_mcp import load_rag_mcp_tools
from tools.local import get_local_tools

logger = get_logger(__name__)

MAIN_AGENT_PROFILE = "main_agent"
SCREEN_CONTROL_AGENT_PROFILE = "screen_control_agent"
_PROFILE_DIR = Path(__file__).with_name("profiles")


@dataclass(frozen=True)
class ToolProfile:
    name: str
    rag_mcp_enabled: bool
    local_enabled: bool = False


_PROFILE_CACHE: dict[str, ToolProfile] = {}
_TOOLS_CACHE: dict[str, list[BaseTool]] = {}
_TOOLS_LOCK: asyncio.Lock | None = None


def _tools_lock() -> asyncio.Lock:
    global _TOOLS_LOCK
    if _TOOLS_LOCK is None:
        _TOOLS_LOCK = asyncio.Lock()
    return _TOOLS_LOCK


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


def _tool_names(tools: list[BaseTool]) -> list[str]:
    return [tool.name for tool in tools]


def _profile_path(agent_name: str) -> Path:
    if not agent_name.replace("_", "").replace("-", "").isalnum():
        raise ValueError(f"Invalid tool profile name: {agent_name}")
    return _PROFILE_DIR / f"{agent_name}.json"


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
            "local_enabled": profile.local_enabled,
        },
    )
    return profile


def clear_tool_profile_cache() -> None:
    _PROFILE_CACHE.clear()


async def _load_tools(profile: ToolProfile) -> list[BaseTool]:
    tools: list[BaseTool] = []

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
        tools.extend(mcp_tools)
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
        tools.extend(local_tools)
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

    return _deduplicate_tool_names(tools)


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


def clear_tools_cache() -> None:
    _TOOLS_CACHE.clear()
    clear_tool_profile_cache()
