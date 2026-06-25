# External MCP Black-Box Test Set

RAG 평가를 제외하고 External MCP tool 4개의 입력, fake API 요청, MCP 응답 DTO, edge case 처리를 검증한다.

## Scope

| MCP tool | Agent-visible name | Test focus |
| --- | --- | --- |
| `naver.search` | `naver_search` | 지역/웹 검색 결과 정규화, 빈 query |
| `web.search` | `web_search` | 공식 웹 근거 후보 정규화, markdown preview, 결과 없음 |
| `tmap.search_poi` | `tmap_search_poi` | 복지관/구청/공공기관 장소 후보와 좌표 정규화, 빈 keyword |
| `tmap.route_pedestrian` | `tmap_route_pedestrian` | 보행자 길찾기 거리/시간/steps 정규화, API 실패 |

## Layout

```text
tests/blackbox/
├── cases/
│   ├── naver_search_cases.json
│   ├── web_search_cases.json
│   ├── tmap_search_poi_cases.json
│   ├── tmap_route_pedestrian_cases.json
│   └── live_mcp_cases.json
├── fake_api_responses/
│   ├── naver_fake_api.json
│   ├── firecrawl_fake_api.json
│   └── tmap_fake_api.json
├── run_logs/
│   ├── fake_server_call/
│   │   ├── mcp_requests.jsonl
│   │   ├── mcp_responses.jsonl
│   │   └── summary.json
│   └── live_server_call/
│   │   ├── mcp_requests.jsonl
│   │   ├── mcp_responses.jsonl
│   │   └── summary.json
├── runners/
│   └── server_call_runner.py
├── scripts/
│   ├── run_fake_api_test.py
│   └── run_live_api_test.py
├── support/
│   ├── case_data.py
│   ├── artifact_writer.py
│   ├── fake_api.py
│   ├── response_summary.py
│   └── result_check.py
└── results/
    ├── fake_api_results.csv
    └── live_api_results.csv
```

폴더 이름 기준:

- `cases/`: 테스트 입력값과 예상 검증 조건
- `fake_api_responses/`: fake API 원본 응답
- `run_logs/fake_server_call/`: MCP 서버를 띄운 뒤 fake API로 호출한 로그
- `run_logs/live_server_call/`: MCP 서버를 띄운 뒤 실제 외부 API로 호출한 로그
- `runners/server_call_runner.py`: `fake_server_call`과 `live_server_call`이 같이 쓰는 공통 MCP server-call runner
- `scripts/`: 사람이 직접 실행하는 black-box test 진입점
- `support/case_data.py`: case/fake API response 경로와 loader
- `support/fake_api.py`: fake HTTP 응답, fake settings patch 처리
- `support/artifact_writer.py`: JSONL, summary JSON, CSV 저장
- `support/result_check.py`: expected vs actual 검증, live 지역 진단
- `support/response_summary.py`: 실제 응답을 CSV/JSONL에서 보기 쉬운 summary로 축약
- `results/`: 최종 확인용 CSV 2개만 저장

## File Map

### `cases/`

`cases/`는 "어떤 MCP tool에 어떤 값을 넣고, 어떤 결과가 나와야 하는지"를 적는 곳이다.

| File | Role |
| --- | --- |
| `naver_search_cases.json` | `naver.search` fake API 테스트 케이스. 강남구 노인복지관, 해운대구 복지관, 연수구 요양원, 빈 query를 검증한다. |
| `web_search_cases.json` | `web.search` fake API 테스트 케이스. 구청/복지/치매안심센터 검색, 결과 없음 케이스를 검증한다. |
| `tmap_search_poi_cases.json` | `tmap.search_poi` fake API 테스트 케이스. 복지관, 구청, 빈 keyword를 검증한다. |
| `tmap_route_pedestrian_cases.json` | `tmap.route_pedestrian` fake API 테스트 케이스. 구청에서 복지관/보건소까지 도보 경로와 API 실패를 검증한다. |
| `live_mcp_cases.json` | 실제 Naver, Firecrawl, TMAP API를 호출할 때 사용하는 live 테스트 케이스. Infisical secret이 필요하다. |

각 case는 대체로 아래 구조를 가진다.

```json
{
  "id": "NAVER-LOCAL-001",
  "tool": "naver.search",
  "description": "무엇을 확인하는지",
  "arguments": {
    "query": "강남구 노인복지관",
    "category": "local",
    "limit": 3
  },
  "fake_api": {
    "response": "naver.gangnam_senior_welfare_center",
    "status_code": 200
  },
  "expected": {
    "success": true,
    "min_count": 2
  }
}
```

### `fake_api_responses/`

`fake_api_responses/`는 외부 API가 실제로 줄 법한 raw response를 저장하는 곳이다.
fake test에서는 네이버/TMAP/Firecrawl을 직접 호출하지 않고, 여기 있는 JSON을 API 응답처럼 사용한다.

| File | Role |
| --- | --- |
| `naver_fake_api.json` | Naver local/webkr API 응답 모양을 흉내 낸 fake response 모음. |
| `firecrawl_fake_api.json` | Firecrawl search API 응답 모양을 흉내 낸 fake response 모음. |
| `tmap_fake_api.json` | TMAP POI/보행자 경로 API 응답 모양을 흉내 낸 fake response 모음. |

### `scripts/`

`scripts/`는 사람이 직접 실행하는 진입점이다.

| File | Role |
| --- | --- |
| `run_fake_api_test.py` | fake API response로 MCP 서버를 띄우고 16개 black-box case를 실행한다. |
| `run_live_api_test.py` | Infisical로 secret을 주입한 뒤 실제 외부 API live case 12개를 실행한다. |

### `runners/`

`runners/`는 script가 호출하는 공통 실행 엔진이다.

| File | Role |
| --- | --- |
| `server_call_runner.py` | MCP ASGI 서버 시작, MCP client 연결, `list_tools`, `call_tool`, fake/live mode 분기, JSONL/CSV 기록을 처리한다. |

### `support/`

`support/`는 runner가 너무 길어지지 않도록 공통 기능을 나눈 helper 폴더다.

| File | Role |
| --- | --- |
| `case_data.py` | `cases/`, `fake_api_responses/`, `run_logs/`, `results/` 경로와 JSON loader를 관리한다. |
| `fake_api.py` | fake HTTP client와 provider settings patch를 제공한다. 실제 외부 API 대신 fake response가 반환되게 만든다. |
| `artifact_writer.py` | MCP request/response JSONL, summary JSON, 결과 CSV를 저장한다. |
| `response_summary.py` | 실제 MCP 응답 전체를 CSV/JSONL에서 읽기 쉬운 요약 형태로 줄인다. |
| `result_check.py` | expected 조건과 actual 응답을 비교하고, live 결과의 지역 일치 여부를 진단한다. |

### `run_logs/`

`run_logs/`는 매 실행마다 MCP request/response 원본 로그를 저장한다.

| File | Role |
| --- | --- |
| `run_logs/fake_server_call/mcp_requests.jsonl` | fake API mode에서 MCP로 보낸 요청과 fake API 요청 정보를 저장한다. |
| `run_logs/fake_server_call/mcp_responses.jsonl` | fake API mode에서 MCP가 돌려준 응답, expected, actual summary를 저장한다. |
| `run_logs/fake_server_call/summary.json` | fake API mode 전체 실행 요약이다. |
| `run_logs/live_server_call/mcp_requests.jsonl` | live API mode에서 MCP로 보낸 요청 정보를 저장한다. secret 값은 기록하지 않는다. |
| `run_logs/live_server_call/mcp_responses.jsonl` | live API mode에서 MCP가 돌려준 응답, expected, actual summary, 지역 진단을 저장한다. |
| `run_logs/live_server_call/summary.json` | live API mode 전체 실행 요약이다. |

### `results/`

`results/`는 보고서에서 바로 확인할 최종 CSV만 둔다.

| File | Role |
| --- | --- |
| `fake_api_results.csv` | fake API response 기반 16개 black-box case 결과. |
| `live_api_results.csv` | 실제 Naver/Firecrawl/TMAP API 기반 12개 live case 결과. |

## Current Test Boundary

이 black-box 테스트는 두 단계로 나뉜다.

1. External MCP ASGI 앱을 임시 HTTP 포트에 띄운 뒤 MCP client가 `list_tools`와 `call_tool`로 fake API response 기반 MCP 연결을 검증한다.
2. 같은 MCP server-call runner로 실제 Naver, Firecrawl, TMAP API를 호출해 live 결과를 검증한다.

1단계는 fake API raw response를 사용하므로 실제 Naver, Firecrawl, TMAP API key가 필요 없다.
2단계는 Infisical에서 실제 API key를 주입해야 한다.

## Common Server Runner

`fake_server_call`과 `live_server_call`은 모두 `runners/server_call_runner.py`의 `run_server_call_cases()`를 사용한다.
MCP 서버 실행, MCP client 연결, `list_tools`, `call_tool`, 케이스 반복은 같은 함수가 처리한다.
차이는 `mode` 분기뿐이고, fake HTTP/결과 저장/검증/응답 요약은 `support/` 모듈로 분리했다.

```python
if mode == "fake":
    fake_httpx.set_response(...)
    request_extra = {"fake_api": {"response": ..., "requests": ...}}

if mode == "live":
    request_extra = {"external_api": ...}
```

따라서 `results/fake_api_results.csv`와 `results/live_api_results.csv`는 같은 실행 구조에서 나온 결과이고, 외부 API 응답 공급 방식만 다르다.

fake API black-box 확인은 `run_fake_api_test.py`로 실행한다.

```bash
uv run python tests/blackbox/scripts/run_fake_api_test.py
```

라이브 API 확인은 `run_live_api_test.py`를 Infisical env 주입으로 실행한다.

```bash
infisical run --projectId <external-mcp-project-id> --env dev --path / -- \
  uv run python tests/blackbox/scripts/run_live_api_test.py
```

라이브 실행의 JSONL 원본은 fake 기반 산출물과 섞이지 않게 `run_logs/live_server_call/`에 저장한다.
최종 확인용 CSV는 `results/` 폴더에 두 개만 둔다.

- `results/fake_api_results.csv`: fake API response로 MCP 서버 연결을 검증한 결과
- `results/live_api_results.csv`: Infisical secret으로 실제 Naver/Firecrawl/TMAP API를 호출한 결과

CSV에는 `diagnostics_json` 컬럼이 포함되어, 지역 검색 결과에 다른 구가 섞였는지 확인할 수 있다.

## Live API 대응 코드

실제 TMAP POI 라이브 테스트에서 `해운대구노인복지관` 검색 결과에 `수영구노인복지관`이 함께 반환되는 문제가 있었다.
이에 대응하기 위해 `src/external/tmap.py`의 `search_tmap_poi()`가 응답 정규화 이후 지역 후처리를 수행한다.

동작 방식:

1. `_poi_region_terms()`가 검색어에서 `해운대구`, `해운대` 같은 지역 단서를 추출한다.
2. `_filter_poi_by_region()`가 POI의 `name`, `address`, `category`에 지역 단서가 없는 결과를 제외한다.
3. 제외된 결과가 있으면 `warnings`에 `Filtered out ... outside requested region terms` 메시지를 남긴다.
4. 남은 결과의 `position`은 `_renumber_poi_results()`로 다시 1부터 정렬한다.

아직 backend `/chat/stream`까지 붙인 end-to-end 검증은 아니다. backend agent가 실제로 이 tool을 선택해 호출하는지는 별도 통합 테스트 범위로 남긴다.

## DTO Contract

Search tools return:

```json
{
  "provider": "naver | firecrawl | tmap",
  "success": true,
  "query": "사용자 검색어",
  "count": 2,
  "results": [],
  "warnings": []
}
```

Route tool returns:

```json
{
  "provider": "tmap",
  "success": true,
  "mode": "pedestrian",
  "start": {
    "name": "출발지",
    "lon": 127.0,
    "lat": 37.0
  },
  "end": {
    "name": "도착지",
    "lon": 127.1,
    "lat": 37.1
  },
  "distance_meters": 610,
  "duration_seconds": 481,
  "steps": [],
  "warnings": []
}
```

Failure and answer-unavailable cases must keep the same top-level shape and explain the reason in `warnings`.
TMAP route failure responses also keep `start` and `end`; if the point is unavailable, the value is `null`.

## Run

```bash
cd external_mcp
uv run python tests/blackbox/scripts/run_fake_api_test.py
infisical run --projectId <external-mcp-project-id> --env dev --path / -- \
  uv run python tests/blackbox/scripts/run_live_api_test.py
```

The black-box test writes request and response artifacts on every run.

## Current Result

Latest local run:

```text
fake server call: 16 cases passed, 0 failed.
live server call: 12 cases passed, 0 failed.
```

Generated files:

- `run_logs/fake_server_call/mcp_requests.jsonl`
- `run_logs/fake_server_call/mcp_responses.jsonl`
- `run_logs/fake_server_call/summary.json`
- `run_logs/live_server_call/mcp_requests.jsonl`
- `run_logs/live_server_call/mcp_responses.jsonl`
- `run_logs/live_server_call/summary.json`
- `results/fake_api_results.csv`
- `results/live_api_results.csv`
