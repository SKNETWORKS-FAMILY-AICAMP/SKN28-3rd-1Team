from __future__ import annotations

import argparse
import math
import os
import sys

from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import NAMESPACE_URL, uuid5

from langsmith import Client
from langsmith.evaluation import evaluate
from langsmith.schemas import Example

SUITE_DIR = Path(__file__).resolve().parents[1]
if str(SUITE_DIR) not in sys.path:
    sys.path.insert(0, str(SUITE_DIR))

from support.artifact_writer import append_jsonl, json_cell, write_csv, write_json
from support.case_data import CASES_DIR, RESULTS_DIR, RUN_LOGS_DIR, filter_cases, load_cases
from support.langsmith_evaluators import (
    behavior_contract,
    hallucination_guard,
    prompt_injection_resistance,
)
from support.sse_parser import parse_sse_text, summarize_events
from support.stream_client import post_chat_stream

DEFAULT_CHAT_STREAM_URL = "http://127.0.0.1:8003/chat/stream"
DEFAULT_CASE_FILES = (
    CASES_DIR / "agent_behavior_cases.json",
    CASES_DIR / "langsmith_evaluator_cases.json",
)
DEFAULT_EXPERIMENT_PREFIX = "skn28-agent-safety-eval"
RUN_NAME = "langsmith_evaluators"


def main() -> int:
    args = _parse_args()
    run_id = args.run_id or datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    upload_results = args.upload if args.upload is not None else bool(os.environ.get("LANGSMITH_API_KEY"))
    case_files = args.case_file or list(DEFAULT_CASE_FILES)
    cases = _load_all_cases(
        case_files,
        case_ids=set(args.case_id) if args.case_id else None,
    )

    run_name = args.run_name
    run_dir = RUN_LOGS_DIR / run_name
    sse_dir = run_dir / "sse"
    request_log = run_dir / "requests.jsonl"
    response_log = run_dir / "responses.jsonl"
    summary_path = run_dir / "summary.json"
    result_csv = args.result_csv

    run_dir.mkdir(parents=True, exist_ok=True)
    sse_dir.mkdir(parents=True, exist_ok=True)
    request_log.write_text("", encoding="utf-8")
    response_log.write_text("", encoding="utf-8")

    examples = [_example_from_case(case) for case in cases]
    target = _build_target(
        url=args.url,
        timeout_seconds=args.timeout,
        run_id=run_id,
        run_name=run_name,
        sse_dir=sse_dir,
        request_log=request_log,
        response_log=response_log,
    )

    client = Client() if upload_results else None
    results = evaluate(
        target,
        data=examples,
        evaluators=[
            behavior_contract,
            prompt_injection_resistance,
            hallucination_guard,
        ],
        experiment_prefix=args.experiment_prefix,
        description=(
            "SKN28 backend agent safety evaluation for prompt injection "
            "and hallucination guardrails."
        ),
        metadata={
            "test_suite": run_name,
            "run_name": run_name,
            "test_run_id": run_id,
            "case_files": [str(case_file) for case_file in case_files],
            "chat_stream_url": args.url,
        },
        max_concurrency=args.max_concurrency,
        client=client,
        upload_results=upload_results,
        error_handling="log",
    )

    dataframe = results.to_pandas()
    rows = _rows_from_dataframe(dataframe)
    write_csv(rows, result_csv)
    failed_rows = [row for row in rows if _row_failed(row)]
    experiment_name = _safe_results_attr(results, "experiment_name")
    experiment_url = _safe_results_attr(results, "url")

    write_json(
        summary_path,
        {
            "generated_at": datetime.now(UTC).isoformat(),
            "run_id": run_id,
            "scope": "backend agent LangSmith evaluators",
            "run_name": run_name,
            "upload_results": upload_results,
            "experiment_prefix": args.experiment_prefix,
            "experiment_name": experiment_name,
            "experiment_url": experiment_url,
            "chat_stream_url": args.url,
            "case_files": [str(case_file) for case_file in case_files],
            "total": len(rows),
            "passed": len(rows) - len(failed_rows),
            "failed": len(failed_rows),
            "result_csv": str(result_csv),
            "request_log": str(request_log),
            "response_log": str(response_log),
            "sse_dir": str(sse_dir),
        },
    )

    for row in rows:
        status = "FAIL" if _row_failed(row) else "PASS"
        print(
            f"{status} {row.get('case_id')} "
            f"stage={row.get('evaluation_stage')} "
            f"behavior={row.get('behavior_contract_passed')} "
            f"injection={row.get('prompt_injection_passed')} "
            f"hallucination={row.get('hallucination_passed')}"
        )

    print(
        "LangSmith evaluator cases: "
        f"total={len(rows)} passed={len(rows) - len(failed_rows)} failed={len(failed_rows)}"
    )
    print(f"upload_results={upload_results}")
    print(f"CSV: {result_csv}")
    print(f"SSE: {sse_dir}")
    if upload_results and experiment_url:
        print(f"LangSmith experiment: {experiment_url}")

    return 0 if not failed_rows else 1


def _build_target(
    *,
    url: str,
    timeout_seconds: float,
    run_id: str,
    run_name: str,
    sse_dir: Path,
    request_log: Path,
    response_log: Path,
) -> Any:
    def target(inputs: dict[str, Any]) -> dict[str, Any]:
        case_id = str(inputs["case_id"])
        payload = _build_payload(inputs, run_id=run_id, run_name=run_name)
        sse_path = sse_dir / f"{case_id}.sse"

        append_jsonl(
            request_log,
            {
                "record_type": "langsmith_evaluator_request",
                "case_id": case_id,
                "evaluation_stage": inputs.get("evaluation_stage"),
                "category": inputs.get("category"),
                "description": inputs.get("description"),
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
            if response.status_code != 200:
                summary.setdefault("error_events", []).append(
                    {"status_code": response.status_code}
                )
        except Exception as exc:  # noqa: BLE001
            sse_path.write_text("", encoding="utf-8")
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

        outputs = {
            "answer": summary.get("final_answer") or "",
            "actual_tools": summary.get("actual_tools") or [],
            "tool_calls": summary.get("tool_calls") or [],
            "error_events": summary.get("error_events") or [],
            "session_id": summary.get("session_id") or payload.get("session_id"),
            "turn_id": summary.get("turn_id"),
            "sse_path": str(sse_path),
            "event_count": summary.get("event_count") or 0,
        }
        append_jsonl(
            response_log,
            {
                "record_type": "langsmith_evaluator_response",
                "case_id": case_id,
                "category": inputs.get("category"),
                "outputs": outputs,
            },
        )
        return outputs

    return target


def _build_payload(inputs: dict[str, Any], *, run_id: str, run_name: str) -> dict[str, Any]:
    case_id = str(inputs["case_id"])
    metadata = {
        "test_suite": run_name,
        "test_case_id": case_id,
        "langsmith_run_name": case_id,
        "test_run_id": run_id,
        "evaluation_category": inputs.get("category"),
        "evaluation_stage": inputs.get("evaluation_stage"),
    }
    metadata.update(inputs.get("metadata") or {})
    return {
        "session_id": f"agent-eval-{case_id.lower()}-{run_id.lower()}",
        "message": str(inputs["message"]),
        "metadata": metadata,
    }


def _example_from_case(case: dict[str, Any]) -> Example:
    case_id = str(case["id"])
    evaluation_stage = str(case.get("evaluation_stage") or "")
    category = str(case.get("category") or _category_from_stage(evaluation_stage))
    return Example(
        id=uuid5(NAMESPACE_URL, f"skn28-agent-langsmith-evaluator:{case_id}"),
        inputs={
            "case_id": case_id,
            "evaluation_stage": evaluation_stage,
            "category": category,
            "description": case.get("description"),
            "message": case["message"],
            "metadata": case.get("metadata") or {},
        },
        outputs={
            "behavior_expected": case.get("expected") or {},
            "prompt_injection": case.get("prompt_injection") or {},
            "hallucination": case.get("hallucination") or {},
        },
        metadata={
            "case_id": case_id,
            "evaluation_stage": evaluation_stage,
            "category": category,
            "description": case.get("description"),
        },
    )


def _load_all_cases(
    case_files: list[Path],
    *,
    case_ids: set[str] | None,
) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    seen_case_ids: set[str] = set()
    for case_file in case_files:
        for case in load_cases(case_file):
            case_id = str(case["id"])
            if case_id in seen_case_ids:
                raise ValueError(f"Duplicate case id: {case_id}")
            seen_case_ids.add(case_id)
            normalized_case = dict(case)
            normalized_case.setdefault(
                "category",
                _category_from_stage(str(normalized_case.get("evaluation_stage") or "")),
            )
            cases.append(normalized_case)
    return filter_cases(cases, case_ids=case_ids)


def _category_from_stage(stage: str) -> str:
    return {
        "1_tool_call_selection": "tool_call_selection",
        "2_address_tool_call_required": "address_tool_call_required",
        "3_tool_hallucination": "tool_hallucination",
        "4_tool_prompt_injection": "tool_prompt_injection",
    }.get(stage, "")


def _rows_from_dataframe(dataframe: Any) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for record in dataframe.to_dict(orient="records"):
        behavior_passed = _feedback_cell(record.get("feedback.behavior_contract"))
        injection_passed = _feedback_cell(record.get("feedback.prompt_injection_resistance"))
        hallucination_passed = _feedback_cell(record.get("feedback.hallucination_guard"))
        row = {
            "case_id": _csv_cell(record.get("inputs.case_id")),
            "evaluation_stage": _csv_cell(record.get("inputs.evaluation_stage")),
            "category": _csv_cell(record.get("inputs.category")),
            "description": _csv_cell(record.get("inputs.description")),
            "message": _csv_cell(record.get("inputs.message")),
            "expected_behavior_json": _csv_cell(record.get("reference.behavior_expected") or {}),
            "expected_prompt_injection_json": _csv_cell(
                record.get("reference.prompt_injection") or {}
            ),
            "expected_hallucination_json": _csv_cell(
                record.get("reference.hallucination") or {}
            ),
            "actual_tools_json": _csv_cell(record.get("outputs.actual_tools") or []),
            "actual_answer_preview": _truncate(str(record.get("outputs.answer") or "")),
            "sse_path": _csv_cell(record.get("outputs.sse_path")),
            "behavior_contract_passed": behavior_passed,
            "prompt_injection_passed": injection_passed,
            "hallucination_passed": hallucination_passed,
            "execution_error": _csv_cell(record.get("error")),
            "execution_time": _csv_cell(record.get("execution_time")),
        }
        row["passed"] = not _row_failed(row)
        row["failure_summary"] = _failure_summary(row)
        rows.append(row)
    return rows


def _safe_results_attr(results: Any, attr_name: str) -> Any:
    try:
        return getattr(results, attr_name)
    except ValueError:
        return None


def _csv_cell(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    if isinstance(value, bool | int | float | str):
        return value
    return json_cell(value)


def _feedback_cell(value: Any) -> str:
    cell = _csv_cell(value)
    if cell == "":
        return "not_applicable"
    return str(cell)


def _truncate(text: str, limit: int = 500) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "..."


def _row_failed(row: dict[str, Any]) -> bool:
    if row.get("execution_error"):
        return True
    for key in (
        "behavior_contract_passed",
        "prompt_injection_passed",
        "hallucination_passed",
    ):
        value = row.get(key)
        if value in ("", None, "not_applicable"):
            continue
        if value is False or str(value).casefold() == "false":
            return True
    return False


def _failure_summary(row: dict[str, Any]) -> str:
    failures = []
    if row.get("execution_error"):
        failures.append(f"execution_error={row['execution_error']}")
    for key in (
        "behavior_contract_passed",
        "prompt_injection_passed",
        "hallucination_passed",
    ):
        if str(row.get(key)).casefold() == "false":
            failures.append(key)
    return "; ".join(failures)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run LangSmith evaluators for prompt injection and hallucination cases.",
    )
    parser.add_argument(
        "--url",
        default=os.environ.get("AGENT_TEST_CHAT_URL", DEFAULT_CHAT_STREAM_URL),
        help=f"Backend /chat/stream URL. Default: {DEFAULT_CHAT_STREAM_URL}",
    )
    parser.add_argument(
        "--case-file",
        type=Path,
        action="append",
        default=None,
        help=(
            "Case JSON file. Can be repeated. "
            "Default: agent_behavior_cases.json + langsmith_evaluator_cases.json."
        ),
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
    parser.add_argument(
        "--result-csv",
        type=Path,
        default=RESULTS_DIR / "agent_behavior_eval_results.csv",
        help="CSV path for local evaluator results.",
    )
    parser.add_argument(
        "--run-name",
        default=RUN_NAME,
        help=f"Run log folder name under run_logs. Default: {RUN_NAME}",
    )
    parser.add_argument(
        "--experiment-prefix",
        default=os.environ.get("AGENT_EVAL_EXPERIMENT_PREFIX", DEFAULT_EXPERIMENT_PREFIX),
        help="LangSmith experiment name prefix.",
    )
    parser.add_argument(
        "--max-concurrency",
        type=int,
        default=0,
        help="LangSmith evaluate max concurrency. 0 means sequential.",
    )
    upload_group = parser.add_mutually_exclusive_group()
    upload_group.add_argument(
        "--upload",
        dest="upload",
        action="store_true",
        help="Upload evaluator experiment results to LangSmith.",
    )
    upload_group.add_argument(
        "--no-upload",
        dest="upload",
        action="store_false",
        help="Run locally without uploading evaluator results to LangSmith.",
    )
    parser.set_defaults(upload=None)
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(main())
