# Maps MCP

Naver Search와 TMAP Open API를 backend와 분리해서 제공하는 FastMCP 서비스입니다. Backend는 나중에 이 서비스를 MCP client로 붙이고, frontend는 브라우저 공개 가능한 Naver Maps JS SDK 키만 사용합니다.

## Runtime

- Python 3.13
- FastAPI
- FastMCP / MCP Streamable HTTP
- Pydantic / pydantic-settings
- uv

## Layout

```text
maps_mcp/
├── src/app.py                 # FastAPI bootstrap and MCP mount
├── src/api/mcp/server.py      # FastMCP tool registration
├── src/external/              # Naver/TMAP HTTP adapters
├── src/settings.py            # Environment settings
├── tests/
├── .env.schema
├── pyproject.toml
└── uv.lock
```

## Run

```bash
cd maps_mcp
make start
```

기본 endpoint:

```text
http://127.0.0.1:8020/mcp/
```

## MCP Tools

| tool | role |
| --- | --- |
| `maps.search_naver_local` | Naver Local Search API로 장소/기관 후보 조회 |
| `maps.search_tmap_poi` | TMAP POI 검색 |
| `maps.request_tmap_pedestrian_route` | TMAP 보행자 경로 요청 |
| `maps.request_tmap_car_route` | TMAP 자동차 경로 요청 |
| `institution.search_by_region` | 지역과 카테고리 기준 기관 후보 통합 조회 |
| `institution.rank_nearby` | 좌표가 있는 기관을 사용자 위치와의 거리순으로 정렬 |
| `institution.geocode` | 주소 문자열을 Naver Local/TMAP POI 기반으로 best-effort 조회 |

## Environment

환경 변수 계약은 `maps_mcp/.env.schema`에서 관리합니다. 실제 secret 값은 Infisical 또는 ignored local env 파일에 둡니다.

| env | default | description |
| --- | --- | --- |
| `MAPS_MCP_HOST` | `127.0.0.1` | Maps MCP bind host |
| `MAPS_MCP_PORT` | `8020` | Maps MCP port |
| `MAPS_EXTERNAL_MCP_PATH` | `/mcp` | mounted Streamable HTTP MCP path |
| `MAPS_API_REQUEST_TIMEOUT_MS` | `5000` | provider API request timeout |
| `NAVER_SEARCH_CLIENT_ID` | empty | Naver Search API client id |
| `NAVER_SEARCH_CLIENT_SECRET` | empty | Naver Search API client secret |
| `NAVER_LOCAL_BASE_URL` | `https://openapi.naver.com/v1/search/local.json` | Naver Local Search endpoint |
| `TMAP_APP_KEY` | empty | TMAP Open API app key |
| `TMAP_BASE_URL` | `https://apis.openapi.sk.com` | TMAP Open API base URL |

Naver Maps JS SDK key와 Naver Search API key는 다릅니다. `NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID`는 frontend 공개 값이고, `NAVER_SEARCH_CLIENT_SECRET`과 `TMAP_APP_KEY`는 이 서비스의 server-only secret입니다.
