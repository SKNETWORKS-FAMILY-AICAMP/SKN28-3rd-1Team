from __future__ import annotations

from langchain_core.tools import BaseTool

from tools.screen_control_workspace import get_screen_control_workspace_tools


def get_local_tools() -> list[BaseTool]:
    return get_screen_control_workspace_tools()
