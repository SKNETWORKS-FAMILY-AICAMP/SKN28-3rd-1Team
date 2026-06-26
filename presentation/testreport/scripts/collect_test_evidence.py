#!/usr/bin/env python3
"""Collect read-only evidence for the system test report.

This script does not run product services and does not modify project source
files. It only reads existing tests, prompts, blackbox artifacts, and frontend
source guards, then writes a JSON summary under presentation/testreport/results.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


TEST_PATTERN = re.compile(r"^\s+(?:async\s+)?def\s+test_", re.MULTILINE)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def safe_read_text(path: Path) -> str:
    if not path.exists():
        return ""
    return read_text(path)


def count_test_methods(root: Path, pattern: str) -> dict[str, Any]:
    files = sorted(root.glob(pattern))
    by_file: dict[str, int] = {}
    total = 0
    for path in files:
        count = len(TEST_PATTERN.findall(read_text(path)))
        by_file[str(path)] = count
        total += count
    return {"total": total, "files": by_file}


def count_external_mcp_tests(root: Path) -> dict[str, Any]:
    files = sorted((root / "external_mcp/tests").rglob("test_*.py"))
    by_file: dict[str, int] = {}
    total = 0
    for path in files:
        count = len(TEST_PATTERN.findall(read_text(path)))
        by_file[str(path)] = count
        total += count
    return {"total": total, "files": by_file}


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(read_text(path))


def count_csv_passes(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"exists": False, "total": 0, "passed": 0, "failed": 0}

    total = 0
    passed = 0
    failed = 0
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            total += 1
            value = str(row.get("passed", "")).strip().lower()
            if value in {"true", "1", "yes", "pass", "passed"}:
                passed += 1
            else:
                failed += 1
    return {"exists": True, "total": total, "passed": passed, "failed": failed}


def contains_checks(root: Path, checks: dict[str, dict[str, list[str]]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for name, spec in checks.items():
        path = root / spec["path"][0]
        text = safe_read_text(path)
        snippets = spec["snippets"]
        result[name] = {
            "path": str(path),
            "exists": path.exists(),
            "checks": {snippet: snippet in text for snippet in snippets},
        }
        result[name]["passed"] = result[name]["exists"] and all(
            result[name]["checks"].values()
        )
    return result


def find_frontend_test_files(root: Path) -> list[str]:
    frontend_root = root / "frontend_migration"
    files: list[str] = []
    if not frontend_root.exists():
        return files

    for path in frontend_root.rglob("*"):
        if not path.is_file():
            continue
        parts = set(path.parts)
        if "node_modules" in parts or ".next" in parts:
            continue
        if re.search(r"(test|spec)\.[jt]sx?$", path.name):
            files.append(str(path))
    return sorted(files)


def get_git_info(root: Path) -> dict[str, str]:
    def run(args: list[str]) -> str:
        return subprocess.check_output(args, cwd=root, text=True).strip()

    try:
        return {
            "branch": run(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
            "head": run(["git", "rev-parse", "HEAD"]),
        }
    except Exception as exc:  # pragma: no cover - defensive reporting only
        return {"error": str(exc)}


def summarize_langsmith_traces(root: Path) -> dict[str, Any]:
    trace_dir = root / "presentation/testreport/langsmith/traces"
    files = sorted(trace_dir.glob("*.jsonl"))
    run_types: dict[str, int] = {}
    statuses: dict[str, int] = {}
    root_success = 0
    input_output_records = 0

    for path in files:
        with path.open("r", encoding="utf-8") as handle:
            records = [json.loads(line) for line in handle if line.strip()]
        if records and records[0].get("status") == "success":
            root_success += 1
        for record in records:
            run_type = str(record.get("run_type") or "unknown")
            status = str(record.get("status") or "unknown")
            run_types[run_type] = run_types.get(run_type, 0) + 1
            statuses[status] = statuses.get(status, 0) + 1
            if "inputs" in record or "outputs" in record:
                input_output_records += 1

    return {
        "trace_dir": str(trace_dir),
        "trace_file_count": len(files),
        "root_success_count": root_success,
        "run_types": run_types,
        "statuses": statuses,
        "input_output_records": input_output_records,
        "metadata_only": len(files) > 0 and input_output_records == 0,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".", help="Repository root")
    parser.add_argument(
        "--out",
        default="presentation/testreport/results/test_evidence_summary.json",
        help="Output JSON path",
    )
    args = parser.parse_args()

    root = Path(args.repo).resolve()
    out_path = (root / args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    backend_tests = count_test_methods(root / "backend/tests", "test_*.py")
    external_tests = count_external_mcp_tests(root)

    fake_summary_path = root / "external_mcp/tests/blackbox/run_logs/fake_server_call/summary.json"
    live_summary_path = root / "external_mcp/tests/blackbox/run_logs/live_server_call/summary.json"
    fake_summary = load_json(fake_summary_path)
    live_summary = load_json(live_summary_path)
    fake_csv = count_csv_passes(root / "external_mcp/tests/blackbox/results/fake_api_results.csv")
    live_csv = count_csv_passes(root / "external_mcp/tests/blackbox/results/live_api_results.csv")

    package_json = load_json(root / "frontend_migration/package.json")
    frontend_test_files = find_frontend_test_files(root)

    prompt_checks = contains_checks(
        root,
        {
            "main_agent_no_fabricated_coordinates": {
                "path": ["backend/src/agents/main_agent/system_prompt.j2"],
                "snippets": ["좌표", "만들지 않는다"],
            },
            "screen_control_coordinates_are_internal": {
                "path": ["backend/src/agents/screen_control_agent/system_prompt.j2"],
                "snippets": [
                    "위도, 경도, coordinate.lat/lng",
                    "지도 표시와 화면 제어 tool 입력에만 사용하는 내부 데이터",
                    "직접 노출하지 않는다",
                ],
            },
            "speech_text_does_not_read_coordinates": {
                "path": ["backend/src/agents/speech_text_agent/speech_text_prompt.j2"],
                "snippets": [
                    "Coordinates are internal map data.",
                    "Do not read latitude, longitude, lat, lon",
                    "mapx, or mapy values aloud",
                ],
            },
        },
    )

    frontend_guard_checks = contains_checks(
        root,
        {
            "chat_session_ignores_empty_or_busy_submit": {
                "path": ["frontend_migration/src/page/chat/hooks/use-chat-session.ts"],
                "snippets": ["const text = raw.trim();", "if (!text || isBusy) return;"],
            },
            "composer_blocks_empty_submit": {
                "path": ["frontend_migration/src/ui/components/chat/chat-composer.tsx"],
                "snippets": ["disabled={isBusy || !input.trim()}", "event.key !== \"Enter\""],
            },
            "bff_returns_empty_message_error": {
                "path": ["frontend_migration/src/bff/chat/route.ts"],
                "snippets": ["질문 내용을 찾지 못했어요. 다시 입력해 주세요."],
            },
            "bff_handles_backend_failure": {
                "path": ["frontend_migration/src/bff/chat/backend-chat-stream-adapter.ts"],
                "snippets": ["if (!response.ok || !response.body)", "질문 내용을 찾지 못했어요. 다시 입력해 주세요."],
            },
            "bff_records_invalid_workspace_command": {
                "path": ["frontend_migration/src/bff/chat/backend-chat-stream-adapter.ts"],
                "snippets": ["screen_control.command.invalid"],
            },
        },
    )

    backend_api_checks = contains_checks(
        root,
        {
            "chat_stream_endpoint_registered": {
                "path": ["backend/src/django_backend/urls.py"],
                "snippets": ["path(\"chat/stream\", chat_stream)"],
            },
            "chat_stream_handles_json_and_validation_errors": {
                "path": ["backend/src/django_backend/urls.py"],
                "snippets": ["except json.JSONDecodeError", "except ValidationError"],
            },
            "chat_stream_emits_agent_failed_event": {
                "path": ["backend/src/django_backend/urls.py"],
                "snippets": ["agent_failed", "_chat_stream_events"],
            },
        },
    )

    external_mcp_checks = contains_checks(
        root,
        {
            "external_mcp_tools_registered": {
                "path": ["external_mcp/src/server.py"],
                "snippets": ["naver.search", "web.search", "tmap.search_poi", "tmap.route_pedestrian"],
            },
            "backend_loads_external_mcp_tools": {
                "path": ["backend/src/tools/from_mcp.py"],
                "snippets": ["MultiServerMCPClient", "load_external_mcp_tools", "settings.external_mcp.url"],
            },
            "main_agent_profile_enables_external_mcp": {
                "path": ["backend/src/tools/profiles/main_agent.json"],
                "snippets": ["\"external_mcp\": true"],
            },
        },
    )

    coverage_files = [
        str(path)
        for path in sorted(root.glob("**/coverage.xml"))
        if "node_modules" not in path.parts and ".venv" not in path.parts
    ]

    langsmith_traces = summarize_langsmith_traces(root)

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "repo": get_git_info(root),
        "backend": {
            "unit_test_methods": backend_tests,
            "api_error_path_checks": backend_api_checks,
            "prompt_coordinate_visibility_checks": prompt_checks,
        },
        "external_mcp": {
            "unit_test_methods": external_tests,
            "tool_registration_checks": external_mcp_checks,
            "blackbox": {
                "fake_summary": {
                    "total": fake_summary.get("total"),
                    "passed": fake_summary.get("passed"),
                    "failed": fake_summary.get("failed"),
                    "expected_tools": fake_summary.get("expected_tools", []),
                },
                "live_summary": {
                    "total": live_summary.get("total"),
                    "passed": live_summary.get("passed"),
                    "failed": live_summary.get("failed"),
                    "expected_tools": live_summary.get("expected_tools", []),
                    "secret_source": live_summary.get("secret_source"),
                    "secrets_recorded": live_summary.get("secrets_recorded"),
                },
                "fake_csv": fake_csv,
                "live_csv": live_csv,
            },
        },
        "frontend_migration": {
            "package_scripts": package_json.get("scripts", {}),
            "test_files": frontend_test_files,
            "automated_ui_test_file_count": len(frontend_test_files),
            "guard_checks": frontend_guard_checks,
        },
        "observability": {
            "langsmith_schema_present": "LANGSMITH_TRACING"
            in safe_read_text(root / "backend/.env.schema"),
            "langsmith_trace_export_used_by_this_report": bool(
                langsmith_traces["trace_file_count"]
            ),
            "langsmith_trace_export": langsmith_traces,
            "note": "This report uses local test artifacts, source checks, and metadata-only LangSmith trace exports.",
        },
        "coverage": {
            "coverage_files_found": coverage_files,
            "coverage_metric_available": bool(coverage_files),
        },
    }

    out_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out_path.relative_to(root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
