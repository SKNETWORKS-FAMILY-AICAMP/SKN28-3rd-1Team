# External MCP Black-Box 테스트 결과 보고서

작성일: 2026-06-25

## 1. 테스트 목적

External MCP 서버가 Naver, Firecrawl, TMAP API를 MCP tool 형태로 안정적으로 노출하는지 black-box 관점에서 검증했다.
테스트는 내부 구현 세부가 아니라 MCP client가 실제로 `list_tools`와 `call_tool`을 수행했을 때의 요청/응답, DTO 모양, 예외 응답, 지역 필터링 결과를 기준으로 판단했다.

RAG는 이번 평가 범위에서 제외했다.

## 2. 테스트 범위

| 구분 | 대상 |
| --- | --- |
| MCP tool | `naver.search`, `web.search`, `tmap.search_poi`, `tmap.route_pedestrian` |
| Fake API 테스트 | Naver/Firecrawl/TMAP 가짜 응답 기반 DTO와 edge case 검증 |
| Live API 테스트 | Infisical secret으로 실제 Naver/Firecrawl/TMAP API 호출 검증 |
| 산출물 | `results/fake_api_results.csv`, `results/live_api_results.csv`, `run_logs/*` |

## 3. 핵심 지표

| 지표 | Fake API | Live API | 합계 |
| --- | ---:| ---:| ---:|
| 계획한 테스트 수 | 16 | 12 | 28 |
| 실행한 테스트 수 | 16 | 12 | 28 |
| 계획 대비 실행률 | 100% | 100% | 100% |
| 성공 | 16 | 12 | 28 |
| 실패 | 0 | 0 | 0 |
| 차단 | 0 | 0 | 0 |
| 자동화 실행 시간 | 0.546초 | 3.520초 | 4.066초 |
| 불안정 테스트 수 | 0 | 0 | 0 |

불안정 테스트 수는 재실행/flake 추적 산출물이 없으므로, 현재 기록된 자동화 결과에서 재시도 실패나 flaky marker가 확인된 테스트 수를 0으로 기록했다.

## 4. 요구사항별 테스트 적용 여부

| 요구사항 | 적용 여부 | 근거 |
| --- | --- | --- |
| 4개 MCP tool이 모두 노출되는가 | 적용 | fake/live 모두 expected tool 4개를 `list_tools`로 확인 |
| Naver 검색 DTO가 query/category/result 구조를 유지하는가 | 적용 | fake 4건, live 3건 |
| Firecrawl 웹 검색 DTO가 query/result/url/markdown 옵션 구조를 유지하는가 | 적용 | fake 4건, live 3건 |
| TMAP POI가 주소, 좌표, 네이버지도 위치 URL을 반환하는가 | 적용 | fake 4건, live 3건 |
| TMAP 보행자 경로가 거리/시간/단계/경로 URL을 반환하는가 | 적용 | fake 4건, live 3건 |
| 빈 입력, 결과 없음, API 실패 등 예외 케이스가 검증되었는가 | 부분 적용 | fake edge case 4건. live는 정상 API 응답 위주 |
| 실제 API secret이 산출물에 기록되지 않는가 | 적용 | live summary의 `secrets_recorded=false` |
| 지역 외 결과가 섞일 때 진단 가능한가 | 적용 | live TMAP POI 결과의 region diagnostics 기록 |

## 5. 도구별 결과

| Provider group | Fake 실행/성공 | Live 실행/성공 |
| --- | ---:| ---:|
| Naver | 4/4 | 3/3 |
| Web/Firecrawl | 4/4 | 3/3 |
| TMAP | 8/8 | 6/6 |

## 6. 결함 및 위험

| 심각도 | 미해결 결함 수 | 내용 |
| --- | ---:| --- |
| Critical | 0 | 없음 |
| High | 0 | 없음 |
| Medium | 0 | 없음 |
| Low | 0 | 없음 |

현재 실패한 black-box case는 없다.
다만 live 테스트는 외부 API 상태와 검색 결과 변동에 영향을 받을 수 있으므로, 보고서 제출 전 재실행이 필요하다.

## 7. 코드 커버리지

코드 커버리지는 미측정이다.
현재 `external_mcp` venv에는 `coverage` 패키지가 설치되어 있지 않고, 이번 검증은 MCP 서버를 HTTP black-box로 호출하는 방식이라 line coverage보다 API 계약 검증이 주요 지표다.

추가 개선 시 `coverage` 또는 `pytest-cov`를 dev dependency로 추가하고, black-box 테스트와 unit 테스트를 분리해 커버리지 산출물을 만들 수 있다.

## 8. 최종 판단

External MCP black-box 테스트는 계획된 28개 중 28개를 모두 실행했고 모두 통과했다.
현재 기준으로 MCP tool 자체의 DTO 반환, live API 연결, 주요 예외 케이스 대응은 보고서 요구사항을 충족한다.

