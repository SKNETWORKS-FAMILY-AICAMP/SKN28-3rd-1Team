# External MCP Tests

처음 테스트는 실제 외부 API를 호출하지 않고 mock으로 작성합니다.

## Suggested Coverage

1. MCP server에 예상 tool 이름이 등록되는지 확인합니다.
2. API key가 없을 때 warning result를 반환하는지 확인합니다.
3. Naver 응답을 `title`, `url`, `description` 중심으로 정규화하는지 확인합니다.
4. Firecrawl 응답을 `title`, `url`, `description`, optional markdown preview로 정규화하는지 확인합니다.
5. TMAP POI 응답을 `name`, `address`, `lat`, `lon` 중심으로 정규화하는지 확인합니다.
6. TMAP route 응답을 `distance_meters`, `duration_seconds`, `steps` 중심으로 정규화하는지 확인합니다.

## Black-Box MCP Test Set

`tests/blackbox/`에는 RAG 평가를 제외하고 External MCP tool 4개를 fake API fixture로 검증하는 테스트셋이 있다.

- tool별 4개씩 총 16개 케이스
- 지역 다양화: 서울 강남구, 부산 해운대구, 인천 연수구, 대전 서구, 광주 북구
- 장소 다양화: 노인복지관, 요양원, 구청, 보건소, 치매안심센터
- edge case: 빈 입력, 결과 없음, API 실패
- 로그: `tests/blackbox/run_logs/fake_server_call/`, `live_server_call/`
- `run_logs/fake_server_call/`에는 MCP 서버 연결 + fake API 호출 로그를 저장한다.
- `run_logs/live_server_call/`에는 MCP 서버 연결 + 실제 외부 API 호출 로그를 저장한다.
- `fake_server_call`과 `live_server_call`은 `tests/blackbox/runners/server_call_runner.py`의 같은 `run_server_call_cases()` 함수에서 `mode="fake"` / `mode="live"` 분기만 다르게 실행한다.
- `tests/blackbox/support/`에는 fake HTTP 처리, artifact 저장, 결과 검증, 응답 요약 공통 코드를 분리해 둔다.
- 최종 CSV는 `tests/blackbox/results/fake_api_results.csv`, `live_api_results.csv` 두 개만 둔다.
- 현재 black-box 범위는 MCP HTTP client 연결 검증까지이며, backend `/chat/stream`과 agent tool 선택 검증은 별도 통합 테스트 범위다.
