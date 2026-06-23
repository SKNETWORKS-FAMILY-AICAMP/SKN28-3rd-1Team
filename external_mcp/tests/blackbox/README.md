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
│   └── tmap_route_pedestrian_cases.json
├── fixtures/
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
- `fixtures/`: fake API 원본 응답
- `run_logs/fake_server_call/`: MCP 서버를 띄운 뒤 fake API로 호출한 로그
- `run_logs/live_server_call/`: MCP 서버를 띄운 뒤 실제 외부 API로 호출한 로그
- `runners/server_call_runner.py`: `fake_server_call`과 `live_server_call`이 같이 쓰는 공통 MCP server-call runner
- `support/case_data.py`: case/fixture 경로와 loader
- `support/fake_api.py`: fake HTTP 응답, fake settings patch 처리
- `support/artifact_writer.py`: JSONL, summary JSON, CSV 저장
- `support/result_check.py`: expected vs actual 검증, live 지역 진단
- `support/response_summary.py`: 실제 응답을 CSV/JSONL에서 보기 쉬운 summary로 축약
- `results/`: 최종 확인용 CSV 2개만 저장

## Current Test Boundary

이 black-box 테스트는 두 단계로 나뉜다.

1. External MCP ASGI 앱을 임시 HTTP 포트에 띄운 뒤 MCP client가 `list_tools`와 `call_tool`로 fake API fixture 기반 MCP 연결을 검증한다.
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
    request_extra = {"fake_api": ...}

if mode == "live":
    request_extra = {"external_api": ...}
```

따라서 `results/fake_api_results.csv`와 `results/live_api_results.csv`는 같은 실행 구조에서 나온 결과이고, 외부 API 응답 공급 방식만 다르다.

라이브 API 확인은 `run_live_api_test.py`를 Infisical env 주입으로 실행한다.

```bash
infisical run --projectId <external-mcp-project-id> --env dev --path / -- \
  uv run python tests/blackbox/run_live_api_test.py
```

라이브 실행의 JSONL 원본은 fake 기반 산출물과 섞이지 않게 `run_logs/live_server_call/`에 저장한다.
최종 확인용 CSV는 `results/` 폴더에 두 개만 둔다.

- `results/fake_api_results.csv`: fake API fixture로 MCP 서버 연결을 검증한 결과
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
  "distance_meters": 610,
  "duration_seconds": 481,
  "steps": [],
  "warnings": []
}
```

Failure and answer-unavailable cases must keep the same top-level shape and explain the reason in `warnings`.

## Run

```bash
cd external_mcp
PYTHONPATH=src uv run python -m unittest discover -s tests
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
