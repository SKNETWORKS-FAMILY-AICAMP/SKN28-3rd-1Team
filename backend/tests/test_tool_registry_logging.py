from __future__ import annotations

import unittest
from typing import Any
from unittest.mock import patch

from langchain_core.tools import BaseTool, StructuredTool

from tools.registery import MAIN_AGENT_PROFILE, _instrument_tool


class ToolRegistryLoggingTest(unittest.IsolatedAsyncioTestCase):
    async def test_async_tool_invocation_logs_success_without_argument_values(
        self,
    ) -> None:
        async def sample_tool(query: str) -> dict[str, Any]:
            return {"success": True, "count": 2, "warnings": []}

        tool = StructuredTool.from_function(
            coroutine=sample_tool,
            name="sample_tool",
            description="sample tool",
        )
        instrumented = _instrument_tool(tool, source="local", profile="test_agent")

        with patch("tools.registery.logger.info") as info:
            result = await instrumented.ainvoke({"query": "로그에 남기지 않을 원문"})

        self.assertEqual(result, {"success": True, "count": 2, "warnings": []})
        events = [call.kwargs["extra"]["event"] for call in info.call_args_list]
        self.assertEqual(
            events,
            ["tool.invocation.started", "tool.invocation.succeeded"],
        )
        success_extra = info.call_args_list[-1].kwargs["extra"]
        self.assertEqual(success_extra["source"], "local")
        self.assertEqual(success_extra["profile"], "test_agent")
        self.assertEqual(success_extra["tool_name"], "sample_tool")
        self.assertEqual(success_extra["arg_count"], 1)
        self.assertEqual(success_extra["arg_keys"], ["query"])
        self.assertEqual(success_extra["tool_success"], True)
        self.assertEqual(success_extra["result_count"], 2)
        self.assertNotIn("로그에 남기지 않을 원문", str(info.call_args_list))

    def test_returned_failure_logs_failed_event(self) -> None:
        def failing_tool(query: str) -> dict[str, Any]:
            return {"success": False, "count": 0, "warnings": ["missing api key"]}

        tool = StructuredTool.from_function(
            func=failing_tool,
            name="failing_tool",
            description="failing tool",
        )
        instrumented = _instrument_tool(
            tool,
            source="external_mcp",
            profile="main_agent",
        )

        with patch("tools.registery.logger.info") as info:
            result = instrumented.invoke({"query": "테스트"})

        self.assertEqual(result["success"], False)
        failure_extra = info.call_args_list[-1].kwargs["extra"]
        self.assertEqual(failure_extra["event"], "tool.invocation.failed")
        self.assertEqual(failure_extra["failure_kind"], "returned_failure")
        self.assertEqual(failure_extra["tool_success"], False)
        self.assertEqual(failure_extra["warning_count"], 1)

    async def test_mcp_content_and_artifact_tool_is_wrapped_as_content(self) -> None:
        tool = FakeMcpContentArtifactTool()
        instrumented = _instrument_tool(
            tool,
            source="rag_mcp",
            profile="main_agent",
        )

        with patch("tools.registery.logger.info"):
            result = await instrumented.ainvoke({"query": "테스트"})

        self.assertEqual(result, [{"title": "검색 결과"}])
        self.assertEqual(instrumented.response_format, "content")


class FakeMcpContentArtifactTool(BaseTool):
    name: str = "fake_mcp_tool"
    description: str = "fake MCP tool"
    response_format: str = "content_and_artifact"

    def _run(self, **_: Any) -> list[dict[str, str]]:
        return [{"title": "검색 결과"}]

    async def _arun(self, **_: Any) -> list[dict[str, str]]:
        return [{"title": "검색 결과"}]

    def invoke(self, *_: Any, **__: Any) -> list[dict[str, str]]:
        return [{"title": "검색 결과"}]

    async def ainvoke(self, *_: Any, **__: Any) -> list[dict[str, str]]:
        return [{"title": "검색 결과"}]


if __name__ == "__main__":
    unittest.main()
