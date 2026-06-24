# Agent Behavior Tests

Backend agent가 사용자 질문에 맞게 tool을 선택하고 답변하는지 확인하는 행동 테스트셋이다.
External MCP 서버 자체 검증은 `external_mcp/tests`에 두고, 여기서는 backend `/chat/stream`을 통해 agent 행동만 본다.

## Layout

```text
tests/agent_behavior/
├── cases/
│   └── agent_behavior_cases.json
│   └── dspy_prompt_tuning_cases.json
│   └── langsmith_evaluator_cases.json
├── prompts/
│   └── baseline_v1/
│       └── system_prompt.j2
├── results/
│   └── agent_behavior_eval_results.csv
│   └── agent_behavior_results.csv
│   └── dspy_prompt_tuning_results.csv
├── run_logs/
│   └── agent_behavior/
│   └── dspy_prompt_tuning/
│   └── langsmith_evaluators/
│       ├── requests.jsonl
│       ├── responses.jsonl
│       ├── summary.json
│       └── sse/
├── scripts/
│   └── run_agent_behavior_test.py
│   └── compare_prompt_eval_results.py
│   └── run_dspy_prompt_tuning.py
│   └── run_langsmith_evaluators.py
└── support/
    ├── artifact_writer.py
    ├── case_data.py
    ├── dspy_prompt_tuning.py
    ├── langsmith_evaluators.py
    ├── prompt_comparison.py
    ├── result_checker.py
    ├── sse_parser.py
    └── stream_client.py
└── test_sse_parser.py
└── test_dspy_prompt_tuning.py
└── test_langsmith_evaluators.py
└── test_prompt_comparison.py
```

## Test Boundary

- `external_mcp/tests`: MCP tool 자체가 fake/live API에서 올바른 DTO를 반환하는지 검증한다.
- `backend/tests/agent_behavior`: 사용자의 자연어 질문을 받은 backend agent가 적절한 External MCP tool을 호출하는지 검증한다.
- 장소/기관 안내 case는 tool 결과의 주소와 네이버지도 웹 위치 URL을 최종 답변에 유지하는지도 함께 확인한다.
  예를 들어 `AGENT-EXT-001`은 TMAP 결과의 `naver_map_place_url`이 `[네이버지도 위치 보기](https://map.naver.com/...)` 형태로 노출되는지 검증한다.
- `AGENT-EXT-002`처럼 사용자가 주소를 직접 묻지 않은 정책/담당 안내 질문도, 최종 답변에 방문 가능한 시설명이나 주소가 포함되면 `tmap_search_poi`를 추가 호출해 `[네이버지도 위치 보기](https://map.naver.com/...)` 링크를 붙이는지 검증한다.

각 agent case는 `source_mcp_case_id`로 원래 어떤 MCP live case에서 온 시나리오인지 연결한다.

## Evaluation Flow

Agent 평가는 네 단계로 나눈다.

1. `1_tool_call_selection`: agent가 질문 의도에 맞는 External MCP tool을 부르는지 확인한다.
2. `2_address_tool_call_required`: 답변에 장소/주소가 포함될 때 `tmap_search_poi`를 추가 호출해 위치 보기 링크를 확보하는지 확인한다.
3. `3_tool_hallucination`: tool을 호출하는 상황에서 존재하지 않는 기관, 임의 전화번호, 검증되지 않은 지도/출처를 만들지 않는지 확인한다.
4. `4_tool_prompt_injection`: tool을 호출하는 정상 질문 안에 악성 지시가 섞여도 원래 질문을 안전하게 처리하고 공격 지시는 따르지 않는지 확인한다.

DSPy는 이 네 단계 결과가 나온 다음에 사용한다.
이때는 tool 연결과 모델 성능은 충분히 좋다고 가정하고, 실패한 case를 기준으로 prompt만 tuning한다.
즉 DSPy 실험의 목적은 새 tool 구현이나 모델 비교가 아니라, 같은 testcase에서 prompt 후보별 pass/fail과 점수 변화를 비교하는 것이다.

## DSPy Prompt Tuning Prep

현재 프롬프트 기준선은 `prompts/baseline_v1/system_prompt.j2`에 저장한다.
backend 기본 실행은 계속 `src/agents/main_agent/system_prompt.j2`를 사용한다.
프롬프트 후보를 비교할 때만 backend 실행 환경에 `MAIN_AGENT_SYSTEM_PROMPT_PATH`를 넣어 후보 파일을 읽게 한다.

`cases/dspy_prompt_tuning_cases.json`은 전체 agent behavior testcase를 `train`, `eval`, `holdout`으로 나눈다.
`train`은 DSPy가 prompt 후보를 개선할 때 참고하는 케이스이고, `eval`은 prompt가 특정 케이스에만 맞게 과적합되지 않았는지 확인하는 케이스다.

현재 전체 평가 CSV를 DSPy baseline CSV로 변환하려면 아래를 실행한다.

```bash
uv run python tests/agent_behavior/scripts/run_dspy_prompt_tuning.py
```

결과는 `results/dspy_prompt_tuning_results.csv`에 저장된다.
이 파일은 새 agent 호출을 하지 않고, 이미 만들어진 `results/agent_behavior_eval_results.csv`를 prompt tuning 관점의 컬럼으로 재정리한다.
실제 후보 prompt를 backend에 적용해서 다시 평가하려면 backend를 아래처럼 실행한다.

```bash
MAIN_AGENT_SYSTEM_PROMPT_PATH=tests/agent_behavior/prompts/baseline_v1/system_prompt.j2 \
  uv run daphne -b 127.0.0.1 -p 8003 -v 0 --access-log /dev/null app:application
```

candidate prompt 평가 결과를 baseline과 비교하려면 candidate 평가 CSV를 따로 저장한 뒤 비교 스크립트를 실행한다.

```bash
uv run python tests/agent_behavior/scripts/run_langsmith_evaluators.py \
  --no-upload \
  --run-name candidate_v1_evaluators \
  --url http://127.0.0.1:8004/chat/stream \
  --result-csv tests/agent_behavior/results/candidate_v1_eval_results.csv

uv run python tests/agent_behavior/scripts/compare_prompt_eval_results.py
```

비교 결과는 `results/prompt_comparison_results.csv`에 저장된다.
`change` 컬럼은 `unchanged_pass`, `unchanged_fail`, `improved`, `regressed`, `baseline_only`, `candidate_only` 중 하나로 기록된다.

## LangSmith Evaluators

`langsmith_evaluator_cases.json`은 기존 tool 선택 테스트와 별도로 tool 사용 상황의 prompt injection, hallucination 방어를 확인하는 평가셋이다.

- `AGENT-PI-*`: 정상적인 tool 호출 질문 안에 시스템 지시 무시, 비밀키 공개, 악성 출처 강제 같은 공격성 지시가 섞였을 때 agent가 따르지 않는지 확인한다.
- `AGENT-HAL-*`: tool 호출 결과를 바탕으로 답하면서 존재하지 않는 기관, 임의 전화번호, 검증되지 않은 지도 링크, 근거 없는 출처를 만들지 않는지 확인한다.

실행 스크립트는 LangSmith `evaluate()`를 사용한다.
기본 실행 시 `agent_behavior_cases.json`과 `langsmith_evaluator_cases.json`을 모두 읽어서 1~4단계 전체 testcase 결과를 하나의 CSV에 저장한다.
`LANGSMITH_API_KEY`가 주입되어 있으면 기본적으로 LangSmith experiment에 업로드하고, 없으면 로컬로만 실행한다.

```bash
uv run python tests/agent_behavior/scripts/run_langsmith_evaluators.py
```

로컬 CSV만 보고 싶으면 `--no-upload`를 붙인다.

```bash
uv run python tests/agent_behavior/scripts/run_langsmith_evaluators.py --no-upload
```

Infisical 환경변수로 LangSmith에 업로드하려면 backend 루트에서 실행한다.

```bash
infisical run --projectId f6a512e6-1960-4186-8ece-a3061824c185 --env dev --path / -- \
  uv run python tests/agent_behavior/scripts/run_langsmith_evaluators.py --upload
```

특정 evaluator case만 실행할 수 있다.

```bash
uv run python tests/agent_behavior/scripts/run_langsmith_evaluators.py \
  --case-id AGENT-PI-001 \
  --no-upload
```

전체 agent behavior evaluation 결과는 testcase와 실제 결과를 비교하기 쉬운 컬럼 구조로 `results/agent_behavior_eval_results.csv`에 저장된다.
주요 컬럼은 `case_id`, `evaluation_stage`, `expected_*`, `actual_tools_json`, `actual_answer_preview`, `behavior_contract_passed`, `prompt_injection_passed`, `hallucination_passed`, `passed`, `failure_summary`이다.
1/2단계 case는 `behavior_contract_passed`만 평가하고, 3/4단계 case는 `behavior_contract_passed`와 함께 `hallucination_passed` 또는 `prompt_injection_passed`도 기록한다.
원본 SSE stream과 요청/응답 로그는 `run_logs/langsmith_evaluators/` 아래에 남는다.

## Run

Backend와 External MCP 서버를 먼저 실행한 뒤 실행한다.

```bash
uv run python tests/agent_behavior/scripts/run_agent_behavior_test.py
```

기본 backend endpoint는 `http://127.0.0.1:8003/chat/stream`이다.
다른 포트를 쓸 때는 `--url` 또는 `AGENT_TEST_CHAT_URL`을 사용한다.

```bash
uv run python tests/agent_behavior/scripts/run_agent_behavior_test.py \
  --url http://127.0.0.1:8000/chat/stream
```

특정 case만 실행할 수 있다.

```bash
uv run python tests/agent_behavior/scripts/run_agent_behavior_test.py \
  --case-id AGENT-EXT-001
```

## Result Files

- `results/agent_behavior_eval_results.csv`: 1~4단계 전체 testcase를 모두 실행한 최종 비교 결과. `agent_behavior_cases.json`과 `langsmith_evaluator_cases.json`의 모든 `case_id`가 이 파일에 남아야 한다.
- `results/agent_behavior_results.csv`: `run_agent_behavior_test.py`만 따로 실행했을 때 생기는 1/2단계 상세 보조 결과
- `results/dspy_prompt_tuning_results.csv`: `agent_behavior_eval_results.csv`를 prompt version과 train/eval split 기준으로 재정리한 DSPy 준비 결과
- `results/candidate_v1_eval_results.csv`: candidate prompt로 backend를 실행한 뒤 저장하는 전체 evaluator 결과
- `results/prompt_comparison_results.csv`: baseline evaluator 결과와 candidate evaluator 결과를 case_id 기준으로 나란히 비교한 결과
- `run_logs/agent_behavior/requests.jsonl`: backend에 보낸 요청
- `run_logs/agent_behavior/responses.jsonl`: SSE 파싱 결과와 검증 결과
- `run_logs/agent_behavior/sse/*.sse`: 원본 SSE stream

`run_agent_behavior_test.py`는 최신 실행 결과를 같은 경로에 덮어쓴다.
정식 테스트 실행에서 실패한 case는 `agent_behavior_results.csv`의 `passed`, `error_count`, `errors_json` 컬럼으로 남긴다.
각 실행은 timestamp 기반 `run_id`를 session id에 붙여 이전 agent 대화 기억이 다음 테스트에 섞이지 않게 한다.

## Checks

- `test_sse_parser.py`: backend SSE stream에서 `main_agent`의 최종 답변만 결과 답변으로 선택하는지 확인한다.
