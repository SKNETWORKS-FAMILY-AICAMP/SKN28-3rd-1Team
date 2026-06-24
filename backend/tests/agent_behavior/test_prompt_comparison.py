from __future__ import annotations

import unittest

from support.prompt_comparison import compare_eval_rows


class PromptComparisonTest(unittest.TestCase):
    def test_compare_eval_rows_marks_unchanged_pass(self) -> None:
        rows = compare_eval_rows(
            baseline_rows=[_row("AGENT-001", passed="True")],
            candidate_rows=[_row("AGENT-001", passed="True")],
            baseline_version="baseline_v1",
            candidate_version="candidate_v1",
        )

        self.assertEqual(rows[0]["change"], "unchanged_pass")
        self.assertEqual(rows[0]["baseline_passed"], "True")
        self.assertEqual(rows[0]["candidate_passed"], "True")

    def test_compare_eval_rows_marks_regression(self) -> None:
        rows = compare_eval_rows(
            baseline_rows=[_row("AGENT-001", passed="True")],
            candidate_rows=[_row("AGENT-001", passed="False")],
            baseline_version="baseline_v1",
            candidate_version="candidate_v1",
        )

        self.assertEqual(rows[0]["change"], "regressed")

    def test_compare_eval_rows_marks_improvement(self) -> None:
        rows = compare_eval_rows(
            baseline_rows=[_row("AGENT-001", passed="False")],
            candidate_rows=[_row("AGENT-001", passed="True")],
            baseline_version="baseline_v1",
            candidate_version="candidate_v1",
        )

        self.assertEqual(rows[0]["change"], "improved")

    def test_compare_eval_rows_marks_missing_candidate(self) -> None:
        rows = compare_eval_rows(
            baseline_rows=[_row("AGENT-001", passed="True")],
            candidate_rows=[],
            baseline_version="baseline_v1",
            candidate_version="candidate_v1",
        )

        self.assertEqual(rows[0]["change"], "baseline_only")
        self.assertEqual(rows[0]["candidate_passed"], "missing")

    def test_compare_eval_rows_rejects_duplicate_case_ids(self) -> None:
        with self.assertRaisesRegex(ValueError, "duplicate case ids"):
            compare_eval_rows(
                baseline_rows=[_row("AGENT-001"), _row("AGENT-001")],
                candidate_rows=[],
                baseline_version="baseline_v1",
                candidate_version="candidate_v1",
            )


def _row(case_id: str, *, passed: str = "True") -> dict[str, str]:
    return {
        "case_id": case_id,
        "evaluation_stage": "1_tool_call_selection",
        "category": "tool_call_selection",
        "passed": passed,
        "behavior_contract_passed": passed,
        "prompt_injection_passed": "not_applicable",
        "hallucination_passed": "not_applicable",
        "actual_tools_json": "[]",
        "actual_answer_preview": "answer",
        "failure_summary": "",
        "sse_path": f"/tmp/{case_id}.sse",
    }


if __name__ == "__main__":
    unittest.main()
