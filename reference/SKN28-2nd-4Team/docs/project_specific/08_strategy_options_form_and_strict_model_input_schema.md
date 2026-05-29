# Strategy Options Form And Strict Model Input Schema

## 0. 문서 목적

본 문서는 현재 `Strategy Options` 영역이 어떤 계약과 규칙으로 동작하는지 정리한다.

현재 구현의 핵심은 아래 한 줄이다.

`incident 충격 -> degraded baseline input -> strategy form 조정 -> strict raw model input 제출`

즉 현재는 과거의 `decision/action_id` 구조가 아니라, 사용자가 직접 `raw model input` 을 조정하는 구조다.

## 1. 현재 canonical 구조

현재 runtime 은 아래 4개 레이어로 나뉜다.

### 1.1 Scenario Shock Layer

시나리오 event 가 현재 turn 의 raw model input 을 직접 흔든다.

예:

- 주문 수 감소
- 최근 주문 공백 증가
- 만족도 하락
- 불만 신호 발생

중요한 점:

- 이 충격은 strict schema 밖으로 나가면 안 된다.
- discrete field 는 native step 단위로만 흔들어야 한다.

### 1.2 Strategy Form Layer

사용자는 `PolicyBoard` 의 `Strategy Options` 폼에서 직접 값을 조정한다.

현재 form 은 아래 성격을 가진다.

- 핵심 레버는 바로 조정 가능
- 보조/컨텍스트 필드는 읽기 위주 또는 잠금
- 예산 preview 가 실시간으로 보임

### 1.3 Validation Layer

입력값은 FE와 BE 양쪽에서 strict 검증을 받는다.

검증 규칙:

- enum 값은 exact match
- 숫자는 min/max 안이어야 함
- binary 는 `0/1`
- invalid 값은 조용히 보정하지 않고 reject

### 1.4 Scoring Layer

최종 제출 payload 는 strict raw model input 이고, 모델은 이 값을 직접 받는다.

즉 최종 scoring 계약은 `raw model input` 이 중심이다.

## 2. Strict Raw Model Input 원칙

현재 서빙 모델은 raw feature 18개를 직접 입력으로 받는다.

운영 원칙:

1. categorical 은 closed enum
2. numeric 은 bounded range
3. binary 는 `0/1`
4. 모든 필드는 required
5. runtime 에 hidden mapper 로 다시 비틀지 않음

즉 사용자가 무엇을 바꾸는지와, 모델이 실제로 무엇을 받는지가 지금은 직접 연결되어 있다.

## 3. 현재 UI 에서 중요한 구분

### 3.1 핵심 전략 레버

현재 기본 화면에서 조정 가치가 높은 항목은 아래 그룹이다.

- 배송 마찰
- 앱 체류 시간
- 만족도
- 불만 압력
- 쿠폰 사용량
- 주문 수
- 최근 주문 공백
- 캐시백 금액

이 그룹은 아래 이유로 기본 노출이 맞다.

- 운영 액션과 연결하기 쉽다.
- budget 소모를 설명하기 쉽다.
- 예측 결과와 연결해서 읽기 쉽다.

### 3.2 보조 필드

- 선호 결제 수단
- 선호 주문 카테고리
- 전년 대비 주문금액 변화
- 등록 디바이스 수
- 등록 주소 수

이 그룹은 보조 해석용으로는 의미가 있지만, 현재 기본 레버로 항상 노출할 필요는 적다.

### 3.3 세그먼트 컨텍스트 필드

- 고객 유지 기간
- 주 접속 디바이스
- 도시 티어
- 성별
- 결혼 상태

이 그룹은 전략 레버라기보다 플레이 중인 고객 세그먼트의 설명값에 가깝다.

## 4. 시나리오 충격 레이어 운영 원칙

현재 구현은 시나리오가 raw model input 을 직접 흔든다. 다만 그 값은 반드시 native unit 을 따라야 한다.

즉 아래 규칙을 지킨다.

1. 정수형 필드는 정수 step 단위로만 흔든다.
2. binary 필드는 `-1, 0, +1` 수준만 허용한다.
3. categorical 필드는 시나리오 충격으로 직접 바꾸지 않는다.
4. discrete field 에 fractional multiplier 를 쓰지 않는다.
5. event 적용 후 값은 strict schema 안에 남아 있어야 한다.

좋은 예:

- `OrderCount: -1`
- `DaySinceLastOrder: +2`
- `SatisfactionScore: -1`
- `Complain: +1`

피해야 하는 예:

- `SatisfactionScore: -0.25`
- `Complain: +0.15`
- `OrderCount * 0.94`

## 5. 예산 구조

현재 strategy form 은 예산 기반으로 움직인다.

### 5.1 세션 시작 시 budget

세션 시작 시 랜덤 예산이 부여된다.

- 범위: `10000 ~ 20000`

### 5.2 preview 로 먼저 보이는 값

Apply 전에는 아래가 바뀐다.

- 각 입력값
- `Planned Spend`
- `after apply`

반대로 아래는 실제 실행 전까지 안 바뀐다.

- `Total Budget`
- 현재 `Remaining`

즉 현재 form 은 `staged 상태` 를 보여주는 구조다.

### 5.3 field 별 비용 구조

각 editable field 는 아래 정보를 가진다.

- `budget_step`
- `unit_budget_cost`

즉 같은 1단위 조정이라도 비용은 field 마다 다르다.

예:

- 만족도 1단계 상승 비용이 큼
- 쿠폰 사용량 1단계 증가 비용이 상대적으로 작음

## 6. 현재 게임 규칙과의 연결

strategy options 는 게임 규칙과 직접 연결된다.

실패 조건:

- `Month 12` 이전 전체 budget 소진
- `Month 24` 이전 초기 유저 대비 `30%` 이상 감소

성공 조건:

- 위 실패 없이 `Month 24` 도달

즉 strategy form 은 단순 조정 패널이 아니라, 예산과 유저 하락을 동시에 관리하는 게임 레버다.

## 7. AI Agent 와의 연결

현재 agent 는 strategy form 을 아래 방식으로 사용한다.

1. 현재 event 와 visible scenario board 확인
2. 현재 degraded baseline 확인
3. 현재 strategy form schema 확인
4. 필요 시 `update_strategy_input_value` 로 staged 값 수정
5. prediction 은 직접 실행하지 않음

즉 agent 는 아래 역할에 가깝다.

- 추천
- staged form 세팅
- 예산 안에서의 우선순위 제안

## 8. 현재 UX 원칙

현재 UX 에서는 raw 이름을 그대로 보여주기보다, 의미가 드러나는 표현을 우선한다.

예:

- `WarehouseToHome` -> `배송 마찰`
- `Complain` -> `불만 압력`
- `DaySinceLastOrder` -> `최근 주문 공백`

즉 내부 계약은 raw field 기준으로 유지하되, 화면 표현은 business-facing label 로 바꾸는 것이 맞다.

## 9. 한 줄 요약

현재 `Strategy Options` 는 과거의 `decision picker` 가 아니라, 시나리오 충격을 받은 degraded baseline 을 budget 안에서 복구·조정해 strict raw model input 으로 제출하는 플레이어 전략 form 이다.
