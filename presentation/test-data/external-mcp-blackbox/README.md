# External MCP Black-Box Test Report

작성일: 2026-06-24 KST  
대상 범위: `external_mcp/`  
제외 범위: RAG 검색 품질, RAG 답변 품질, LLM judge 평가, backend agent end-to-end tool 선택 검증

## 테스트 목적

노인·고령층 상담 agent가 RAG 문서 검색 외에도 외부 정보를 안전하게 조회할 수 있는지 확인하기 위해 External MCP tool 4개를 black-box 방식으로 검증했다.

이번 테스트는 fake API fixture 검증과 실제 API live 검증을 분리해서 수행한다. 먼저 각 API의 raw response DTO를 흉내 낸 fake fixture로 MCP request/response 구조를 고정하고, 이후 Infisical secret을 주입해 실제 Naver, Firecrawl, TMAP API를 호출한다.

주의할 점은 이번 테스트가 backend `/chat/stream`까지 연결한 통합 검증은 아니라는 것이다. 이번에 새로 확인한 범위는 External MCP 서버 내부의 tool contract, fake API 요청, 정규화된 MCP 응답, 그리고 MCP HTTP client가 실제로 `list_tools`와 `call_tool`을 수행하는 연결이다. backend agent가 질문을 보고 어떤 tool을 선택하는지는 별도 end-to-end 테스트에서 확인해야 한다.

## 테스트 대상

| Tool | 목적 | 주요 검증 |
| --- | --- | --- |
| `naver.search` | 네이버 지역/웹 검색 | 장소명, 주소, 전화번호, 웹문서 제목/URL 정규화 |
| `web.search` | Firecrawl 웹 검색 | 공식 페이지 후보, 설명, markdown preview 정규화 |
| `tmap.search_poi` | TMAP 장소 검색 | 복지관, 구청, 보건소 등 장소명/주소/좌표 정규화 |
| `tmap.route_pedestrian` | TMAP 도보 길찾기 | 거리, 예상 시간, 단계별 안내 정규화 |

## 테스트 케이스 설계

총 16개 케이스를 구성했다.

| Tool | 정상 케이스 | 예외 케이스 | 합계 |
| --- | ---: | ---: | ---: |
| `naver.search` | 3 | 1 | 4 |
| `web.search` | 3 | 1 | 4 |
| `tmap.search_poi` | 3 | 1 | 4 |
| `tmap.route_pedestrian` | 3 | 1 | 4 |

지역과 장소 유형은 한 지역이나 한 기관 유형에 치우치지 않도록 구성했다.

| 지역 | 사용한 질문/장소 |
| --- | --- |
| 서울 강남구 | 노인복지관, 구청에서 복지관까지 길찾기 |
| 부산 해운대구 | 노인복지관, 구청에서 복지관까지 길찾기 |
| 인천 연수구 | 요양원/노인요양시설 |
| 대전 서구 | 구청, 보건소, 노인복지 정책 |
| 광주 북구 | 치매안심센터, 노인 돌봄 |

## 검증 방법

1. JSON case 파일에 tool 이름, 입력값, 기대 결과를 정의한다.
2. fake API fixture에 실제 외부 API와 비슷한 raw response DTO를 저장한다.
3. 테스트 코드에서 `httpx.Client`를 fake client로 patch한다.
4. External MCP ASGI 앱을 임시 HTTP 포트에 띄운다.
5. MCP client가 `list_tools`로 4개 tool 노출을 확인한다.
6. MCP client가 `call_tool`로 fake API 16개 케이스를 호출한다.
7. MCP 서버 연결 + fake API 로그는 `run_logs/fake_server_call/`에 저장한다.
8. MCP 서버 연결 + 실제 외부 API 로그는 `run_logs/live_server_call/`에 저장한다.
9. `fake_server_call`과 `live_server_call`은 `runners/server_call_runner.py`의 같은 `run_server_call_cases()` 함수에서 `mode="fake"` / `mode="live"` 분기만 다르게 실행한다.
10. fake HTTP 처리, artifact 저장, 결과 검증, 응답 요약은 `tests/blackbox/support/`로 분리해 runner가 서버 호출 흐름에 집중하도록 정리했다.
11. 최종 CSV는 `results/fake_api_results.csv`, `results/live_api_results.csv` 두 개만 둔다.

## 예외 케이스 대응

이번 테스트를 만들면서 결과 없음이 조용히 성공으로만 남지 않도록 개선했다.

- `naver.search`: 검색 결과가 0개면 `warnings`에 `No Naver search results found.` 추가
- `web.search`: 검색 결과가 0개면 `warnings`에 `No Firecrawl search results found.` 추가
- `tmap.search_poi`: POI 결과가 0개면 `warnings`에 `No TMAP POI results found.` 추가
- `tmap.route_pedestrian`: route features가 없으면 `warnings`에 `No TMAP pedestrian route features found.` 추가

기존의 빈 입력, API key 누락, API 실패도 `success=false`, `warnings` 구조로 유지된다.

실제 live API 검증 중 `해운대구노인복지관` 검색 결과에 `수영구노인복지관`이 섞이는 문제가 발견되었다. 이에 대응해 TMAP POI 결과 정규화 후 검색어의 지역 단서와 맞지 않는 POI를 제외하도록 개선했다.

- 검색어에서 `해운대구`, `해운대` 같은 지역 단서를 추출
- POI의 `name`, `address`, `category`에 지역 단서가 없는 결과 제외
- 제외된 결과는 `warnings`에 기록

## 실행 결과

명령:

```bash
cd external_mcp
PYTHONPATH=src uv run python -m unittest discover -s tests
```

결과:

```text
Ran 11 tests
OK
```

Black-box 세부 결과:

```text
fake server call: 16 cases passed, 0 failed
live server call: 12 cases passed, 0 failed
```

산출물:

- `external_mcp/tests/blackbox/run_logs/fake_server_call/mcp_requests.jsonl`
- `external_mcp/tests/blackbox/run_logs/fake_server_call/mcp_responses.jsonl`
- `external_mcp/tests/blackbox/run_logs/fake_server_call/summary.json`
- `external_mcp/tests/blackbox/run_logs/live_server_call/mcp_requests.jsonl`
- `external_mcp/tests/blackbox/run_logs/live_server_call/mcp_responses.jsonl`
- `external_mcp/tests/blackbox/run_logs/live_server_call/summary.json`
- `external_mcp/tests/blackbox/results/fake_api_results.csv`
- `external_mcp/tests/blackbox/results/live_api_results.csv`

## 평가 기준 연결

| 평가 질문 | 반영 내용 |
| --- | --- |
| 주요 기능 테스트 항목과 방법이 적절한가 | tool별 JSON test case와 fake API fixture로 입력/요청/응답을 분리해 검증 |
| 질문 입력, API 요청, LLM 응답 출력 등 핵심 기능이 검증되었는가 | 이번 범위에서는 LLM 응답 출력이 아니라 MCP 입력, fake API 요청, MCP HTTP 연결, MCP 응답 DTO를 검증. backend agent end-to-end 검증은 별도 과제로 분리 |
| 빈 입력, 잘못된 요청, 응답 실패, 답변 불가 상황이 테스트되었는가 | 빈 query/keyword, 검색 결과 없음, TMAP API 실패를 포함 |
| 테스트 결과와 발견 문제, 수정 사항이 정리되었는가 | artifacts와 이 보고서에 결과 및 edge warning 개선 사항을 기록 |

## 남은 개선

- backend `/chat/stream`을 fake External MCP 서버와 연결해 agent-level tool call 기록까지 저장하는 통합 테스트 추가
- 실제 API key가 있는 환경에서 smoke test를 별도 opt-in 명령으로 분리
- 발표용 표와 스크린샷을 `presentation/test-data/external-mcp-blackbox/`에 추가
