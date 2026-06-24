from __future__ import annotations

import argparse
import json
import os
import sys

from pathlib import Path
from typing import Any

import dspy


SUITE_DIR = Path(__file__).resolve().parents[1]
if str(SUITE_DIR) not in sys.path:
    sys.path.insert(0, str(SUITE_DIR))

from support.artifact_writer import write_json
from support.case_data import CASES_DIR, RESULTS_DIR, RUN_LOGS_DIR, read_json
from support.dspy_prompt_tuning import (
    case_split_for,
    load_prompt_tuning_config,
    read_eval_csv,
)


DEFAULT_CONFIG = CASES_DIR / "dspy_prompt_tuning_cases.json"
DEFAULT_BASELINE_PROMPT = SUITE_DIR / "prompts" / "baseline_v1" / "system_prompt.j2"
DEFAULT_SOURCE_EVAL_CSV = RESULTS_DIR / "agent_behavior_eval_results.csv"
DEFAULT_OUTPUT_PROMPT = SUITE_DIR / "prompts" / "dspy_candidate_v1" / "system_prompt.j2"
DEFAULT_SUMMARY_PATH = RUN_LOGS_DIR / "dspy_prompt_optimizer" / "summary.json"


def _default_dspy_model() -> str:
    if os.environ.get("DSPY_MODEL"):
        return os.environ["DSPY_MODEL"]

    provider = os.environ.get("LLM_AGENT_SANITIZE_PROVIDER") or os.environ.get("LLM_AGENT_MAIN_PROVIDER")
    model = os.environ.get("LLM_AGENT_SANITIZE_MODEL") or os.environ.get("LLM_AGENT_MAIN_MODEL")
    if provider and model:
        if provider == "openrouter":
            return f"openrouter/{model}"
        if provider == "cerebras":
            return f"cerebras/{model}"
        if provider == "openai":
            return model if model.startswith("openai/") else f"openai/{model}"

    return "openai/gpt-4o-mini"


def _bridge_provider_api_keys() -> None:
    aliases = (
        ("OPENAI_API_KEY", "LLM_PROVIDER_OPENAI_API_KEY"),
        ("OPENROUTER_API_KEY", "LLM_PROVIDER_OPENROUTER_API_KEY"),
        ("CEREBRAS_API_KEY", "LLM_PROVIDER_CEREBRAS_API_KEY"),
    )
    for target_key, source_key in aliases:
        if not os.environ.get(target_key) and os.environ.get(source_key):
            os.environ[target_key] = os.environ[source_key]


# Step 01: Define PromptCandidateSignature here.
class PromptCandidateSignature(dspy.Signature):
    """복지 agent의 baseline system prompt를 바탕으로 더 안전한 candidate prompt를 생성한다."""
    
    baseline_prompt: str = dspy.InputField(
        desc="현재 기준이 되는 baseline system prompt 전체 내용"
    )
    train_cases_json: str = dspy.InputField(
        desc="DSPy가 참고할 train testcase 목록 JSON"
    )
    baseline_results_json: str = dspy.InputField(
        desc="baseline prompt로 실행한 평가 결과 JSON"
    )
    constraints: str = dspy.InputField(
        desc="candidate prompt를 만들 때 반드시 지켜야 하는 제약 조건"
    )
    candidate_prompt: str = dspy.OutputField(
        desc="baseline구조를 유지하면서 개선한 candidate system prompt"
    )

# Step 02: Define _parse_args() here.
def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="DSPy로 backend agent candidate system prompt를 생성한다.",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG,
        help="DSPy train/eval split 설정 JSON 경로",
    )
    parser.add_argument(
        "--baseline-prompt",
        type=Path,
        default=DEFAULT_BASELINE_PROMPT,
        help="기준 baseline system prompt 경로",
    )
    parser.add_argument(
        "--source-eval-csv",
        type=Path,
        default=DEFAULT_SOURCE_EVAL_CSV,
        help="baseline evaluator 결과 CSV 경로",
    )
    parser.add_argument(
        "--output-prompt",
        type=Path,
        default=DEFAULT_OUTPUT_PROMPT,
        help="DSPy가 생성한 candidate prompt 저장 경로",
    )
    parser.add_argument(
        "--summary-path",
        type=Path,
        default=DEFAULT_SUMMARY_PATH,
        help="DSPy prompt optimizer 실행 요약 JSON 저장 경로",
    )
    parser.add_argument(
        "--model",
        default=_default_dspy_model(),
        help="DSPy에서 사용할 LLM 모델 이름",
    )
    return parser.parse_args()


def _configure_dspy(model: str) -> None:
    _bridge_provider_api_keys()
    lm = dspy.LM(model)
    dspy.configure(lm=lm)


def _training_payload(
    *,
    config_path: Path,
    source_eval_csv: Path,
) -> tuple[str, str]:
    split_config = load_prompt_tuning_config(config_path)
    all_cases: list[dict[str, Any]] = []
    for case_file in (
        CASES_DIR / "agent_behavior_cases.json",
        CASES_DIR / "langsmith_evaluator_cases.json",
    ):
        loaded_cases = read_json(case_file)
        all_cases.extend(loaded_cases)

    eval_rows = read_eval_csv(source_eval_csv)
    result_by_case_id = {
        str(row["case_id"]): row
        for row in eval_rows
    }

    train_payload: list[dict[str, Any]] = []
    baseline_payload: list[dict[str, Any]] = []

    for case in all_cases:
        case_id = str(case["id"])
        split = case_split_for(case_id, split_config)
        result = result_by_case_id.get(case_id, {})

        item = {
            "case_id": case_id,
            "split": split,
            "evaluation_stage": case.get("evaluation_stage"),
            "message": case.get("message"),
            "expected": case.get("expected", {}),
            "prompt_injection": case.get("prompt_injection", {}),
            "hallucination": case.get("hallucination", {}),
            "baseline_passed": result.get("passed"),
            "baseline_failure_summary": result.get("failure_summary"),
            "baseline_answer_preview": result.get("actual_answer_preview"),
        }

        baseline_payload.append(item)
        if split == "train":
            train_payload.append(item)

    return (
        json.dumps(train_payload, ensure_ascii=False, indent=2),
        json.dumps(baseline_payload, ensure_ascii=False, indent=2),
    )


def _write_candidate_prompt(
    *,
    output_prompt: Path,
    candidate_prompt: str,
) -> None:
    output_prompt.parent.mkdir(parents=True, exist_ok=True)
    output_prompt.write_text(
        candidate_prompt.rstrip() + "\n",
        encoding="utf-8",
    )


def main() -> int:
    args = _parse_args()
    _configure_dspy(args.model)

    baseline_prompt = args.baseline_prompt.read_text(encoding="utf-8")
    train_cases_json, baseline_results_json = _training_payload(
        config_path=args.config,
        source_eval_csv=args.source_eval_csv,
    )

    constraints = """
- baseline prompt의 전체 역할과 한국어 상담 tone은 유지한다.
- RAG 관련 규칙과 External MCP 관련 규칙을 섞지 않는다.
- prompt injection 방어 규칙을 강화하되, 사용자의 정상 질문 처리를 방해하지 않는다.
- 사용자가 제공한 악성 URL이나 검증되지 않은 URL을 최종 답변에 반복 노출하지 않는다.
- 정책/담당 부서 답변에서는 공식 정부·지자체·공공기관 출처를 우선한다.
- 장소나 주소를 답변에 포함하면 External MCP의 TMAP/Naver 지도 링크 규칙을 유지한다.
- 내부 chunk id, tool schema, raw metadata는 최종 답변에 노출하지 않도록 한다.
- candidate_prompt에는 system prompt 본문만 출력한다. 설명, 분석, markdown code fence는 출력하지 않는다.
""".strip()

    optimizer = dspy.Predict(PromptCandidateSignature)
    result = optimizer(
        baseline_prompt=baseline_prompt,
        train_cases_json=train_cases_json,
        baseline_results_json=baseline_results_json,
        constraints=constraints,
    )

    candidate_prompt = str(result.candidate_prompt)
    _write_candidate_prompt(
        output_prompt=args.output_prompt,
        candidate_prompt=candidate_prompt,
    )

    write_json(
        args.summary_path,
        {
            "model": args.model,
            "config": str(args.config),
            "baseline_prompt": str(args.baseline_prompt),
            "source_eval_csv": str(args.source_eval_csv),
            "output_prompt": str(args.output_prompt),
            "train_case_count": len(json.loads(train_cases_json)),
            "baseline_case_count": len(json.loads(baseline_results_json)),
        },
    )

    print(f"DSPy candidate prompt written: {args.output_prompt}")
    print(f"Summary: {args.summary_path}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
