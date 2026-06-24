from __future__ import annotations

import csv

from pathlib import Path
from typing import Any


PASS_COLUMNS = (
    "behavior_contract_passed",
    "prompt_injection_passed",
    "hallucination_passed",
)


def read_eval_rows(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def index_rows_by_case_id(rows: list[dict[str, Any]], *, label: str) -> dict[str, dict[str, Any]]:
    indexed: dict[str, dict[str, Any]] = {}
    duplicates: list[str] = []
    for row in rows:
        case_id = str(row.get("case_id") or "")
        if not case_id:
            raise ValueError(f"{label} row is missing case_id")
        if case_id in indexed:
            duplicates.append(case_id)
        indexed[case_id] = row

    if duplicates:
        raise ValueError(f"{label} has duplicate case ids: {sorted(duplicates)}")
    return indexed


def compare_eval_rows(
    *,
    baseline_rows: list[dict[str, Any]],
    candidate_rows: list[dict[str, Any]],
    baseline_version: str,
    candidate_version: str,
) -> list[dict[str, Any]]:
    baseline_by_case = index_rows_by_case_id(baseline_rows, label=baseline_version)
    candidate_by_case = index_rows_by_case_id(candidate_rows, label=candidate_version)

    case_ids = sorted(set(baseline_by_case) | set(candidate_by_case))
    rows: list[dict[str, Any]] = []
    for case_id in case_ids:
        baseline = baseline_by_case.get(case_id)
        candidate = candidate_by_case.get(case_id)
        rows.append(
            build_comparison_row(
                case_id=case_id,
                baseline=baseline,
                candidate=candidate,
                baseline_version=baseline_version,
                candidate_version=candidate_version,
            )
        )
    return rows


def build_comparison_row(
    *,
    case_id: str,
    baseline: dict[str, Any] | None,
    candidate: dict[str, Any] | None,
    baseline_version: str,
    candidate_version: str,
) -> dict[str, Any]:
    baseline_passed = _passed(baseline)
    candidate_passed = _passed(candidate)
    return {
        "case_id": case_id,
        "evaluation_stage": _first_value("evaluation_stage", baseline, candidate),
        "category": _first_value("category", baseline, candidate),
        "baseline_version": baseline_version,
        "candidate_version": candidate_version,
        "baseline_passed": _status_cell(baseline_passed),
        "candidate_passed": _status_cell(candidate_passed),
        "change": _change_label(baseline_passed, candidate_passed),
        "baseline_behavior_contract_passed": _value(baseline, "behavior_contract_passed"),
        "candidate_behavior_contract_passed": _value(candidate, "behavior_contract_passed"),
        "baseline_prompt_injection_passed": _value(baseline, "prompt_injection_passed"),
        "candidate_prompt_injection_passed": _value(candidate, "prompt_injection_passed"),
        "baseline_hallucination_passed": _value(baseline, "hallucination_passed"),
        "candidate_hallucination_passed": _value(candidate, "hallucination_passed"),
        "baseline_actual_tools_json": _value(baseline, "actual_tools_json"),
        "candidate_actual_tools_json": _value(candidate, "actual_tools_json"),
        "baseline_answer_preview": _value(baseline, "actual_answer_preview"),
        "candidate_answer_preview": _value(candidate, "actual_answer_preview"),
        "baseline_failure_summary": _value(baseline, "failure_summary"),
        "candidate_failure_summary": _value(candidate, "failure_summary"),
        "baseline_sse_path": _value(baseline, "sse_path"),
        "candidate_sse_path": _value(candidate, "sse_path"),
    }


def _passed(row: dict[str, Any] | None) -> bool | None:
    if row is None:
        return None
    passed = row.get("passed")
    if str(passed).casefold() == "true":
        return True
    if str(passed).casefold() == "false":
        return False

    for column in PASS_COLUMNS:
        value = row.get(column)
        if value in ("", None, "not_applicable"):
            continue
        if str(value).casefold() == "false":
            return False
    return True


def _change_label(baseline_passed: bool | None, candidate_passed: bool | None) -> str:
    if baseline_passed is None:
        return "candidate_only"
    if candidate_passed is None:
        return "baseline_only"
    if baseline_passed and candidate_passed:
        return "unchanged_pass"
    if not baseline_passed and not candidate_passed:
        return "unchanged_fail"
    if not baseline_passed and candidate_passed:
        return "improved"
    return "regressed"


def _status_cell(value: bool | None) -> str:
    if value is None:
        return "missing"
    return str(value)


def _first_value(key: str, *rows: dict[str, Any] | None) -> Any:
    for row in rows:
        value = _value(row, key)
        if value not in ("", None):
            return value
    return ""


def _value(row: dict[str, Any] | None, key: str) -> Any:
    if row is None:
        return ""
    return row.get(key, "")
