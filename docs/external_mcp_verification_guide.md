# External MCP API 검증 가이드

작성일: 2026-06-23  
대상 브랜치: `feature/external-mcp-skeleton`  
관련 커밋: `33f4de8 feat: add external mcp tools`

## 1. 이 작업을 왜 했는가

우리 agent는 기존에 RAG 문서 검색 중심으로 답변했다.

하지만 사용자가 복지센터 위치, 공식 홈페이지, 전화번호, 길찾기를 물어보면 RAG 문서만으로는 부족하다.

그래서 외부 API를 MCP tool로 감싸는 `external_mcp/` 서버를 만들었다.

전체 흐름은 아래와 같다.

```text
사용자 질문
-> frontend
-> backend agent
-> External MCP server
-> Naver / Firecrawl / TMAP API
-> agent 답변
-> frontend 화면
```

## 2. 지금까지 구현한 것

새로 만든 서비스:

```text
external_mcp/
```

노출한 MCP tool:

```text
naver.search
web.search
tmap.search_poi
tmap.route_pedestrian
```

backend 연결:

```text
backend/src/settings/external_mcp.py
backend/src/tools/from_mcp.py
backend/src/tools/registery.py
backend/src/tools/profiles/main_agent.json
```

검증 완료한 내용:

```text
1. 외부 API endpoint 직접 호출 성공
2. MCP Inspector에서 tool 목록 확인 성공
3. MCP Inspector에서 tool 호출 성공
4. backend agent가 external MCP tool 호출 성공
5. frontend에서 질문 입력 후 답변 표시 성공
```

## 3. 사용 포트 정리

로컬 검증에서 사용한 포트:

```text
external_mcp 서버: http://127.0.0.1:8020/
backend 서버:      http://127.0.0.1:8002/
frontend 서버:     http://127.0.0.1:3001/
```

`8000`이나 `3000`이 이미 사용 중이면 다른 포트를 사용하면 된다.

## 4. API key 관리

API key는 코드에 직접 쓰지 않는다.

Infisical에서 환경변수로 주입한다.

External MCP용 Infisical project:

```text
projectId=237f306b-17b2-4b2c-ad37-bdc78da2300b
env=dev
path=/
```

External MCP에서 필요한 환경변수:

```text
EXTERNAL_MCP_NAVER_CLIENT_ID
EXTERNAL_MCP_NAVER_CLIENT_SECRET
EXTERNAL_MCP_FIRECRAWL_API_KEY
EXTERNAL_MCP_TMAP_APP_KEY
```

backend용 Infisical project:

```text
projectId=f6a512e6-1960-4186-8ece-a3061824c185
env=dev
path=/
```

## 5. 처음부터 실행하는 방법

### 5.1 External MCP 서버 켜기

터미널 1개를 열고 실행한다.

```bash
cd ~/workspace/SKN28-3rd-1Team/external_mcp

infisical run \
  --projectId=237f306b-17b2-4b2c-ad37-bdc78da2300b \
  --env=dev \
  --path=/ \
  -- make start
```

정상 로그:

```text
Uvicorn running on http://127.0.0.1:8020
```

브라우저에서 `http://127.0.0.1:8020/`를 직접 열면 아래처럼 나올 수 있다.

```text
406 Not Acceptable
```

이것은 정상이다.

MCP 서버는 일반 웹페이지가 아니라 MCP client가 접속하는 서버이기 때문이다.

### 5.2 Backend 서버 켜기

터미널 2개째를 열고 실행한다.

이번 검증에서는 RAG 서버 영향을 빼고 external MCP만 확인하기 위해 `RAG_TOOLS_ENABLED=false`를 사용한다.

```bash
cd ~/workspace/SKN28-3rd-1Team/backend

infisical run \
  --projectId=f6a512e6-1960-4186-8ece-a3061824c185 \
  --env=dev \
  --path=/ \
  -- env \
  RAG_TOOLS_ENABLED=false \
  EXTERNAL_MCP_TOOLS_ENABLED=true \
  EXTERNAL_MCP_URL=http://127.0.0.1:8020/ \
  PYTHONPATH=src \
  uv run daphne -b 127.0.0.1 -p 8002 app:application
```

정상 로그:

```text
Listening on TCP address 127.0.0.1:8002
```

health 확인:

```bash
curl -s http://127.0.0.1:8002/health
```

기대 응답:

```json
{
  "status": "ok",
  "service": "SKN28 Backend",
  "version": "0.1.0"
}
```

### 5.3 Frontend 서버 켜기

터미널 3개째를 열고 실행한다.

backend를 `8002`에 켰기 때문에 frontend의 `BACKEND_URL`도 `8002`로 맞춘다.

```bash
cd ~/workspace/SKN28-3rd-1Team/frontend

BACKEND_URL=http://127.0.0.1:8002 make start PORT=3001
```

정상 로그:

```text
Local: http://127.0.0.1:3001
Ready
```

브라우저에서 접속:

```text
http://127.0.0.1:3001/chat_page
```

## 6. Frontend에서 답변 확인하는 방법

브라우저에서 아래 주소를 연다.

```text
http://127.0.0.1:3001/chat_page
```

채팅창에 입력한다.

```text
강남구 안에서 노인복지관 찾아줘
```

화면에서 확인할 것:

```text
1. 답변이 정상적으로 표시되는가
2. 한글이 깨지지 않는가
3. 강남구 안의 장소를 말하는가
4. 너무 오래 멈추지 않는가
```

브라우저 개발자도구에서 확인할 것:

```text
1. F12 또는 Ctrl + Shift + I
2. Network 탭
3. Fetch/XHR 필터
4. /api/chat_page 요청 클릭
5. Response 탭에서 answer, tool_calls 확인
```

`tool_calls` 예시:

```json
[
  {
    "name": "web_search",
    "status": "completed",
    "id": "9a6aa335f"
  },
  {
    "name": "tmap_search_poi",
    "status": "completed",
    "id": "fc0fcfd60"
  },
  {
    "name": "tmap_route_pedestrian",
    "status": "completed",
    "id": "51e6d77af"
  }
]
```

`naver_search`가 항상 나오는 것은 아니다.

agent가 질문을 보고 필요한 tool을 선택하기 때문이다.

네이버를 강제로 확인하고 싶으면 이렇게 질문한다.

```text
네이버 지역 검색으로 강남구 노인복지관을 찾아보고, 찾은 장소 이름과 주소를 알려줘
```

그러면 `tool_calls`에 아래가 나오는지 확인한다.

```text
naver_search
```

## 7. Backend에서 직접 agent 확인하는 방법

frontend를 거치지 않고 backend에 바로 질문할 수 있다.

```bash
curl -s http://127.0.0.1:8002/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "강남구 안에서 노인복지관 찾아주고, 위치와 걸어가는 방법도 알려줘",
    "metadata": {
      "source": "manual_test"
    }
  }'
```

한글 답변만 보기:

```bash
curl -s http://127.0.0.1:8002/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "강남구 안에서 노인복지관 찾아줘",
    "metadata": {
      "source": "manual_test"
    }
  }' | jq -r '.answer'
```

tool 호출만 보기:

```bash
curl -s http://127.0.0.1:8002/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "네이버 지역 검색으로 강남구 노인복지관을 찾아보고, 찾은 장소 이름과 주소를 알려줘",
    "metadata": {
      "source": "manual_test"
    }
  }' | jq '.tool_calls'
```

## 8. Backend stream으로 tool 호출 과정을 보는 방법

`/chat`은 최종 답변을 한 번에 받는다.

`/chat/stream`은 중간 과정을 실시간으로 보여준다.

```bash
curl -N -s http://127.0.0.1:8002/chat/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "message": "강남구 안에서 노인복지관 찾아주고, 위치도 알려줘",
    "metadata": {
      "source": "manual_stream_test"
    }
  }'
```

예상 출력:

```text
event: tool_call
data: {"type":"tool_call","tool_call":{"name":"web_search","status":"started"}}

event: tool_call
data: {"type":"tool_call","tool_call":{"name":"web_search","status":"completed"}}

event: tool_call
data: {"type":"tool_call","tool_call":{"name":"tmap_search_poi","status":"started"}}

event: delta
data: {"type":"delta","content":"강남구 안에서..."}
```

보는 방법:

```text
tool_call started = tool 호출 시작
tool_call completed = tool 호출 완료
delta = 답변 텍스트 생성 중
```

만약 오래 멈추면 마지막 event를 본다.

예시:

```text
tmap_search_poi started에서 멈춤
-> TMAP 장소 검색이 오래 걸리는 중

tool_call은 completed인데 delta가 늦음
-> LLM 답변 생성이 느린 중
```

## 9. MCP Inspector로 확인하는 방법

MCP Inspector는 우리가 만든 MCP 서버가 tool을 잘 노출하는지 확인하는 도구다.

Postman과 다르다.

```text
MCP Inspector
-> external_mcp 서버 확인
-> naver.search, web.search 같은 MCP tool 확인

Postman
-> Naver, Firecrawl, TMAP 원본 API endpoint 직접 확인
```

### 9.1 Inspector 실행

External MCP 서버가 켜져 있어야 한다.

```text
http://127.0.0.1:8020/
```

새 터미널에서 실행:

```bash
npx @modelcontextprotocol/inspector
```

브라우저에 Inspector 주소가 뜬다.

보통 아래와 비슷하다.

```text
http://localhost:6274
```

Inspector 화면에서:

```text
Transport: Streamable HTTP
URL: http://127.0.0.1:8020/
```

연결 후 tool 목록에서 아래가 보이면 성공이다.

```text
naver.search
web.search
tmap.search_poi
tmap.route_pedestrian
```

### 9.2 Inspector에서 TMAP POI 확인

tool:

```text
tmap.search_poi
```

입력:

```json
{
  "keyword": "강남노인종합복지관",
  "limit": 2,
  "center_lon": 127.0473,
  "center_lat": 37.5172,
  "radius_km": 5
}
```

봐야 하는 값:

```text
name
address
lon
lat
```

예상 값:

```json
{
  "name": "강남노인종합복지관",
  "address": "서울 강남구 삼성동",
  "lon": 127.05193243,
  "lat": 37.51604471
}
```

Inspector는 지도에 핀을 찍어주는 도구가 아니다.

`lon`, `lat`가 나오면 지도 표시용 좌표를 얻은 것이다.

### 9.3 Inspector에서 TMAP route 확인

tool:

```text
tmap.route_pedestrian
```

입력:

```json
{
  "start_lon": 127.0473,
  "start_lat": 37.5172,
  "end_lon": 127.05193243,
  "end_lat": 37.51604471,
  "start_name": "강남구청",
  "end_name": "강남노인종합복지관"
}
```

봐야 하는 값:

```text
distance_meters
duration_seconds
steps
```

예상 값:

```json
{
  "distance_meters": 610,
  "duration_seconds": 481,
  "steps": [
    {
      "description": "보행자도로를 따라 47m 이동"
    }
  ]
}
```

TMAP route에서 400이 나면 아래를 확인한다.

```text
1. tmap.search_poi에서 받은 lon, lat를 그대로 사용했는가
2. start_lon/end_lon은 경도인가
3. start_lat/end_lat은 위도인가
4. 숫자에 따옴표나 쉼표 오류가 없는가
5. TMAP appKey가 Infisical에 들어 있는가
```

## 10. 직접 API endpoint 확인하는 방법

아래 명령은 `external_mcp`를 거치지 않고 Naver, Firecrawl, TMAP endpoint를 직접 호출한다.

실행 위치:

```bash
cd ~/workspace/SKN28-3rd-1Team
```

### 10.1 Naver Search API

endpoint:

```text
GET https://openapi.naver.com/v1/search/local.json
```

명령:

```bash
infisical run \
  --projectId=237f306b-17b2-4b2c-ad37-bdc78da2300b \
  --env=dev \
  --path=/ \
  -- bash -lc '
curl -sG "https://openapi.naver.com/v1/search/local.json" \
  -H "X-Naver-Client-Id: $EXTERNAL_MCP_NAVER_CLIENT_ID" \
  -H "X-Naver-Client-Secret: $EXTERNAL_MCP_NAVER_CLIENT_SECRET" \
  --data-urlencode "query=강남구 노인복지관" \
  -d display=2 \
  -d start=1 \
| jq "{total, display, items: [.items[] | {title, category, address, roadAddress, link}]}"
'
```

봐야 하는 값:

```text
items[].title
items[].category
items[].address
items[].roadAddress
items[].link
```

성공 예시:

```json
{
  "title": "강남노인종합복지관",
  "category": "사회,복지>노인복지",
  "address": "서울특별시 강남구 삼성동 66 4층",
  "roadAddress": "서울특별시 강남구 삼성로 628 4층"
}
```

### 10.2 Firecrawl Search API

endpoint:

```text
POST https://api.firecrawl.dev/v2/search
```

명령:

```bash
infisical run \
  --projectId=237f306b-17b2-4b2c-ad37-bdc78da2300b \
  --env=dev \
  --path=/ \
  -- bash -lc '
curl -s "https://api.firecrawl.dev/v2/search" \
  -H "Authorization: Bearer $EXTERNAL_MCP_FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"강남구 노인복지관 공식\",\"limit\":2,\"sources\":[\"web\"],\"country\":\"KR\",\"ignoreInvalidURLs\":true}" \
| jq "{success, first: ((.data.web[0] // {}) | {title, url, description})}"
'
```

봐야 하는 값:

```text
success
data.web[].title
data.web[].url
data.web[].description
```

성공 예시:

```json
{
  "success": true,
  "first": {
    "title": "강남노인종합복지관 - 강남구청",
    "url": "https://www.gangnam.go.kr/office/gnsw/main.do",
    "description": "복지관 공지사항..."
  }
}
```

### 10.3 TMAP POI API

endpoint:

```text
GET https://apis.openapi.sk.com/tmap/pois
```

명령:

```bash
infisical run \
  --projectId=237f306b-17b2-4b2c-ad37-bdc78da2300b \
  --env=dev \
  --path=/ \
  -- bash -lc '
curl -sG "https://apis.openapi.sk.com/tmap/pois" \
  -H "appKey: $EXTERNAL_MCP_TMAP_APP_KEY" \
  -d version=1 \
  --data-urlencode "searchKeyword=강남노인종합복지관" \
  -d searchType=all \
  -d searchtypCd=A \
  -d resCoordType=WGS84GEO \
  -d reqCoordType=WGS84GEO \
  -d count=2 \
  -d page=1 \
  -d centerLon=127.0473 \
  -d centerLat=37.5172 \
  -d radius=5 \
| jq "{totalCount: .searchPoiInfo.totalCount, pois: [.searchPoiInfo.pois.poi[]? | {name, telNo, upperAddrName, middleAddrName, lowerAddrName, frontLon, frontLat}]}"
'
```

봐야 하는 값:

```text
name
telNo
frontLon
frontLat
```

성공 예시:

```json
{
  "name": "강남노인종합복지관",
  "telNo": "02-549-7070",
  "frontLon": "127.05193243",
  "frontLat": "37.51604471"
}
```

중요:

```text
frontLon = 경도
frontLat = 위도
```

### 10.4 TMAP Pedestrian Route API

endpoint:

```text
POST https://apis.openapi.sk.com/tmap/routes/pedestrian
```

명령:

```bash
infisical run \
  --projectId=237f306b-17b2-4b2c-ad37-bdc78da2300b \
  --env=dev \
  --path=/ \
  -- bash -lc '
curl -s "https://apis.openapi.sk.com/tmap/routes/pedestrian" \
  -H "appKey: $EXTERNAL_MCP_TMAP_APP_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"startX\":127.0473,\"startY\":37.5172,\"endX\":127.05193243,\"endY\":37.51604471,\"startName\":\"강남구청\",\"endName\":\"강남노인종합복지관\",\"reqCoordType\":\"WGS84GEO\",\"resCoordType\":\"WGS84GEO\"}" \
| jq "{totalDistance: ([.features[]?.properties.totalDistance] | map(select(. != null))[0]), totalTime: ([.features[]?.properties.totalTime] | map(select(. != null))[0]), firstSteps: [.features[]?.properties | select(.description != null) | {description, distance, time}][0:3]}"
'
```

봐야 하는 값:

```text
totalDistance
totalTime
firstSteps[].description
```

성공 예시:

```json
{
  "totalDistance": 610,
  "totalTime": 481,
  "firstSteps": [
    {
      "description": "보행자도로를 따라 47m 이동",
      "distance": null,
      "time": null
    }
  ]
}
```

## 11. Postman으로 확인하는 방법

Postman은 외부 API endpoint를 직접 확인할 때 사용한다.

MCP Inspector와 다르다.

```text
Postman
-> Naver / Firecrawl / TMAP 원본 endpoint 직접 확인

MCP Inspector
-> 우리가 만든 external_mcp tool 확인
```

Postman 웹:

```text
https://web.postman.co/
```

Postman 설치:

```text
https://www.postman.com/downloads/
```

웹 Postman에서 `Could not send request`가 나오면 Desktop Agent가 필요할 수 있다.

초보 단계에서는 설치형 Postman 앱을 쓰는 것이 쉽다.

### 11.1 Postman Environment 만들기

Postman에서:

```text
Environments
-> New Environment
-> 이름: SKN External API
```

변수 추가:

```text
NAVER_CLIENT_ID
NAVER_CLIENT_SECRET
FIRECRAWL_API_KEY
TMAP_APP_KEY
```

값은 Infisical에서 복사한다.

절대 GitHub나 채팅에 API key 값을 붙이지 않는다.

### 11.2 Postman - Naver Search

Method:

```text
GET
```

URL:

```text
https://openapi.naver.com/v1/search/local.json
```

Params:

```text
query    강남구 노인복지관
display  2
start    1
```

Headers:

```text
X-Naver-Client-Id        {{NAVER_CLIENT_ID}}
X-Naver-Client-Secret    {{NAVER_CLIENT_SECRET}}
```

성공 기준:

```text
Status: 200 OK
items[].title
items[].address
items[].roadAddress
```

400 에러가 나면 `Params`에 `query`가 들어갔는지 확인한다.

401 에러가 나면 `Headers`의 client id/secret을 확인한다.

### 11.3 Postman - Firecrawl Search

Method:

```text
POST
```

URL:

```text
https://api.firecrawl.dev/v2/search
```

Headers:

```text
Authorization    Bearer {{FIRECRAWL_API_KEY}}
Content-Type     application/json
```

Body:

```json
{
  "query": "강남구 노인복지관 공식",
  "limit": 2,
  "sources": ["web"],
  "country": "KR",
  "ignoreInvalidURLs": true
}
```

성공 기준:

```text
success: true
data.web[0].title
data.web[0].url
```

### 11.4 Postman - TMAP POI

Method:

```text
GET
```

URL:

```text
https://apis.openapi.sk.com/tmap/pois
```

Headers:

```text
appKey    {{TMAP_APP_KEY}}
```

Params:

```text
version         1
searchKeyword   강남노인종합복지관
searchType      all
searchtypCd     A
resCoordType    WGS84GEO
reqCoordType    WGS84GEO
count           2
page            1
centerLon       127.0473
centerLat       37.5172
radius          5
```

성공 기준:

```text
searchPoiInfo.pois.poi[0].name
searchPoiInfo.pois.poi[0].telNo
searchPoiInfo.pois.poi[0].frontLon
searchPoiInfo.pois.poi[0].frontLat
```

### 11.5 Postman - TMAP Pedestrian Route

Method:

```text
POST
```

URL:

```text
https://apis.openapi.sk.com/tmap/routes/pedestrian
```

Headers:

```text
appKey          {{TMAP_APP_KEY}}
Content-Type    application/json
```

Body:

```json
{
  "startX": 127.0473,
  "startY": 37.5172,
  "endX": 127.05193243,
  "endY": 37.51604471,
  "startName": "강남구청",
  "endName": "강남노인종합복지관",
  "reqCoordType": "WGS84GEO",
  "resCoordType": "WGS84GEO"
}
```

성공 기준:

```text
features[].properties.totalDistance
features[].properties.totalTime
features[].properties.description
```

## 12. 자주 나온 문제와 해결

### 12.1 `406 Not Acceptable`

상황:

```text
브라우저에서 http://127.0.0.1:8020/ 직접 열었을 때
```

의미:

```text
MCP 서버는 일반 웹페이지가 아니라서 브라우저 GET 요청을 거절한 것
```

해결:

```text
MCP Inspector로 접속한다.
```

### 12.2 `Address already in use`

예시:

```text
Couldn't listen on 127.0.0.1:8000
EADDRINUSE 127.0.0.1:3000
```

의미:

```text
이미 해당 포트를 다른 서버가 사용 중
```

확인:

```bash
ss -ltnp | grep 8000
ss -ltnp | grep 3000
```

끄기:

```bash
kill <PID>
```

또는 다른 포트를 사용한다.

```bash
# backend
uv run daphne -b 127.0.0.1 -p 8002 app:application

# frontend
BACKEND_URL=http://127.0.0.1:8002 make start PORT=3001
```

### 12.3 curl 결과가 `\uc548\ub155`처럼 보임

의미:

```text
JSON이 한글을 Unicode escape 형태로 보여주는 것
```

한글로 보기:

```bash
curl -s http://127.0.0.1:8002/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "강남구 안에서 노인복지관 찾아줘"
  }' | jq -r '.answer'
```

### 12.4 TMAP route 400

가장 흔한 원인:

```text
1. 좌표가 잘못됨
2. 위도/경도 순서를 바꿈
3. JSON body 형식이 틀림
4. appKey가 잘못됨
```

정확한 순서:

```text
1. 먼저 tmap.search_poi 호출
2. 결과의 lon, lat 확인
3. route의 end_lon/end_lat에 그대로 넣기
```

TMAP 원본 API에서는:

```text
startX, endX = 경도
startY, endY = 위도
```

우리 MCP tool에서는:

```text
start_lon, end_lon = 경도
start_lat, end_lat = 위도
```

### 12.5 Postman `Could not send request`

흔한 원인:

```text
1. 웹 Postman에서 Desktop Agent가 꺼져 있음
2. URL 오타
3. 네트워크 문제
4. localhost MCP 주소를 Postman에서 직접 치려고 함
```

처음에는 설치형 Postman 앱을 권장한다.

외부 API endpoint는 Postman에서 직접 확인해도 된다.

하지만 MCP 서버 주소는 Postman보다 MCP Inspector로 확인하는 것이 맞다.

## 13. 이번 검증에서 확인한 실제 예시 값

Naver:

```text
강남노인종합복지관
서울특별시 강남구 삼성동 66 4층
서울특별시 강남구 삼성로 628 4층
사회,복지>노인복지
```

Firecrawl:

```text
강남노인종합복지관 - 강남구청
https://www.gangnam.go.kr/office/gnsw/main.do
```

TMAP POI:

```text
name: 강남노인종합복지관
telNo: 02-549-7070
lon: 127.05193243
lat: 37.51604471
```

TMAP route:

```text
distance: 610m
duration: 481초
first step: 보행자도로를 따라 47m 이동
```

## 14. 다음 작업 후보

현재는 API 호출과 agent 연결까지 검증 완료했다.

다음 작업은 frontend 지도 표시다.

frontend에서 쓰면 좋은 값:

```text
tmap.search_poi 결과
- name
- address
- phone
- lon
- lat

tmap.route_pedestrian 결과
- distance_meters
- duration_seconds
- steps
```

지도 핀은 아래 두 값으로 찍는다.

```text
lon = 경도
lat = 위도
```

사용자 질문에 지역명이 들어오면 검색 query에 지역명을 포함해야 한다.

예시:

```text
나쁜 검색어: 노인복지관
좋은 검색어: 강남구 노인복지관
```

출발지를 사용자가 말하지 않았으면 route를 바로 계산하기보다 출발지를 물어보는 방향이 더 안전하다.
