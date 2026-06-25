from __future__ import annotations

import asyncio
import unittest
from typing import Any
from unittest.mock import patch

from server import create_external_mcp


class ServerToolRegistrationTest(unittest.TestCase):
    # MCP 서버에 우리가 기대한 tool 이름이 모두 등록되는지 확인한다.
    def test_registers_expected_tools(self) -> None:
        mcp = create_external_mcp()

        tool_names = sorted(mcp._tool_manager._tools.keys())  # noqa: SLF001

        self.assertEqual(
            tool_names,
            [
                "naver.search",
                "tmap.route_pedestrian",
                "tmap.search_poi",
                "web.search",
            ],
        )

    def test_registered_tool_invocation_logs_success_without_argument_values(
        self,
    ) -> None:
        mcp = create_external_mcp()
        tool = mcp._tool_manager._tools["naver.search"]  # noqa: SLF001

        def fake_search_naver(**_: Any) -> dict[str, Any]:
            return {"success": True, "count": 1, "warnings": []}

        with (
            patch("server.search_naver", side_effect=fake_search_naver),
            patch("server.logger.info") as info,
        ):
            result = asyncio.run(tool.run({"query": "로그에 남기지 않을 원문"}))

        self.assertEqual(result, {"success": True, "count": 1, "warnings": []})
        events = [call.kwargs["extra"]["event"] for call in info.call_args_list]
        self.assertEqual(
            events,
            [
                "external_mcp.tool_invocation.started",
                "external_mcp.tool_invocation.succeeded",
            ],
        )
        success_extra = info.call_args_list[-1].kwargs["extra"]
        self.assertEqual(success_extra["tool_name"], "naver.search")
        self.assertEqual(success_extra["tool_success"], True)
        self.assertEqual(success_extra["result_count"], 1)
        self.assertNotIn("로그에 남기지 않을 원문", str(info.call_args_list))

    def test_registered_tool_invocation_logs_returned_failure(self) -> None:
        mcp = create_external_mcp()
        tool = mcp._tool_manager._tools["web.search"]  # noqa: SLF001

        def fake_search_firecrawl(**_: Any) -> dict[str, Any]:
            return {
                "success": False,
                "count": 0,
                "warnings": ["missing api key"],
            }

        with (
            patch("server.search_firecrawl", side_effect=fake_search_firecrawl),
            patch("server.logger.info") as info,
        ):
            result = asyncio.run(tool.run({"query": "테스트"}))

        self.assertEqual(result["success"], False)
        failure_extra = info.call_args_list[-1].kwargs["extra"]
        self.assertEqual(
            failure_extra["event"],
            "external_mcp.tool_invocation.failed",
        )
        self.assertEqual(failure_extra["failure_kind"], "returned_failure")
        self.assertEqual(failure_extra["tool_success"], False)
        self.assertEqual(failure_extra["warning_count"], 1)
