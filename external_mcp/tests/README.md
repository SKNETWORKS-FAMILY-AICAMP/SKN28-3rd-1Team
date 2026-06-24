# External MCP Tests

처음 테스트는 실제 외부 API를 호출하지 않고 mock으로 작성합니다.

## Layout

```text
tests/
├── checks/
│   ├── __init__.py
│   ├── test_external_mcp_http_connection.py
│   ├── test_firecrawl.py
│   ├── test_naver.py
│   ├── test_server_tools.py
│   └── test_tmap.py
└── blackbox/
    ├── cases/
    ├── fake_api_responses/
    ├── scripts/
    ├── runners/
    ├── support/
    ├── run_logs/
    └── results/
```

- `checks/`: `make test`가 실행하는 자동 검증 파일. 일부는 내부 정규화 함수와 tool schema를 확인하고, `test_external_mcp_http_connection.py`는 fake API 기반 MCP server-call black-box 흐름을 확인한다.
- `blackbox/`: 보고서 기준 test case, fake API 응답, 실행 script, 결과 CSV, JSONL 로그를 모아 둔 폴더.

## Checks File Map

`checks/`는 테스트 실행기가 찾는 Python test 파일을 한 곳에 모아 둔 폴더다.
보고서 기준의 핵심 산출물은 `blackbox/`에 있고, `checks/`는 코드가 깨지지 않았는지 빠르게 확인하는 자동 검증 역할을 한다.

| File | Role |
| --- | --- |
| `checks/test_external_mcp_http_connection.py` | External MCP 서버를 임시 HTTP 포트에 띄우고 fake API response로 `list_tools`, `call_tool` 흐름을 검증한다. |
| `checks/test_server_tools.py` | MCP 서버에 4개 tool이 등록되는지, `web.search`가 Firecrawl filter 인자를 노출하는지 확인한다. |
| `checks/test_naver.py` | Naver credential 누락 처리와 HTML 포함 응답 정규화 함수를 확인한다. |
| `checks/test_firecrawl.py` | Firecrawl API key 누락 처리와 web/news 결과 중복 URL 제거를 확인한다. |
| `checks/test_tmap.py` | TMAP app key 누락, POI 정규화, 지역 필터링, 길찾기 실패 DTO, 좌표 검증을 확인한다. |

## Suggested Coverage

1. MCP server에 예상 tool 이름이 등록되는지 확인합니다.
2. API key가 없을 때 warning result를 반환하는지 확인합니다.
3. Naver 응답을 `title`, `url`, `description` 중심으로 정규화하는지 확인합니다.
4. Firecrawl 응답을 `title`, `url`, `description`, optional markdown preview로 정규화하는지 확인합니다.
5. TMAP POI 응답을 `name`, `address`, `lat`, `lon` 중심으로 정규화하는지 확인합니다.
6. TMAP route 응답을 `distance_meters`, `duration_seconds`, `steps` 중심으로 정규화하는지 확인합니다.

## Black-Box MCP Test Set

`tests/blackbox/`에는 RAG 평가를 제외하고 External MCP tool 4개를 fake API response로 검증하는 테스트셋이 있다.

- tool별 4개씩 총 16개 케이스
- 지역 다양화: 서울 강남구, 부산 해운대구, 인천 연수구, 대전 서구, 광주 북구
- 장소 다양화: 노인복지관, 요양원, 구청, 보건소, 치매안심센터
- edge case: 빈 입력, 결과 없음, API 실패
- fake API 원본 응답: `tests/blackbox/fake_api_responses/`
- 로그: `tests/blackbox/run_logs/fake_server_call/`, `live_server_call/`
- `run_logs/fake_server_call/`에는 MCP 서버 연결 + fake API 호출 로그를 저장한다.
- `run_logs/live_server_call/`에는 MCP 서버 연결 + 실제 외부 API 호출 로그를 저장한다.
- `fake_server_call`과 `live_server_call`은 `tests/blackbox/runners/server_call_runner.py`의 같은 `run_server_call_cases()` 함수에서 `mode="fake"` / `mode="live"` 분기만 다르게 실행한다.
- `tests/blackbox/support/`에는 fake HTTP 처리, artifact 저장, 결과 검증, 응답 요약 공통 코드를 분리해 둔다.
- 최종 CSV는 `tests/blackbox/results/fake_api_results.csv`, `live_api_results.csv` 두 개만 둔다.
- 보고서 기준 black-box 실행 명령은 `uv run python tests/blackbox/scripts/run_fake_api_test.py`와 Infisical을 주입한 `uv run python tests/blackbox/scripts/run_live_api_test.py`다.
- 현재 black-box 범위는 MCP HTTP client 연결 검증까지이며, backend `/chat/stream`과 agent tool 선택 검증은 별도 통합 테스트 범위다.
