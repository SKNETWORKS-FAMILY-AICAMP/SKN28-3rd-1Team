from __future__ import annotations

import argparse
import os
import sys

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

SUITE_DIR = Path(__file__).resolve().parents[1]
if str(SUITE_DIR) not in sys.path:
    sys.path.insert(0, str(SUITE_DIR))

from support.artifact_writer import append_jsonl, json_cell, write_csv, write_json
from support.case_data import (
    DEFAULT_AGENT_BEHAVIOR_CASE_FILE,
    RESULTS_DIR,
    RUN_LOGS_DIR,
    filter_cases,
    load_cases,
)
from support.result_checker import validate_case
from support.sse_parser import parse_sse_text, summarize_events
from support.stream_client import post_chat_stream

DEFAULT_CHAT_STREAM_URL = "http://127.0.0.1:8003/chat/stream"
RUN_NAME = "agent_behavior"


def main() -> int:
    args = _parse_args()
    run_id = args.run_id or datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    cases = filter_cases(
        load_cases(args.case_file),
        case_ids=set(args.case_id) if args.case_id else None,
    )

    run_dir = RUN_LOGS_DIR / RUN_NAME
    sse_dir = run_dir / "sse"
    result_csv = RESULTS_DIR / "agent_behavior_results.csv"
    request_log = run_dir / "requests.jsonl"
    response_log = run_dir / "responses.jsonl"
    summary_path = run_dir / "summary.json"

    run_dir.mkdir(parents=True, exist_ok=True)
    sse_dir.mkdir(parents=True, exist_ok=True)
    request_log.write_text("", encoding="utf-8")
    response_log.write_text("", encoding="utf-8")

    started_at = datetime.now(UTC).isoformat()
    rows: list[dict[str, Any]] = []

    for case in cases:
        row = _run_case(
            case=case,
            run_id=run_id,
            url=args.url,
            timeout_seconds=args.timeout,
            sse_dir=sse_dir,
            request_log=request_log,
            response_log=response_log,
        )
        rows.append(row)
        status = "PASS" if row["passed"] else "FAIL"
        print(f"{status} {row['case_id']} tools={row['actual_tools']} errors={row['error_count']}")

    write_csv(rows, result_csv)
    failed = [row for row in rows if not row["passed"]]
    write_json(
        summary_path,
        {
            "generated_at": datetime.now(UTC).isoformat(),
            "started_at": started_at,
            "run_id": run_id,
            "scope": "backend agent behavior tests",
            "chat_stream_url": args.url,
            "case_file": str(args.case_file),
            "total": len(rows),
            "passed": len(rows) - len(failed),
            "failed": len(failed),
            "result_csv": str(result_csv),
            "request_log": str(request_log),
            "response_log": str(response_log),
            "sse_dir": str(sse_dir),
        },
    )

    print(
        "Agent behavior cases: "
        f"total={len(rows)} passed={len(rows) - len(failed)} failed={len(failed)}"
    )
    print(f"CSV: {result_csv}")
    print(f"SSE: {sse_dir}")
    return 0 if not failed else 1


def _run_case(
    *,
    case: dict[str, Any],
    run_id: str,
    url: str,
    timeout_seconds: float,
    sse_dir: Path,
    request_log: Path,
    response_log: Path,
) -> dict[str, Any]:
    payload = _build_payload(case, run_id=run_id)
    case_id = str(case["id"])
    sse_path = sse_dir / f"{case_id}.sse"

    append_jsonl(
        request_log,
        {
            "record_type": "agent_behavior_request",
            "case_id": case_id,
            "source_mcp_case_id": case.get("source_mcp_case_id"),
            "description": case.get("description"),
            "chat_stream_url": url,
            "payload": payload,
        },
    )

    try:
        response = post_chat_stream(
            url=url,
            payload=payload,
            timeout_seconds=timeout_seconds,
        )
        sse_path.write_text(response.body, encoding="utf-8")
        events = parse_sse_text(response.body)
        summary = summarize_events(events)
        errors = validate_case(case, summary)
        if response.status_code != 200:
            errors.append(f"HTTP status was {response.status_code}")
    except Exception as exc:  # noqa: BLE001
        summary = {
            "event_count": 0,
            "event_type_counts": {},
            "actual_tool_use": False,
            "actual_tools": [],
            "tool_calls": [],
            "final_answer": "",
            "speech_final": "",
            "error_events": [{"exception": str(exc)}],
            "session_id": payload.get("session_id"),
            "turn_id": None,
        }
        errors = [f"request failed: {exc}"]
        sse_path.write_text("", encoding="utf-8")

    passed = not errors
    response_record = {
        "record_type": "agent_behavior_response",
        "case_id": case_id,
        "source_mcp_case_id": case.get("source_mcp_case_id"),
        "passed": passed,
        "errors": errors,
        "expected": case.get("expected"),
        "actual_summary": summary,
        "sse_path": str(sse_path),
    }
    append_jsonl(response_log, response_record)

    return {
        "case_id": case_id,
        "evaluation_stage": str(case.get("evaluation_stage") or ""),
        "source_mcp_case_id": str(case.get("source_mcp_case_id") or ""),
        "run_id": run_id,
        "message": str(case["message"]),
        "expected_tool_use": bool((case.get("expected") or {}).get("tool_use")),
        "actual_tool_use": bool(summary.get("actual_tool_use")),
        "actual_tools": "|".join(summary.get("actual_tools", [])),
        "expected_tools_json": json_cell((case.get("expected") or {}).get("required_any_tools", [])),
        "required_all_tools_json": json_cell((case.get("expected") or {}).get("required_all_tools", [])),
        "forbidden_tool_fragments_json": json_cell(
            (case.get("expected") or {}).get("forbidden_tool_fragments", [])
        ),
        "final_answer_exists": bool(str(summary.get("final_answer") or "").strip()),
        "final_answer_preview": str(summary.get("final_answer") or "")[:300],
        "error_exists": bool(summary.get("error_events")),
        "event_count": int(summary.get("event_count") or 0),
        "session_id": str(summary.get("session_id") or payload.get("session_id") or ""),
        "turn_id": str(summary.get("turn_id") or ""),
        "sse_path": str(sse_path),
        "passed": passed,
        "error_count": len(errors),
        "errors_json": json_cell(errors),
    }


def _build_payload(case: dict[str, Any], *, run_id: str) -> dict[str, Any]:
    case_id = str(case["id"])
    expected = case.get("expected") or {}
    metadata = {
        "test_suite": "agent_behavior",
        "test_case_id": case_id,
        "test_run_id": run_id,
        "source_mcp_case_id": case.get("source_mcp_case_id"),
        "tool_source": "external_mcp",
        "expected_tool_use": expected.get("tool_use"),
        "required_any_tools": expected.get("required_any_tools", []),
        "required_all_tools": expected.get("required_all_tools", []),
        "forbidden_tool_fragments": expected.get("forbidden_tool_fragments", []),
    }
    metadata.update(case.get("metadata") or {})
    return {
        "session_id": f"agent-behavior-{case_id.lower()}-{run_id.lower()}",
        "message": str(case["message"]),
        "metadata": metadata,
    }


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run backend agent behavior tests.",
    )
    parser.add_argument(
        "--url",
        default=os.environ.get("AGENT_TEST_CHAT_URL", DEFAULT_CHAT_STREAM_URL),
        help=f"Backend /chat/stream URL. Default: {DEFAULT_CHAT_STREAM_URL}",
    )
    parser.add_argument(
        "--case-file",
        type=Path,
        default=DEFAULT_AGENT_BEHAVIOR_CASE_FILE,
        help="Agent behavior case JSON file.",
    )
    parser.add_argument(
        "--case-id",
        action="append",
        help="Run only this case id. Can be repeated.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=240.0,
        help="Socket timeout seconds for each streaming request.",
    )
    parser.add_argument(
        "--run-id",
        default=os.environ.get("AGENT_TEST_RUN_ID"),
        help="Optional run id used in session_id. Defaults to a timestamp.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(main())
