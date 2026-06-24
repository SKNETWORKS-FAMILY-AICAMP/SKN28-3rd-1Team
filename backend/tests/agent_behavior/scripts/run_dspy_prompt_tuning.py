from __future__ import annotations

import argparse
import sys

from pathlib import Path
from typing import Any


SUITE_DIR = Path(__file__).resolve().parents[1]
if str(SUITE_DIR) not in sys.path:
    sys.path.insert(0, str(SUITE_DIR))

from support.artifact_writer import write_csv, write_json
from support.case_data import CASES_DIR, RESULTS_DIR, RUN_LOGS_DIR
from support.dspy_prompt_tuning import (
    build_prompt_tuning_rows,
    load_prompt_tuning_config,
    read_eval_csv,
    validate_split_config,
)


DEFAULT_CONFIG = CASES_DIR / "dspy_prompt_tuning_cases.json"
DEFAULT_SOURCE_EVAL_CSV = RESULTS_DIR / "agent_behavior_eval_results.csv"
DEFAULT_OUTPUT_CSV = RESULTS_DIR / "dspy_prompt_tuning_results.csv"
DEFAULT_PROMPTS_DIR = SUITE_DIR / "prompts"
RUN_NAME = "dspy_prompt_tuning"


def main() -> int:
    args = _parse_args()
    config = load_prompt_tuning_config(args.config)
    prompt_version = args.prompt_version or str(config["baseline_prompt"])
    prompt_path = args.prompt_path or DEFAULT_PROMPTS_DIR / prompt_version / "system_prompt.j2"
    eval_rows = read_eval_csv(args.source_eval_csv)
    available_case_ids = {str(row.get("case_id") or "") for row in eval_rows}

    validate_split_config(
        split_config=config,
        available_case_ids=available_case_ids,
    )
    rows = build_prompt_tuning_rows(
        eval_rows=eval_rows,
        split_config=config,
        prompt_version=prompt_version,
        prompt_path=prompt_path,
        source_eval_csv=args.source_eval_csv,
    )
    write_csv(rows, args.output_csv)
    _write_summary(
        args=args,
        prompt_version=prompt_version,
        prompt_path=prompt_path,
        rows=rows,
    )

    passed_count = sum(str(row.get("passed")).casefold() == "true" for row in rows)
    print(
        "DSPy prompt tuning baseline: "
        f"prompt={prompt_version} total={len(rows)} passed={passed_count} "
        f"failed={len(rows) - passed_count}"
    )
    print(f"CSV: {args.output_csv}")
    print(f"Prompt path: {prompt_path}")
    print("To run backend with this prompt candidate, set:")
    print(f"MAIN_AGENT_SYSTEM_PROMPT_PATH={prompt_path}")
    return 0 if passed_count == len(rows) else 1


def _write_summary(
    *,
    args: argparse.Namespace,
    prompt_version: str,
    prompt_path: Path,
    rows: list[dict[str, Any]],
) -> None:
    split_counts: dict[str, int] = {}
    for row in rows:
        split = str(row.get("split") or "")
        split_counts[split] = split_counts.get(split, 0) + 1

    write_json(
        RUN_LOGS_DIR / RUN_NAME / "summary.json",
        {
            "scope": "DSPy prompt tuning baseline",
            "config": str(args.config),
            "source_eval_csv": str(args.source_eval_csv),
            "output_csv": str(args.output_csv),
            "prompt_version": prompt_version,
            "prompt_path": str(prompt_path),
            "total": len(rows),
            "passed": sum(str(row.get("passed")).casefold() == "true" for row in rows),
            "split_counts": split_counts,
        },
    )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a baseline prompt-tuning CSV from agent behavior eval results.",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG,
        help=f"DSPy prompt tuning split config. Default: {DEFAULT_CONFIG}",
    )
    parser.add_argument(
        "--source-eval-csv",
        type=Path,
        default=DEFAULT_SOURCE_EVAL_CSV,
        help=f"Existing full agent behavior eval CSV. Default: {DEFAULT_SOURCE_EVAL_CSV}",
    )
    parser.add_argument(
        "--output-csv",
        type=Path,
        default=DEFAULT_OUTPUT_CSV,
        help=f"Prompt tuning baseline CSV. Default: {DEFAULT_OUTPUT_CSV}",
    )
    parser.add_argument(
        "--prompt-version",
        help="Prompt version label. Defaults to config baseline_prompt.",
    )
    parser.add_argument(
        "--prompt-path",
        type=Path,
        help="Prompt file path. Defaults to tests/agent_behavior/prompts/<prompt-version>/system_prompt.j2.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(main())
