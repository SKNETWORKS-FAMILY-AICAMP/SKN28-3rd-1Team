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
