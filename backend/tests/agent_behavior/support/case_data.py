from __future__ import annotations

import json

from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parents[1]
CASES_DIR = BASE_DIR / "cases"
RESULTS_DIR = BASE_DIR / "results"
RUN_LOGS_DIR = BASE_DIR / "run_logs"

DEFAULT_AGENT_BEHAVIOR_CASE_FILE = CASES_DIR / "agent_behavior_cases.json"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_cases(path: Path = DEFAULT_AGENT_BEHAVIOR_CASE_FILE) -> list[dict[str, Any]]:
    cases = read_json(path)
    if not isinstance(cases, list):
        raise ValueError(f"Case file must contain a JSON array: {path}")

    for case in cases:
        if not isinstance(case, dict):
            raise ValueError(f"Case item must be an object: {path}")
        for key in ("id", "message", "expected"):
            if key not in case:
                raise ValueError(f"Case is missing required key '{key}': {case}")

    return cases


def filter_cases(
    cases: list[dict[str, Any]],
    *,
    case_ids: set[str] | None,
) -> list[dict[str, Any]]:
    if not case_ids:
        return cases

    selected = [case for case in cases if str(case["id"]) in case_ids]
    missing = sorted(case_ids - {str(case["id"]) for case in selected})
    if missing:
        raise ValueError(f"Unknown case id(s): {', '.join(missing)}")
    return selected
