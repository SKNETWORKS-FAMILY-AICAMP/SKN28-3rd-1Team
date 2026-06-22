# External MCP Tests

처음 테스트는 실제 외부 API를 호출하지 않고 mock으로 작성합니다.

## Suggested Coverage

1. MCP server에 예상 tool 이름이 등록되는지 확인합니다.
2. API key가 없을 때 warning result를 반환하는지 확인합니다.
3. Naver 응답을 `title`, `url`, `description` 중심으로 정규화하는지 확인합니다.
4. Firecrawl 응답을 `title`, `url`, `description`, optional markdown preview로 정규화하는지 확인합니다.
5. TMAP POI 응답을 `name`, `address`, `lat`, `lon` 중심으로 정규화하는지 확인합니다.
6. TMAP route 응답을 `distance_meters`, `duration_seconds`, `steps` 중심으로 정규화하는지 확인합니다.
