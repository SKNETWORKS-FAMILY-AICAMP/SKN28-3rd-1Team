# External MCP

외부 API를 MCP tool로 노출하기 위한 별도 서비스 골격입니다.

이 서비스의 목적은 backend main agent가 RAG 문서 검색만이 아니라,
복지센터 위치 검색, 웹 검색, 길찾기 같은 외부 정보를 tool로 조회할 수 있게
하는 것입니다.

## Scope

- Naver Search API
- Firecrawl web search API
- TMAP POI / route API

OAuth나 MCP authentication은 첫 구현 범위에 포함하지 않습니다. 처음에는
Infisical로 주입된 API key를 환경 변수로 읽는 방식만 사용합니다.

## Layout

```text
external_mcp/
├── pyproject.toml
├── Makefile
├── .env.schema
├── README.md
├── src/
│   ├── __init__.py
│   ├── app.py
│   ├── server.py
│   ├── settings.py
│   └── external/
│       ├── __init__.py
│       ├── firecrawl.py
│       ├── naver.py
│       └── tmap.py
└── tests/
    ├── README.md
    ├── test_firecrawl.py
    ├── test_naver.py
    ├── test_server_tools.py
    └── test_tmap.py
```

## First Tool Set

처음에는 아래 tool만 작게 시작합니다.

| tool | purpose |
| --- | --- |
| `naver.search` | 네이버 검색 결과로 복지/기관/지역 정보를 찾습니다. |
| `web.search` | Firecrawl로 웹 검색과 근거 URL을 보강합니다. |
| `tmap.search_poi` | 복지센터, 주민센터, 병원 등 장소 후보와 좌표를 찾습니다. |
| `tmap.route_pedestrian` | 출발 좌표에서 도착 좌표까지 보행자 길찾기를 조회합니다. |

`tmap.route_car`는 첫 구현이 안정된 뒤 추가합니다.

## Env Contract

실제 값은 Infisical에 올리고, repo에는 값 없는 계약만 둡니다.

```text
EXTERNAL_MCP_NAVER_CLIENT_ID
EXTERNAL_MCP_NAVER_CLIENT_SECRET
EXTERNAL_MCP_FIRECRAWL_API_KEY
EXTERNAL_MCP_TMAP_APP_KEY
EXTERNAL_MCP_HOST
EXTERNAL_MCP_PORT
EXTERNAL_MCP_PATH
```

## Local Flow

```bash
cd external_mcp
make sync
make test
make start
```

MCP Inspector로 확인할 때는 Streamable HTTP URL에 아래 주소를 넣습니다.

```text
http://127.0.0.1:8020/
```

## Implementation Notes

- Python 파일의 실제 구현은 직접 작성합니다.
- 외부 API 호출 테스트는 실제 API key 없이 mock으로 먼저 작성합니다.
- API key가 없을 때 서버가 죽지 않고 명확한 warning result를 반환하게 합니다.
- tool 결과는 frontend가 나중에 지도 표시로 확장할 수 있도록 좌표와 경로 요약을 구조화해서 반환합니다.
