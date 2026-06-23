from __future__ import annotations

import asyncio
import json
import os
import sys

from datetime import UTC, datetime
from pathlib import Path

REPO_TESTS_DIR = Path(__file__).resolve().parents[1]
REPO_SRC_DIR = REPO_TESTS_DIR.parent / "src"
for import_path in (REPO_TESTS_DIR, REPO_SRC_DIR):
    if str(import_path) not in sys.path:
        sys.path.insert(0, str(import_path))

from blackbox.runners.server_call_runner import run_server_call_cases
from blackbox.support.case_data import RESULTS_DIR, RUN_LOGS_DIR, read_json

LIVE_CASES_FILE = Path(__file__).with_name("cases") / "live_mcp_cases.json"
LIVE_SERVER_LOG_DIR = RUN_LOGS_DIR / "live_server_call"
LIVE_SERVER_SUMMARY = LIVE_SERVER_LOG_DIR / "summary.json"
LIVE_RESULTS_CSV = RESULTS_DIR / "live_api_results.csv"

REQUIRED_ENV_NAMES = [
    "EXTERNAL_MCP_NAVER_CLIENT_ID",
    "EXTERNAL_MCP_NAVER_CLIENT_SECRET",
    "EXTERNAL_MCP_FIRECRAWL_API_KEY",
    "EXTERNAL_MCP_TMAP_APP_KEY",
]


async def main() -> int:
    LIVE_SERVER_LOG_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    missing_env = [name for name in REQUIRED_ENV_NAMES if not os.environ.get(name)]
    if missing_env:
        _write_missing_env_summary(missing_env)
        print("Missing live API env vars: " + ", ".join(missing_env))
        print("Run this through Infisical, for example:")
        print(
            "infisical run --projectId <external-mcp-project-id> "
            "--env dev --path / -- uv run python tests/blackbox/run_live_api_test.py"
        )
        return 2

    result = await run_server_call_cases(
        mode="live",
        cases=read_json(LIVE_CASES_FILE),
        log_dir=LIVE_SERVER_LOG_DIR,
        result_csv=LIVE_RESULTS_CSV,
        summary_path=LIVE_SERVER_SUMMARY,
        summary_scope="external_mcp MCP server-call tests with live API responses",
        verbose=True,
    )

    print(
        "Live MCP cases: "
        f"total={result.total} passed={result.passed} failed={result.failed}"
    )
    print(f"CSV: {result.csv_path}")
    return 0


def _write_missing_env_summary(missing_env: list[str]) -> None:
    summary = {
        "generated_at": datetime.now(UTC).isoformat(),
        "scope": "external_mcp MCP server-call tests with live API responses",
        "status": "blocked",
        "reason": "Missing live API environment variables.",
        "missing_env": missing_env,
        "secret_source": "infisical",
    }
    LIVE_SERVER_SUMMARY.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
