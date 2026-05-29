# FE-BE Prediction Schema And Flow

## 0. 문서 목적

본 문서는 현재 구현 기준으로 FE와 BE가 시뮬레이션 예측을 위해 어떤 계약을 주고받는지 정리한다.

현재 구조의 핵심은 아래 한 줄이다.

`incident 기반 충격 -> FE strategy form 조정 -> strict raw model input 제출 -> BE 예측`

즉 현재는 과거의 `decision/action_id` 중심 계약이 아니라, `PredictionState.model_input` 을 직접 주고받는 구조다.

## 1. 현재 런타임 요약

현재 FE-BE 예측 흐름은 아래 순서로 동작한다.

1. FE가 시스템을 고르면 BE에 세션 시작을 요청한다.
2. BE는 랜덤 초기 유저 수, raw model input seed, model schema, strategy budget을 내려준다.
3. FE는 현재 시스템에서 보이는 시나리오 카드 2개를 기준으로 incident를 고른다.
4. BE는 선택된 incident의 event effect로 degraded input 을 만든다.
5. 사용자는 `Strategy Options` 폼에서 값을 직접 조절한다.
6. FE는 `incident_id + strict raw model input` 을 BE로 보낸다.
7. BE는 예산 소모, loss rate, 다음 턴 incident 후보 2개, next state 를 계산해 돌려준다.

## 2. 세션 시작 계약

엔드포인트:

- `POST /api/prediction/session/start`

요청 예시:

```json
{
  "system_id": "growth",
  "initial_users": 13661,
  "random_seed": 7
}
```

응답 예시:

```json
{
  "session_id": "...",
  "random_seed": 7,
  "business_model_id": "ecommerce_customer_xgb_v2_no_customer_id",
  "state": { "PredictionState": "..." },
  "model_schema": [{ "name": "Tenure", "dtype": "numeric", "categories": [] }],
  "strategy_budget": {
    "total_budget": 16234,
    "remaining_budget": 16234,
    "spent_budget": 0,
    "currency": "credits"
  },
  "initial_trend_point": {
    "label": "Month 1",
    "actual_users": 13661,
    "predicted_users": 13661,
    "churn_risk": 0.0
  }
}
```

현재 FE 저장 항목:

- `session_id`
- `state`
- `model_schema`
- `strategy_budget`
- `initial_trend_point`

구현 위치:

- FE API: `fe/src/shared/api/prediction.ts`
- FE hook: `fe/src/features/simulator/hooks/use-simulation-prediction.ts`
- FE store: `fe/src/stores/simulation-ui-store.ts`
- BE schema: `be/src/be/schemas.py`
- BE service: `be/src/be/prediction.py`

## 3. 턴 진행 / 예측 실행 계약

엔드포인트:

- `POST /api/prediction/churn`

요청 예시:

```json
{
  "session_id": "...",
  "state": {
    "system_id": "growth",
    "turn_index": 1,
    "current_users": 13661,
    "model_input": {
      "Tenure": 9,
      "PreferredLoginDevice": "Mobile",
      "CityTier": 1,
      "WarehouseToHome": 14,
      "PreferredPaymentMode": "Credit Card",
      "Gender": "Male",
      "HourSpendOnApp": 3,
      "NumberOfDeviceRegistered": 4,
      "PreferedOrderCat": "Mobile",
      "SatisfactionScore": 3,
      "MaritalStatus": "Single",
      "NumberOfAddress": 3,
      "Complain": 0,
      "OrderAmountHikeFromlastYear": 15,
      "CouponUsed": 1,
      "OrderCount": 2,
      "DaySinceLastOrder": 3,
      "CashbackAmount": 163.28
    }
  },
  "incident_id": "incident-growth-1"
}
```

현재 중요한 점:

- FE는 이제 `decision` 을 보내지 않는다.
- FE는 `incident_id` 를 실제로 BE에 보낸다.
- FE는 strategy form 에서 사용자가 조정한 final `model_input` 을 그대로 보낸다.

응답 예시:

```json
{
  "session_id": "...",
  "engine_id": "live_customer_churn_inference_xgb_v2",
  "business_model_id": "ecommerce_customer_xgb_v2_no_customer_id",
  "churn_probability": 0.18,
  "effective_loss_rate": 0.04,
  "retention_probability": 0.82,
  "risk_band": "low",
  "drivers": ["..."],
  "event": { "SimulationEvent": "..." },
  "degraded_model_input": { "EcommerceCustomerModelInput": "..." },
  "applied_adjustments": [{ "field_name": "SatisfactionScore", "spent_budget": 5000 }],
  "spent_budget_this_turn": 5000,
  "strategy_budget": {
    "total_budget": 16234,
    "remaining_budget": 11234,
    "spent_budget": 5000,
    "currency": "credits"
  },
  "expected_lost_users": 530,
  "predicted_users_next": 13131,
  "next_incident_id": "incident-growth-2",
  "next_incident": { "DashboardIncident": "..." },
  "next_incident_options": [{ "DashboardIncident": "..." }, { "DashboardIncident": "..." }],
  "next_state": { "PredictionState": "..." },
  "trend_point": {
    "label": "Month 2",
    "actual_users": 13661,
    "predicted_users": 13131,
    "churn_risk": 4.0
  }
}
```

현재 FE 활용 항목:

- `next_state`
- `strategy_budget`
- `trend_point`
- `next_incident_id`
- `next_incident_options`
- 디버그/설명용 `degraded_model_input`, `applied_adjustments`

## 4. Incident 와 Event 의 현재 관계

현재 구조에서는 incident 와 event 가 아래처럼 연결된다.

1. FE는 우측 `Issue` 카드에서 incident 2개를 보여준다.
2. 사용자가 하나를 고르면 그 `incident_id` 를 BE로 보낸다.
3. BE는 해당 incident 가 가리키는 `eventId` 를 찾아 현재 턴 event 로 사용한다.
4. event 의 `featureAdditions`, `featureMultipliers`, `lossRateBias` 로 degraded input 을 만든다.
5. scoring 후에는 다음 턴용 incident 후보 2개를 다시 뽑아 `next_incident_options` 로 내려준다.
6. FE는 현재 시스템 incident 목록을 그 2개로 교체한다.

즉 지금은 화면에서 보이는 incident 와, BE가 예측에 사용하는 event 가 일치하는 구조다.

## 5. Strategy Form 과 Budget 구조

현재 FE는 `PolicyBoard` 안에서 전략을 `preset decision` 으로 다루지 않는다.

대신 아래 구조를 쓴다.

1. 선택된 incident 기준 degraded baseline input 계산
2. strategy form 에서 editable field 직접 조정
3. field 별 budget step / unit cost 로 예정 비용 계산
4. 예산을 넘기면 Apply 버튼 비활성화
5. Apply 시 최종 `model_input` 제출

현재 strategy form preview 에서 바로 바뀌는 값:

- 각 입력값
- `Planned Spend`
- `after apply`

반대로 실제 turn 이 실행되기 전까지 바뀌지 않는 값:

- `Total Budget`
- `Remaining`

## 6. Operator Agent 와의 연결

현재 operator agent 는 FE가 들고 있는 아래 정보를 기준으로 답한다.

- 현재 state
- 현재 선택 incident 상세
- 우측에 보이는 scenario card 전체 목록
- strategy input schema
- 현재 budget / 예정 비용
- 최신 trend

또한 사용자가 명시적으로 진행을 요청하면, agent 는 `update_strategy_input_value` tool 로 strategy form 값을 staged 상태까지 바꿀 수 있다.

중요:

- agent 는 prediction 자체를 실행하지 않는다.
- agent 는 `Apply Strategy Input` 버튼 직전 상태까지만 만든다.

## 7. 현재 게임 룰

현재 FE는 아래 게임 조건을 계산한다.

실패 조건:

- `Month 12` 이내 전체 budget 소진
- `Month 24` 이내 초기 유저 대비 `30%` 이상 감소

성공 조건:

- 위 실패 없이 `Month 24` 도달

이 조건을 만족하면 입력이 잠기고 결과 모달이 뜬다.

## 8. 구현 파일 기준 레퍼런스

- FE session/turn hook: `fe/src/features/simulator/hooks/use-simulation-prediction.ts`
- FE page orchestration: `fe/src/features/simulator/pages/DashboardPage.tsx`
- FE strategy form: `fe/src/features/simulator/components/policy-board.tsx`
- FE trend graph: `fe/src/features/simulator/components/strategy-stage.tsx`
- FE store: `fe/src/stores/simulation-ui-store.ts`
- FE operator agent: `fe/src/features/operator/hooks/use-operator-assistant.ts`
- FE API contracts: `fe/src/shared/api/contracts.ts`
- BE schemas: `be/src/be/schemas.py`
- BE prediction service: `be/src/be/prediction.py`
- BE business model: `be/src/be/business_model.py`
- Active scenario source: `be/src/be/simulation_scenario.json`
