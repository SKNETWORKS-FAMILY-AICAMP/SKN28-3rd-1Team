from __future__ import annotations

import tempfile
import unittest

from pathlib import Path

from support.dspy_prompt_tuning import (
    build_prompt_tuning_rows,
    case_split_for,
    load_prompt_tuning_config,
    validate_split_config,
)


class DspyPromptTuningTest(unittest.TestCase):
    def test_case_split_for_returns_configured_split(self) -> None:
        split_config = {
            "baseline_prompt": "baseline_v1",
            "train": ["AGENT-PI-001"],
            "eval": ["AGENT-EXT-001"],
            "holdout": ["AGENT-HAL-001"],
        }

        self.assertEqual(case_split_for("AGENT-PI-001", split_config), "train")
        self.assertEqual(case_split_for("AGENT-EXT-001", split_config), "eval")
        self.assertEqual(case_split_for("AGENT-HAL-001", split_config), "holdout")

    def test_case_split_for_defaults_unknown_case_to_eval(self) -> None:
        split_config = {
            "baseline_prompt": "baseline_v1",
            "train": [],
            "eval": [],
            "holdout": [],
        }

        self.assertEqual(case_split_for("AGENT-NEW-001", split_config), "eval")

    def test_validate_split_config_rejects_duplicate_case_ids(self) -> None:
        split_config = {
            "baseline_prompt": "baseline_v1",
            "train": ["AGENT-PI-001"],
            "eval": ["AGENT-PI-001"],
            "holdout": [],
        }

        with self.assertRaisesRegex(ValueError, "Duplicate case ids"):
            validate_split_config(
                split_config=split_config,
                available_case_ids={"AGENT-PI-001"},
            )

    def test_validate_split_config_rejects_unknown_case_ids(self) -> None:
        split_config = {
            "baseline_prompt": "baseline_v1",
            "train": ["AGENT-UNKNOWN-001"],
            "eval": [],
            "holdout": [],
        }

        with self.assertRaisesRegex(ValueError, "unknown case ids"):
            validate_split_config(
                split_config=split_config,
                available_case_ids={"AGENT-PI-001"},
            )

    def test_load_prompt_tuning_config_rejects_non_list_split(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "config.json"
            path.write_text(
                '{"baseline_prompt": "baseline_v1", "train": "AGENT-PI-001"}',
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "'train' must be a list"):
                load_prompt_tuning_config(path)

    def test_build_prompt_tuning_rows_adds_prompt_and_split_columns(self) -> None:
        rows = build_prompt_tuning_rows(
            eval_rows=[
                {
                    "case_id": "AGENT-PI-001",
                    "evaluation_stage": "4_tool_prompt_injection",
                    "category": "tool_prompt_injection",
                    "passed": "True",
                }
            ],
            split_config={
                "baseline_prompt": "baseline_v1",
                "train": ["AGENT-PI-001"],
                "eval": [],
                "holdout": [],
            },
            prompt_version="baseline_v1",
            prompt_path=Path("prompts/baseline_v1/system_prompt.j2"),
            source_eval_csv=Path("results/agent_behavior_eval_results.csv"),
        )

        self.assertEqual(rows[0]["prompt_version"], "baseline_v1")
        self.assertEqual(rows[0]["split"], "train")
        self.assertEqual(rows[0]["case_id"], "AGENT-PI-001")


if __name__ == "__main__":
    unittest.main()
