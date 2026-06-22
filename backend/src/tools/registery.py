from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from pathlib import Path

from langchain_core.tools import BaseTool

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

        logger.info(
            "renaming duplicate tool name original=%s safe=%s",
            base_name,
            candidate,
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
    logger.info(
        "tool registry loaded profile=%s path=%s rag_mcp=%s external_mcp=%s local=%s",
        profile.name,
        profile_path,
        profile.rag_mcp_enabled,
        profile.external_mcp_enabled,
        profile.local_enabled,
    )
    return profile


# 테스트나 설정 변경 후 profile 캐시를 비울 때 사용한다.
def clear_tool_profile_cache() -> None:
    _PROFILE_CACHE.clear()


# profile 설정에 따라 RAG MCP, External MCP, local tool을 실제로 로드한다.
async def _load_tools(profile: ToolProfile) -> list[BaseTool]:
    tools: list[BaseTool] = []

    if profile.rag_mcp_enabled:
        mcp_tools = await load_rag_mcp_tools()
        logger.info(
            "tool registry loaded source=rag_mcp profile=%s count=%s tools=%s",
            profile.name,
            len(mcp_tools),
            _tool_names(mcp_tools),
        )
        tools.extend(mcp_tools)
    else:
        logger.info("tool registry skipped source=rag_mcp profile=%s", profile.name)

    if profile.external_mcp_enabled:
        external_tools = await load_external_mcp_tools()
        logger.info(
            "tool registry loaded source=external_mcp profile=%s count=%s tools=%s",
            profile.name,
            len(external_tools),
            _tool_names(external_tools),
        )
        tools.extend(external_tools)
    else:
        logger.info("tool registry skipped source=external_mcp profile=%s", profile.name)

    if profile.local_enabled:
        local_tools = get_local_tools()
        logger.info(
            "tool registry loaded source=local profile=%s count=%s tools=%s",
            profile.name,
            len(local_tools),
            _tool_names(local_tools),
        )
        tools.extend(local_tools)
    else:
        logger.info("tool registry skipped source=local profile=%s", profile.name)

    return _deduplicate_tool_names(tools)


# agent 이름에 맞는 tool 목록을 캐시와 함께 반환한다.
async def get_tools(agent_name: str = MAIN_AGENT_PROFILE) -> list[BaseTool]:
    profile = _get_tool_profile(agent_name)
    if profile.name in _TOOLS_CACHE:
        logger.debug("tool registry cache hit profile=%s", profile.name)
        return _TOOLS_CACHE[profile.name]

    async with _tools_lock():
        if profile.name in _TOOLS_CACHE:
            logger.debug("tool registry cache hit profile=%s", profile.name)
            return _TOOLS_CACHE[profile.name]

        tools = await _load_tools(profile)
        _TOOLS_CACHE[profile.name] = tools
        logger.info(
            "tool registry registered profile=%s count=%s tools=%s",
            profile.name,
            len(tools),
            _tool_names(tools),
        )
        return tools


# 테스트나 설정 변경 후 tool/profile 캐시를 모두 비울 때 사용한다.
def clear_tools_cache() -> None:
    _TOOLS_CACHE.clear()
    clear_tool_profile_cache()
