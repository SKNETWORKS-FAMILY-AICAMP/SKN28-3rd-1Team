from __future__ import annotations

import csv
import json

from datetime import UTC, datetime
from pathlib import Path
from typing import Any


CSV_FIELDNAMES = [
    "case_id",
    "execution_mode",
    "provider_group",
    "tool",
    "input_value",
    "input_arguments_json",
    "expected_result_json",
    "actual_summary_json",
    "diagnostics_json",
    "actual_response_json",
    "passed",
    "errors_json",
]


def append_jsonl(path: Path, record: dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")


def write_summary(
    rows: list[dict[str, Any]],
    *,
    mcp_url: str,
    started_at: str,
    summary_path: Path,
    summary_scope: str,
    result_csv: Path,
    requests_artifact: Path,
    responses_artifact: Path,
    mode: str,
    expected_tool_names: list[str],
) -> None:
    failed = [row for row in rows if not row["passed"]]
    summary: dict[str, Any] = {
        "generated_at": datetime.now(UTC).isoformat(),
        "started_at": started_at,
        "scope": summary_scope,
        "mode": mode,
        "mcp_url": mcp_url,
        "expected_tools": expected_tool_names,
        "total": len(rows),
        "passed": len(rows) - len(failed),
        "failed": len(failed),
        "cases": rows,
        "artifacts": {
            "requests": requests_artifact.name,
            "responses": responses_artifact.name,
            "csv": str(result_csv.parent.name + "/" + result_csv.name),
        },
    }
    if mode == "live":
        summary["secret_source"] = "infisical"
        summary["secrets_recorded"] = False

    summary_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_csv(rows: list[dict[str, Any]], result_csv: Path) -> None:
    with result_csv.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def input_value(arguments: dict[str, Any]) -> str:
    if "query" in arguments:
        return str(arguments.get("query") or "")
    if "keyword" in arguments:
        return str(arguments.get("keyword") or "")

    start_name = arguments.get("start_name")
    end_name = arguments.get("end_name")
    if start_name or end_name:
        return f"{start_name or ''} -> {end_name or ''}".strip()

    return json_cell(arguments)


def json_cell(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)
