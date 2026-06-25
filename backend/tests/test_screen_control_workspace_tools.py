from __future__ import annotations

import unittest
from typing import Any
from unittest.mock import patch

from tools.screen_control_workspace import get_screen_control_workspace_tools


class ScreenControlWorkspaceToolsTest(unittest.IsolatedAsyncioTestCase):
    def test_workspace_tools_are_registered_by_surface(self) -> None:
        tools = get_screen_control_workspace_tools()

        self.assertEqual(
            [tool.name for tool in tools],
            [
                "workspace_show_default",
                "workspace_show_profile_intake",
                "workspace_show_institution_results",
                "workspace_show_evidence_documents",
                "workspace_show_action_checklist",
                "workspace_show_access_summary",
            ],
        )

    async def test_default_tool_emits_workspace_command_event(self) -> None:
        tool = _tool("workspace_show_default")
        emitted: list[dict[str, Any]] = []

        with patch(
            "tools.screen_control_workspace.get_stream_writer",
            return_value=emitted.append,
        ):
            result = await tool.ainvoke(
                {
                    "title": "기본 화면",
                    "description": "상담을 시작합니다.",
                    "statusLabel": "대기 중",
                }
            )

        self.assertEqual(result, "workspace.showDefault emitted.")
        self.assertEqual(len(emitted), 1)
        self.assertEqual(emitted[0]["type"], "screen_control.command")
        self.assertEqual(emitted[0]["source_agent"], "screen_control_agent")
        self.assertEqual(
            emitted[0]["command"],
            {
                "type": "workspace.showDefault",
                "title": "기본 화면",
                "description": "상담을 시작합니다.",
                "statusLabel": "대기 중",
            },
        )

    async def test_profile_intake_tool_emits_surface_payload_without_mascot(
        self,
    ) -> None:
        tool = _tool("workspace_show_profile_intake")
        emitted: list[dict[str, Any]] = []

        with patch(
            "tools.screen_control_workspace.get_stream_writer",
            return_value=emitted.append,
        ):
            result = await tool.ainvoke(
                {
                    "title": "상담 정보를 알려주세요",
                    "description": "조건 확인에 필요한 정보입니다.",
                    "fields": [
                        {
                            "id": "birthYear",
                            "kind": "year",
                            "label": "태어난 년도",
                            "value": "1958",
                            "placeholder": "예: 1958",
                        }
                    ],
                    "suggestedQuestions": ["가까운 기관 알려줘"],
                    "primaryActionLabel": "상담 정보 반영",
                }
            )

        self.assertEqual(
            result,
            "workspace.showSurface emitted for profile-intake.",
        )
        surface = emitted[0]["command"]["surface"]
        self.assertEqual(surface["type"], "profile-intake")
        self.assertEqual(surface["title"], "상담 정보를 알려주세요")
        self.assertNotIn("mascot", surface)


def _tool(name: str):
    tools = {tool.name: tool for tool in get_screen_control_workspace_tools()}
    return tools[name]


if __name__ == "__main__":
    unittest.main()
