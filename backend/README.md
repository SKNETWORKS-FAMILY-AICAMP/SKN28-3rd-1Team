# Backend Agent Orchestrator

Django ASGI 기반 Backend Agent 서버입니다. Frontend의 채팅 요청을 받아 Main Agent를 실행하고, 필요한 경우 RAG MCP tool을 호출한 뒤 최종 답변을 반환합니다. 음성 답변은 텍스트 답변과 분리해서 생성합니다.

## 한눈에 보기

| 구분 | 현재 기준 |
| --- | --- |
| 서버 | Django ASGI + Daphne |
| Agent | LangChain `create_agent()` + LangGraph |
| LLM provider | OpenRouter 또는 Cerebras |
| RAG 연결 | RAG Backend의 FastMCP tool server |
| 텍스트 응답 | `POST /chat`, `POST /chat/stream` |
| 음성 응답 | `POST /chat/audio/stream` |
| TTS provider | ElevenLabs |
| 환경 변수 | Infisical dev + Varlock schema |
| 실행 기준 | `backend/Makefile` 우선 사용 |

## Backend 책임

Backend가 담당하는 일:

- 사용자 질문을 Main Agent에 전달하고 최종 답변을 생성합니다.
- RAG MCP tool을 Main Agent에 연결합니다.
- 최종 답변을 화면용 Markdown 그대로 Frontend에 전달합니다.
- 최종 답변을 음성용 문장으로 정리한 뒤 ElevenLabs TTS에 전달합니다.
- 구간별 timing log를 남겨 지연 원인을 확인할 수 있게 합니다.

Backend가 직접 담당하지 않는 일:

- Frontend 화면 렌더링
- 파일 업로드, 문서 파싱, chunking, embedding 저장
- RAG 데이터 ingest
- 브라우저 오디오 플레이어 UI

## 현재 응답 흐름

Frontend 권장 연동 방식은 텍스트와 음성을 분리하는 구조입니다.

| 순서 | 처리 | 설명 |
| --- | --- | --- |
| 1 | Frontend -> `/chat/stream` | 사용자 질문을 Backend로 보냅니다. |
| 2 | Main Agent | 답변을 생성하고 필요하면 RAG MCP tool을 호출합니다. |
| 3 | Backend -> Frontend | `delta`, `final` SSE event로 화면 답변을 먼저 보냅니다. |
| 4 | Frontend -> `/chat/audio/stream` | 사용자가 음성 답변을 켠 경우에만 최종 답변을 음성 생성 API로 보냅니다. |
| 5 | Speech Text 처리 | 로컬 sanitizer를 먼저 적용하고, 필요할 때만 Speech Text LLM을 호출합니다. |
| 6 | ElevenLabs TTS | 음성 chunk를 생성해 Frontend 재생바로 스트리밍합니다. |

중요한 점:

- 화면에 보이는 답변은 Main Agent의 원본 Markdown을 유지합니다.
- 음성용 텍스트 정리는 TTS에만 사용합니다.
- `speech_text_prompt.j2`는 Main Agent 답변 자체에 직접 영향을 주지 않습니다.
- 단순한 답변은 Speech Text LLM을 호출하지 않고 로컬 sanitizer만 사용합니다.

## 음성 지연 개선 내용

이전에는 텍스트 답변이 끝난 뒤 같은 흐름에서 Speech Text Agent와 ElevenLabs TTS까지 이어져 사용자가 더 오래 기다릴 수 있었습니다. 현재는 화면 답변 완료와 음성 생성을 분리했습니다.

| 항목 | 개선 전 | 개선 후 |
| --- | --- | --- |
| 화면 답변 표시 | 음성 처리까지 같이 기다릴 수 있음 | `final` 수신 즉시 화면 답변 완료 |
| 음성 생성 | 텍스트 흐름 뒤에 이어짐 | `/chat/audio/stream`에서 별도 실행 |
| Speech Text LLM | 매번 호출될 수 있음 | 로컬 sanitizer 우선, 길거나 복잡할 때만 호출 |
| Markdown 처리 | 음성용 정리와 화면 답변이 헷갈릴 수 있음 | 화면은 Markdown 유지, 음성만 plain text로 정리 |
| 병목 확인 | 전체 지연만 보임 | `chat_timing` 로그로 구간별 확인 |

음성용 변환 예시:

```markdown
## 신청 방법
- **주민센터**에 방문하세요.
- [복지로](https://www.bokjiro.go.kr)에서도 확인할 수 있습니다.
```

```text
신청 방법 주민센터에 방문하세요. 복지로에서도 확인할 수 있습니다.
```

## API

### `GET /health`

서버 상태를 확인합니다.

```bash
curl -s http://127.0.0.1:8000/health
```

응답 예시:

```json
{"status":"ok","service":"SKN28 Backend","version":"0.1.0"}
```

### `POST /chat`

최종 JSON 응답만 받을 때 사용합니다.

요청:

```json
{
  "session_id": "optional-session-id",
  "message": "노인일자리 신청 방법 알려줘",
  "audio_enabled": false,
  "metadata": {
    "source": "frontend"
  }
}
```

응답:

```json
{
  "answer": "신청 방법은 주민센터 또는 복지로에서 확인할 수 있습니다.",
  "tool_calls": [],
  "sources": [],
  "session_id": "optional-session-id"
}
```

### `POST /chat/stream`

화면 답변을 SSE로 받을 때 사용합니다.

Frontend는 음성 지연을 줄이기 위해 보통 `audio_enabled: false`로 호출하고, `final`을 받은 뒤 별도로 `/chat/audio/stream`을 호출합니다.

요청:

```json
{
  "session_id": "browser-session-id",
  "message": "노인일자리 신청 방법 알려줘",
  "audio_enabled": false,
  "metadata": {
    "source": "frontend"
  }
}
```

응답 event:

```text
event: delta
data: {"type":"delta","content":"신청은 "}

event: final
data: {"type":"final","answer":"신청은 주민센터에서 할 수 있습니다.","tool_calls":[],"sources":[],"session_id":"browser-session-id","turn_id":"..."}
```

### `POST /chat/audio/stream`

최종 답변을 음성으로 만들 때 사용합니다.

요청:

```json
{
  "session_id": "browser-session-id",
  "turn_id": "optional-turn-id",
  "answer": "신청은 주민센터에서 할 수 있습니다."
}
```

응답 event:

```text
event: speech_text
data: {"type":"speech_text","text":"신청은 주민센터에서 할 수 있습니다.","source":"local","llm_used":false}

event: audio
data: {"type":"audio","audio_base64":"...","mime_type":"audio/mpeg","chunk_index":0}

event: audio_done
data: {"type":"audio_done","chunks":40,"configured":true}
```

## 주요 파일

| 파일 | 역할 |
| --- | --- |
| `src/app.py` | Django ASGI application 진입점 |
| `src/django_backend/urls.py` | `/health`, `/chat`, `/chat/stream`, `/chat/audio/stream` route |
| `src/api/chat.py` | 채팅 request/response 모델과 일반 chat 실행 |
| `src/api/audio.py` | 분리된 음성 생성 SSE API |
| `src/graph/runner.py` | LangGraph 실행, SSE event 변환, timing log |
| `src/graph/graph.py` | Main Agent, Speech Text, TTS, Screen Control graph 구성 |
| `src/graph/timing.py` | `chat_timing` 로그 helper |
| `src/agents/main_agent/` | Main Agent와 system prompt |
| `src/agents/speech_text_agent/` | 음성용 텍스트 sanitizer, 조건부 Speech Text LLM, prompt |
| `src/nodes/speech_synthesis_node/` | ElevenLabs TTS streaming node |
| `src/tools/` | RAG MCP/local tool 로딩과 agent별 tool profile |
| `src/settings/` | runtime, LLM, ElevenLabs, RAG 설정 로딩 |
| `tests/test_chat_api.py` | audio flag 전달, sanitizer, LLM skip 테스트 |

## RAG MCP 연결

RAG는 별도 서비스가 담당하고, Backend는 MCP client로 tool만 가져와 Agent에 붙입니다.

| 구분 | 내용 |
| --- | --- |
| MCP URL | `RAG_MCP_URL` |
| 기본값 | `http://127.0.0.1:8010/mcp` |
| Docker 내부 | `http://rag-be:8010/mcp` |
| 비활성화 | `RAG_TOOLS_ENABLED=false` |
| timeout | `RAG_TOOL_TIMEOUT_MS` |

현재 Main Agent에 연결되는 RAG MCP tool:

- `memgraph_read_query`
- `memgraph_vector_search`
- `memgraph_text_index_search`
- `memgraph_graph_traverse`
- `memgraph_schema_read`

## 실행

아래 명령은 모두 repo root 기준으로 작성했습니다.

### Backend만 실행

```bash
cd backend
make start
```

`make start`는 다음 순서로 실행됩니다.

| 단계 | 설명 |
| --- | --- |
| `make sync` | `uv sync`로 `.venv` 준비 |
| `make env-check` | Infisical dev 값을 Varlock schema로 검증 |
| `daphne` | `PYTHONPATH=src`로 `app:application` 실행 |

기본 주소:

```text
http://127.0.0.1:8000
```

### 전체 Docker 실행

Frontend, Backend, RAG, Memgraph, Redis를 같이 볼 때 사용합니다.

```bash
cd deploy/makefile
make up
```

중지:

```bash
make down
```

로그:

```bash
make logs
```

현재 Docker 기준으로 확인한 주요 주소:

| 서비스 | 주소 |
| --- | --- |
| Frontend | `http://127.0.0.1:3000/chat` |
| Backend health | `http://127.0.0.1:8100/health` |
| RAG Backend health | `http://127.0.0.1:8110/health` |

## 환경 변수

환경 변수 계약은 `backend/.env.schema`에서 관리합니다. 실제 값은 Git에 올리지 않고 Infisical dev에서 주입합니다.

주요 변수:

| 변수 | 설명 |
| --- | --- |
| `OPENROUTER_API_KEY` | OpenRouter 사용 시 필요한 API key |
| `CEREBRAS_API_KEY` | Cerebras 사용 시 필요한 API key |
| `LLM_CHAT_PROVIDER` | Main Agent provider. `openrouter` 또는 `cerebras` |
| `LLM_CHAT_MODEL` | Main Agent 모델 |
| `LLM_SPEECH_TEXT_PROVIDER` | Speech Text Agent provider. 비우면 chat provider 상속 |
| `LLM_SPEECH_TEXT_MODEL` | Speech Text Agent 모델 |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS API key |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice id |
| `ELEVENLABS_TTS_MODEL_ID` | ElevenLabs TTS 모델 |
| `RAG_MCP_URL` | RAG MCP tool server URL |
| `RAG_TOOLS_ENABLED` | RAG tool 로딩 여부 |
| `RUNTIME_CORS_ORIGINS` | 허용할 Frontend origin 목록 |

검증:

```bash
cd backend
make env-check
```

## 구간별 지연 로그

음성 지연 병목은 `chat_timing` 로그로 확인합니다.

Docker 실행 중 확인:

```bash
docker logs skn28-backend --since 5m | rg "chat_timing"
```

확인할 phase:

| phase | 의미 | 느리면 의심할 곳 |
| --- | --- | --- |
| `main_agent_start` | 채팅 요청 시작 | 요청 진입 |
| `first_delta` | 첫 텍스트 chunk 도착 | LLM 첫 응답, RAG tool |
| `final` | 화면 답변 완료 | Main Agent 전체 생성 |
| `audio_request_start` | 음성 생성 요청 시작 | Frontend 음성 호출 |
| `speech_text_done` | 음성용 텍스트 준비 완료 | sanitizer 또는 Speech Text LLM |
| `first_audio` | 첫 음성 chunk 도착 | ElevenLabs 시작 지연 |
| `audio_done` | 음성 생성 완료 | 답변 길이, TTS 전송 |
| `stream_completed` | Backend stream 종료 | 전체 stream 정리 |

예시 해석:

- `first_delta`가 늦으면 Main Agent, RAG tool, LLM provider를 확인합니다.
- `speech_text_done`이 늦고 `llm_used=true`이면 Speech Text LLM 호출이 병목입니다.
- `first_audio`가 늦으면 ElevenLabs TTS 시작 지연입니다.
- `audio_done`만 늦으면 음성 텍스트가 길거나 audio chunk 전송 시간이 긴 상태입니다.

## 검증

Backend 변경 후 기본 검증:

```bash
cd backend
make check
make test
```

수동 smoke test:

```bash
curl -s http://127.0.0.1:8000/health
```

```bash
curl -N http://127.0.0.1:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"session_id":"manual-stream","message":"노인일자리 신청 방법을 알려줘","audio_enabled":false}'
```

```bash
curl -N http://127.0.0.1:8000/chat/audio/stream \
  -H "Content-Type: application/json" \
  -d '{"session_id":"manual-stream","answer":"신청은 주민센터나 복지로에서 할 수 있습니다."}'
```

Frontend까지 포함한 통합 확인:

```bash
cd deploy/makefile
make up
```

그 다음 브라우저에서 확인합니다.

```text
http://127.0.0.1:3000/chat
```

## 자주 나는 문제

| 증상 | 확인할 것 |
| --- | --- |
| `/chat` 또는 `/chat/stream`이 500 반환 | `LLM_CHAT_PROVIDER`와 provider API key가 Infisical dev에 있는지 확인 |
| RAG 답변이 안 나옴 | RAG Backend health, `RAG_MCP_URL`, `RAG_TOOLS_ENABLED` 확인 |
| 음성이 안 나옴 | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `/chat/audio/stream` 응답 event 확인 |
| 화면 답변이 Markdown으로 안 보임 | Frontend Markdown renderer와 CSS 확인. Backend는 Markdown 원문을 반환함 |
| 음성 지연이 큼 | `chat_timing` 로그에서 `speech_text_done`, `first_audio`, `audio_done` 간격 확인 |
| CORS 오류 | `RUNTIME_CORS_ORIGINS`에 Frontend 주소가 포함되어 있는지 확인 |
| `Address already in use` | 이미 같은 포트를 쓰는 프로세스가 있는지 확인 |

## 관련 문서

음성 지연 개선 배경, 개선 전/후 비교, 측정 방법은 아래 문서에 정리되어 있습니다.

```text
docs/voice-response-latency/voice-response-latency.md
```
