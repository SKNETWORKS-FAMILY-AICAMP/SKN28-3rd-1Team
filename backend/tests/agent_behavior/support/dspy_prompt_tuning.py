from __future__ import annotations

import csv

from pathlib import Path
from typing import Any

from support.case_data import read_json


VALID_SPLITS = ("train", "eval", "holdout")
DEFAULT_SPLIT = "eval"


def load_prompt_tuning_config(path: Path) -> dict[str, Any]:
    config = read_json(path)
    if not isinstance(config, dict):
        raise ValueError(f"Prompt tuning config must be a JSON object: {path}")
    if not config.get("baseline_prompt"):
        raise ValueError("Prompt tuning config is missing 'baseline_prompt'")
    for split in VALID_SPLITS:
        values = config.get(split, [])
        if not isinstance(values, list):
            raise ValueError(f"Prompt tuning config '{split}' must be a list")
    return config


def read_eval_csv(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def case_split_for(case_id: str, split_config: dict[str, Any]) -> str:
    case_id_text = str(case_id)
    for split in VALID_SPLITS:
        if case_id_text in {str(value) for value in split_config.get(split, [])}:
            return split
    return DEFAULT_SPLIT


def validate_split_config(
    *,
    split_config: dict[str, Any],
    available_case_ids: set[str],
) -> None:
    assigned: dict[str, str] = {}
    duplicates: list[str] = []
    for split in VALID_SPLITS:
        for case_id in split_config.get(split, []):
            case_id_text = str(case_id)
            if case_id_text in assigned:
                duplicates.append(case_id_text)
            assigned[case_id_text] = split

    if duplicates:
        raise ValueError(f"Duplicate case ids in prompt tuning split: {sorted(duplicates)}")

    missing = sorted(set(assigned) - available_case_ids)
    if missing:
        raise ValueError(f"Prompt tuning split references unknown case ids: {missing}")


def build_prompt_tuning_rows(
    *,
    eval_rows: list[dict[str, Any]],
    split_config: dict[str, Any],
    prompt_version: str,
    prompt_path: Path,
    source_eval_csv: Path,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in eval_rows:
        case_id = str(row.get("case_id") or "")
        rows.append(
            {
                "prompt_version": prompt_version,
                "prompt_path": str(prompt_path),
                "split": case_split_for(case_id, split_config),
                "case_id": case_id,
                "evaluation_stage": row.get("evaluation_stage", ""),
                "category": row.get("category", ""),
                "behavior_contract_passed": row.get("behavior_contract_passed", ""),
                "prompt_injection_passed": row.get("prompt_injection_passed", ""),
                "hallucination_passed": row.get("hallucination_passed", ""),
                "passed": row.get("passed", ""),
                "failure_summary": row.get("failure_summary", ""),
                "source_eval_csv": str(source_eval_csv),
            }
        )
    return rows
