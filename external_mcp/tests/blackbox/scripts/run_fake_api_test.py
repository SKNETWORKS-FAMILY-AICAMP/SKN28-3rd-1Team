from __future__ import annotations

import asyncio
import sys

from pathlib import Path

REPO_TESTS_DIR = Path(__file__).resolve().parents[2]
REPO_SRC_DIR = REPO_TESTS_DIR.parent / "src"
for import_path in (REPO_TESTS_DIR, REPO_SRC_DIR):
    if str(import_path) not in sys.path:
        sys.path.insert(0, str(import_path))

from blackbox.runners.server_call_runner import run_server_call_cases
from blackbox.support.case_data import (
    RESULTS_DIR,
    RUN_LOGS_DIR,
    load_cases,
    load_fake_api_response_map,
)

FAKE_SERVER_LOG_DIR = RUN_LOGS_DIR / "fake_server_call"
FAKE_SERVER_SUMMARY = FAKE_SERVER_LOG_DIR / "summary.json"
FAKE_RESULTS_CSV = RESULTS_DIR / "fake_api_results.csv"


async def main() -> int:
    result = await run_server_call_cases(
        mode="fake",
        cases=load_cases(),
        fake_api_responses=load_fake_api_response_map(),
        log_dir=FAKE_SERVER_LOG_DIR,
        result_csv=FAKE_RESULTS_CSV,
        summary_path=FAKE_SERVER_SUMMARY,
        summary_scope="external_mcp MCP server-call tests with fake API responses",
        verbose=True,
    )

    print(
        "Fake MCP cases: "
        f"total={result.total} passed={result.passed} failed={result.failed}"
    )
    print(f"CSV: {result.csv_path}")
    return 0 if result.failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
