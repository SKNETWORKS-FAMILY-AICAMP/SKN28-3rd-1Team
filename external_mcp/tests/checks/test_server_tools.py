from __future__ import annotations

import unittest

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

    # Firecrawl MCP tool이 검색 source와 도메인 필터 인자를 노출하는지 확인한다.
    def test_web_search_exposes_firecrawl_filters(self) -> None:
        mcp = create_external_mcp()

        schema = mcp._tool_manager._tools["web.search"].parameters  # noqa: SLF001
        properties = schema["properties"]

        self.assertIn("sources", properties)
        self.assertIn("include_domains", properties)
        self.assertIn("exclude_domains", properties)
