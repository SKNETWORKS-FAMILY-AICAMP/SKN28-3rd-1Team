# Operator Agent Prompt And Tools

## 0. 문서 목적

본 문서는 `fe/src/features/operator/hooks/use-operator-assistant.ts` 기준으로, 현재 operator agent 에게 어떤 프롬프트와 데이터가 전달되고 어떤 tool 이 주어지는지 정리한다.

현재 agent 의 역할은 아래에 가깝다.

- 현재 상황 파악
- 운영팀이 바로 실행할 수 있는 대응 제안
- 필요 시 strategy form 값을 staged 상태로 미리 맞춤

즉 agent 는 실행기보다 `실무 보조자` 역할에 가깝고, prediction 실행 버튼은 사용자가 직접 누른다.

## 1. 현재 system prompt 의 핵심 방향

현재 프롬프트는 아래 원칙을 강하게 요구한다.

1. 반드시 한국어로만 답변
2. 답변 전에 tool 로 현재 상태를 확인
3. 현재 event 와 FE에 보이는 scenario card 목록을 함께 고려
4. 표 금지
5. technical term 금지
6. raw column 이름 직접 언급 금지
7. 실제 운영 행동 중심 설명
8. 사용자가 명시적으로 요청한 경우에만 form 값을 staged 상태로 수정
9. prediction 은 agent 가 실행하지 않음

즉 현재 답변 스타일은 아래에 가깝다.

- 나쁜 예: `SatisfactionScore 를 4로 올리세요.`
- 좋은 예: `VIP 응대 큐를 따로 빼고 사과 공지를 정리해 고객 신뢰를 먼저 회복하세요. 그러면 만족도와 재구매 반응이 같이 방어됩니다.`

## 2. Agent 에게 전달하는 데이터

현재 `DashboardPage.handleSubmitOperatorRequest()` 는 아래 컨텍스트를 만들어 agent 에 넘긴다.

### 2.1 현재 event

- `id`
- `eventId`
- `title`
- `summary`
- `severity`
- `impact`
- `window`
- `request`
- `affectedFeatures`
- `featureMultipliers`
- `featureAdditions`
- `lossRateBias`

즉 agent 는 현재 선택된 event 가 어떤 입력을 흔들고 있는지 읽을 수 있다.

### 2.2 FE 우측에 보이는 scenario card 목록

- `visibleIncidents: Incident[]`

즉 agent 는 선택된 incident 하나만 보는 것이 아니라, 현재 FE 우측 보드에 보이는 incident 카드 전체를 읽을 수 있다.

이 점이 중요하다.

- 과거에는 예전 incident 문맥을 붙잡고 답할 수 있었다.
- 지금은 visible scenario board 를 같이 읽으므로 현재 화면 기준으로 답할 수 있다.

### 2.3 현재 시뮬레이션 상태

- `monthlyLabel`
- `systemName`
- `currentState`
  - `system_id`
  - `turn_index`
  - `current_users`
  - `model_input`

### 2.4 전략 입력 관련 상태

- `modelSchema`
- `strategyBudget`
- `latestTrend`

## 3. 현재 제공 Tool 목록

현재 agent 에게 제공되는 tool 은 8개다.

### 3.1 읽기 도구

1. `get_current_state`
2. `get_priority_incident`
3. `get_visible_scenario_events`
4. `get_strategy_input_schema`
5. `get_budget_status`
6. `get_active_directives`
7. `get_latest_trend`

### 3.2 쓰기 도구

8. `update_strategy_input_value`

## 4. Tool 별 의미

### `get_current_state`

현재 시스템, 턴, 현재 유저 수, 현재 model input 을 읽는다.

### `get_priority_incident`

현재 선택된 event/incident 의 상세 설명을 읽는다.

### `get_visible_scenario_events`

현재 FE 우측 `Issue` 영역에 보이는 시나리오 카드 2개 전체를 읽는다.

반환:

- `current_event`
- `visible_scenario_events`

### `get_strategy_input_schema`

현재 strategy form 기준으로 아래를 읽는다.

- 사용자가 직접 바꿀 수 있는 항목
- 잠겨 있는 항목
- 현재 event 와 관련도가 높은 항목
- 각 항목에 연결된 실제 운영 행동 예시
- 현재 draft 기준 budget preview

### `get_budget_status`

현재 남은 budget, incident degraded baseline, 현재 draft 기준 예정 비용을 읽는다.

### `update_strategy_input_value`

현재 strategy form 값을 staged 상태로 수정한다.

중요한 제한:

- editable field 만 수정 가능
- schema 제약을 벗어나면 실패
- budget 을 넘기면 실패
- prediction 은 실행하지 않음

즉 이 도구는 `Apply Strategy Input` 버튼 직전 상태를 맞추는 도구다.

### `get_active_directives`

현재 남은 directive 개념은 거의 비어 있으나, tool 은 유지되어 있다. 현재는 빈 배열이 내려갈 수 있다.

### `get_latest_trend`

가장 최근 turn 의 유저 수와 churn risk 를 읽는다.

## 5. Agent 가 현재 할 수 있는 것 / 없는 것

### 할 수 있는 것

- 현재 상태 분석
- 현재 event 와 visible scenario board 를 함께 읽기
- 운영 행동 중심 제안 작성
- 사용자가 요청하면 strategy form 값을 staged 상태로 수정
- budget 안에서만 제안 우선순위 조정

### 할 수 없는 것

- `Apply Strategy Input` 버튼 클릭
- prediction 직접 실행
- turn 직접 넘기기
- backend state 직접 수정

## 6. 현재 런타임 흐름

1. 사용자가 콘솔에 요청 입력
2. `Enter` 로 바로 전송 가능, `Shift+Enter` 는 줄바꿈
3. agent 가 tool 로 현재 상태, event, visible scenario board, budget, strategy schema 확인
4. 실무형 답변 생성
5. 사용자가 `진행해`, `적용해`, `맞춰줘` 같이 요청하면 agent 가 `update_strategy_input_value` 로 form 값 staged 수정
6. 이후 사용자가 직접 `Apply Strategy Input` 버튼을 눌러 다음 turn 실행

## 7. 현재 문서화 포인트

현재 agent 문서에서 중요한 사실은 아래 두 가지다.

1. agent 는 `현재 선택된 incident 하나만` 보는 것이 아니다.
   - FE 우측에 보이는 scenario card 전체를 읽는다.

2. agent 는 `분석만 하는 read-only 봇` 이 아니다.
   - 사용자가 요청하면 strategy form 값을 staged 상태까지는 직접 바꿀 수 있다.

## 8. 구현 파일 기준 레퍼런스

- agent hook: `fe/src/features/operator/hooks/use-operator-assistant.ts`
- agent context 조립: `fe/src/features/simulator/pages/DashboardPage.tsx`
- strategy snapshot: `fe/src/features/operator/strategy-input-context.ts`
- budget preview 계산: `fe/src/features/simulator/strategy-budget.ts`
- strategy form store: `fe/src/stores/simulation-ui-store.ts`
