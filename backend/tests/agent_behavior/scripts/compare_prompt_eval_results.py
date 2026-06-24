from __future__ import annotations

import argparse
import sys

from pathlib import Path


SUITE_DIR = Path(__file__).resolve().parents[1]
if str(SUITE_DIR) not in sys.path:
    sys.path.insert(0, str(SUITE_DIR))

from support.artifact_writer import write_csv
from support.case_data import RESULTS_DIR
from support.prompt_comparison import compare_eval_rows, read_eval_rows


DEFAULT_BASELINE_CSV = RESULTS_DIR / "agent_behavior_eval_results.csv"
DEFAULT_CANDIDATE_CSV = RESULTS_DIR / "candidate_v1_eval_results.csv"
DEFAULT_OUTPUT_CSV = RESULTS_DIR / "prompt_comparison_results.csv"


def main() -> int:
    args = _parse_args()
    rows = compare_eval_rows(
        baseline_rows=read_eval_rows(args.baseline_csv),
        candidate_rows=read_eval_rows(args.candidate_csv),
        baseline_version=args.baseline_version,
        candidate_version=args.candidate_version,
    )
    write_csv(rows, args.output_csv)

    changes = _count_changes(rows)
    print(
        "Prompt comparison: "
        f"baseline={args.baseline_version} candidate={args.candidate_version} "
        f"total={len(rows)} "
        f"unchanged_pass={changes.get('unchanged_pass', 0)} "
        f"improved={changes.get('improved', 0)} "
        f"regressed={changes.get('regressed', 0)}"
    )
    print(f"CSV: {args.output_csv}")
    return 0 if changes.get("regressed", 0) == 0 else 1


def _count_changes(rows: list[dict[str, str]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        change = str(row.get("change") or "")
        counts[change] = counts.get(change, 0) + 1
    return counts


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compare two agent behavior evaluator CSV files by case_id.",
    )
    parser.add_argument(
        "--baseline-csv",
        type=Path,
        default=DEFAULT_BASELINE_CSV,
        help=f"Baseline evaluator CSV. Default: {DEFAULT_BASELINE_CSV}",
    )
    parser.add_argument(
        "--candidate-csv",
        type=Path,
        default=DEFAULT_CANDIDATE_CSV,
        help=f"Candidate evaluator CSV. Default: {DEFAULT_CANDIDATE_CSV}",
    )
    parser.add_argument(
        "--output-csv",
        type=Path,
        default=DEFAULT_OUTPUT_CSV,
        help=f"Comparison output CSV. Default: {DEFAULT_OUTPUT_CSV}",
    )
    parser.add_argument(
        "--baseline-version",
        default="baseline_v1",
        help="Baseline prompt version label.",
    )
    parser.add_argument(
        "--candidate-version",
        default="candidate_v1",
        help="Candidate prompt version label.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(main())
