from __future__ import annotations

import unittest

from blackbox.runners.server_call_runner import run_server_call_cases
from blackbox.support.case_data import (
    RESULTS_DIR,
    RUN_LOGS_DIR,
    load_cases,
    load_fixture_map,
)


FAKE_SERVER_LOG_DIR = RUN_LOGS_DIR / "fake_server_call"
FAKE_SERVER_SUMMARY = FAKE_SERVER_LOG_DIR / "summary.json"
FAKE_RESULTS_CSV = RESULTS_DIR / "fake_api_results.csv"


class ExternalMcpHttpConnectionTest(unittest.IsolatedAsyncioTestCase):
    async def test_server_connection_list_tools_and_call_cases(self) -> None:
        result = await run_server_call_cases(
            mode="fake",
            cases=load_cases(),
            fixtures=load_fixture_map(),
            log_dir=FAKE_SERVER_LOG_DIR,
            result_csv=FAKE_RESULTS_CSV,
            summary_path=FAKE_SERVER_SUMMARY,
            summary_scope="external_mcp MCP server-call tests with fake API fixtures",
        )

        self.assertEqual(result.failed, 0, "\n".join(result.error_messages))
