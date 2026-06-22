# ⚙️ Backend Agent Orchestrator

Django ASGI 기반 Agent Orchestrator 서버이다.

Frontend/BFF는 `POST /chat/stream`의 SSE로 생성 중인 답변 조각, reasoning, tool call, 음성 텍스트, ElevenLabs 오디오 chunk, LangGraph node lifecycle event를 받을 수 있다. Backend는 LangGraph 실행 결과를 자체 SSE event 계약으로 반환한다. AI SDK 변환, 파일 업로드, RAG ingest, ASR 처리는 backend 책임에서 제외한다.

## ✨ 한눈에 보기

| 구분 | 내용 |
| --- | --- |
| 🚪 API 입구 | `POST /chat/stream` SSE |
| 🧠 LLM | `ChatOpenRouter` / `ChatCerebras` 직접 생성 |
| 🧩 Agent | LangChain `create_agent()` + LangGraph checkpointer |
| 🛠️ Tool | `tools/`에서 MCP/local tool 관리 |
| 📚 RAG | FastMCP Tool Server에서 read-only MCP tools 로딩 |
| 💬 응답 | SSE `agent.text.*`/`agent.reasoning.*`/`agent.tool_call.*`/`speech_text.*`/`tts.*`/`node.updated`/`task.*` event 반환 |

## 🎯 현재 목표

기존의 `질문 분기 + schemas + 파일/RAG ingest + 자체 세션/rate limit` 구조를 다음 구조로 단순화한다.

```text
Frontend
  -> 🚪 POST /chat/stream
  -> ⚡  Django ASGI HTTP/SSE transport
  -> 🧠 Main Agent Orchestrator
  -> 🔗 ChatOpenRouter/ChatCerebras + LangChain tools
  -> 📚 MCP RAG tool server
  -> 💬 backend SSE event stream
```

## 🗂️ BACKEND 구조

```text
backend/
├── README.md                         # 안내 문서
├── pyproject.toml                    # 의존성
├── .env.schema                       # Varlock 환경 변수 계약
├── src/                              # 앱 소스
│   ├── app.py                        # Django ASGI 시작점
│   ├── logger.py                     # 로그 설정
│   ├── settings/                     # 도메인별 설정 로딩
│   ├── django_backend/               # Django settings, urls, request schemas, ASGI HTTP/SSE transport
│   ├── agents/                       # Agent 구성
│   │   ├── __init__.py               # 패키지 파일
│   │   ├── main_agent/               # agent.py, system prompt
│   │   ├── speech_text_agent/        # TTS용 음성 텍스트 생성과 prompt
│   │   └── screen_control_agent/     # 화면 제어 tool-calling agent
│   ├── tools/                        # MCP/local/FE tool registry
│   │   ├── registery.py              # Agent tool cache/registry
│   │   ├── profiles/                 # agent별 tool profile JSON
│   │   ├── from_mcp.py               # MCP tool loader
│   │   └── local.py                  # local tool 확장 위치
│   ├── utils/                        # 공통 utility
│   ├── memory/                       # conversation id, checkpointer, TTL boundary
│   ├── llm/                          # ChatOpenRouter/ChatCerebras 생성
│   │   ├── openrouter.py             # ChatOpenRouter 생성
│   │   └── cerebras.py               # ChatCerebras 생성
│   ├── graph/                        # Graph 실행 경계와 state
│   │   ├── graph.py                  # StateGraph construction
│   │   ├── runner.py                 # chat turn stream runner
│   │   └── state.py                  # StateGraph 전환용 state contract
│   ├── nodes/                        # Graph node 구현
│   │   └── speech_synthesis_node/    # ElevenLabs TTS node
└── tests/                            # 테스트
    └── test_backend_core.py          # 핵심 테스트
```

## 🧭 파일별 역할

| 파일 | 역할 |
| --- | --- |
| 🚀 `src/app.py` | Django ASGI `application` 진입점 |
| 🌐 `src/django_backend/` | `/health`, `/chat/stream` HTTP/SSE transport와 request schema |
| 🧠 `src/agents/main_agent/` | `create_agent()` 기반 Main Agent factory |
| 🗣️ `src/agents/speech_text_agent/` | state의 `final_response`를 정규화하고 `final_response_script`로 변환하는 LLM agent |
| 🔄 `src/graph/` | chat turn 실행 경계, StateGraph 전환용 state, text stream 이후 speech/TTS event 연결 |
| 🔊 `src/nodes/speech_synthesis_node/` | state의 `final_response_script`를 ElevenLabs SDK TTS stream으로 합성하는 deterministic node |
| 🧠 `src/memory/` | `ChatThreadContextStore`가 LangGraph checkpointer와 20분 inactivity TTL을 관리 |
| 🔑 `src/llm/` | agent별 model 설정과 provider 설정을 조합해 `ChatOpenRouter` 또는 `ChatCerebras` 생성 |
| 🛠️ `src/tools/` | Agent에 붙일 LangChain MCP/local tool 목록 관리 |
| 🧾 `src/utils/prompt_loader.py` | agent-local Jinja2 prompt 렌더링 |
| 💬 `src/agents/main_agent/system_prompt.j2` | Main Agent system prompt |
| 🔊 `src/agents/speech_text_agent/speech_text_prompt.j2` | Speech text Agent prompt |
| ⚙️ `src/settings/` | `METADATA_`, `RUNTIME_`, `LLM_`, `ELEVENLABS_`, `RAG_` 설정 로딩 |
| ✅ `tests/` | health, `/chat/stream`, graph runner 최소 동작 unittest |

## 🔄 Runtime 흐름

1. `src/app.py`가 Django ASGI `application`을 노출한다.
2. Frontend/BFF가 `POST /chat/stream`으로 `message`를 보낸다.
3. `src/django_backend/urls.py`가 `/chat/stream` SSE 요청을 처리하고 `ChatGraphRunner`에 전달한다.
4. `src/memory/`가 process-local `InMemorySaver` checkpointer를 만들고, `src/agents/main_agent/`는 이를 주입받아 Agent를 만든다.
5. Agent는 역할별 LLM getter(`get_main()`, `get_sanitize()`, `get_window()`), `get_tools(agent_name="main_agent")`, agent-local prompt를 조합한다.
6. `src/llm/`가 agent별 model 설정과 선택 provider API key로 `ChatOpenRouter` 또는 `ChatCerebras`를 생성한다.
7. `src/tools/`가 RAG MCP server에서 read-only MCP tools를 비동기로 로딩하고 캐시한다.
8. LangGraph `astream(..., version="v2")`에서 나온 `messages`, `custom`, `updates`, `tasks`를 backend event로 매핑해 `agent.text.delta`, `agent.reasoning.delta`, `agent.tool_call.delta`, `agent.text.final`, `node.updated`, `task.*` event를 순차 전송한다.
9. `speech_text_agent`가 state의 `final_response`를 읽고 structured output으로 `final_response_script`를 저장한다.
10. `speech_synthesis_node`가 script만 읽어 ElevenLabs에 전달하고 `speech_text.final`, `tts.audio.chunk`, `tts.completed` event를 전송한다.

## 🖥️ Frontend 연결 위치

Frontend는 RAG 서버나 LLM을 직접 호출하지 않고 BFF를 통해 backend의 `/chat/stream`만 호출한다. AI SDK `UIMessage` 변환은 Next.js Route Handler/BFF에서 담당하고, backend는 자체 SSE event 계약만 유지한다.

| 구분 | backend 파일 | frontend에서 할 일 |
| --- | --- | --- |
| endpoint | `src/django_backend/` | `POST /chat/stream` SSE만 제공 |
| CORS | `src/settings/` | frontend 주소가 `RUNTIME_CORS_ORIGINS`에 포함되어 있는지 확인 |
| 앱 등록 | `src/app.py` | 별도 작업 없음. `application` ASGI callable로 이미 등록됨 |
| loading UI | frontend 코드 | `/chat/stream`은 `agent.text.delta` event를 받을 때마다 답변을 단계적으로 표시 |

SSE 요청 예시는 다음과 같다.

```ts
// BFF에서 backend /chat/stream으로 사용자 메시지를 전송한다.
async function sendChatStream(message: string) {
  const response = await fetch("http://127.0.0.1:8000/chat/stream", {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      session_id: "browser-session-id",
      metadata: { source: "frontend" },
    }),
  });

  return response.body;
}
```

스트리밍 UI가 필요한 frontend는 BFF가 변환한 stream을 통해 `agent.text.delta` event를 누적해서 표시한다.

## 📚 RAG/MCP 연결 위치

RAG는 별도 FastMCP Tool Server가 담당하고, backend는 MCP Client로 tool만 가져와 Agent에 붙인다.

| 구분 | backend 파일 | 동작 |
| --- | --- | --- |
| MCP 서버 URL | `src/settings/` | `settings.rag.mcp_url` 값 사용 |
| 환경 변수 | Infisical / `.env` | 로컬은 `RAG_MCP_URL="http://127.0.0.1:8010/mcp"`, Docker network 내부는 `http://rag-be:8010/mcp` 사용 |
| tool 연결 | `src/tools/` | `MultiServerMCPClient`로 MCP tools를 async 로딩하고 캐시 |
| Agent 연결 | `src/agents/main_agent/` | `create_agent(..., tools=await get_tools(agent_name="main_agent"), ...)`에 MCP tools 전달 |
| 응답 출처 | `src/graph/runner.py` | `agent.text.final.sources`, `agent.tool_call.delta` payload를 SSE event로 전달 |

`langchain_mcp_adapters.client.MultiServerMCPClient.get_tools()`와 MCP tool
호출은 async 경로를 사용한다. 그래서 `/chat/stream`은 agent를
`astream()`으로 실행한다. MCP 원본 tool 이름은
`memgraph.read_query`처럼 점을 포함하므로, LangChain/OpenAI tool 이름은
`memgraph_read_query`처럼 안전한 이름으로 치환한다. 실제 MCP call은 원본
tool 이름으로 전달된다.

연결 형태는 다음과 같다.

```python
# MCP 서버에서 RAG tool 목록을 가져온다.
client = MultiServerMCPClient(
    {
        "rag": {
            "transport": "http",
            "url": settings.rag.mcp_url,
        }
    }
)

# Agent에 붙일 MCP tools를 로딩한다.
tools = await client.get_tools(server_name="rag")
```

파일을 주고 그 안에서 검색하라는 요구는 RAG 영역이다. 파일 업로드, 문서 파싱, chunking, embedding, vector DB 저장은 MCP RAG Tool Server가 처리하고, backend는 검색 tool 호출과 최종 답변 orchestration만 담당한다.

## 🚀 Backend 실행 진입점

backend 실행 진입점은 `src/app.py`이다.

| 구분 | 값 |
| --- | --- |
| 실행 파일 | `src/app.py` |
| ASGI application 객체 | `application` |
| Daphne import 경로 | `app:application` |
| 실행 기준 디렉터리 | `backend/` |

`PYTHONPATH=src`를 붙이는 이유는 `src/app.py`를 `app` 모듈로 import하기 위해서다.

```bash
make start
```

`make start`는 Infisical CLI로 값을 주입하고 `make env-check`로
`backend/.env.schema` 계약을 검증한 뒤, `uv sync`와 `uv run`으로 Daphne을 실행한다.

`src/app.py` 안의 `main()`을 직접 실행하는 방식도 가능하다.

```bash
PYTHONPATH=src uv run python src/app.py
```

Daphne 실행은 `RUNTIME_HOST`와 `RUNTIME_PORT`를 사용한다. `RUNTIME_RELOAD`는 기존 env 호환을 위해 남아 있지만 Daphne 자동 reload에는 사용하지 않는다.

## 💬 Chat API

### POST `/chat/stream` SSE

클라이언트는 HTTP POST 요청으로 `message`를 보내고, 서버는 `text/event-stream` 응답을 연다.

```json
{
  "session_id": "conversation-id",
  "message": "노인일자리 신청 방법 알려줘",
  "metadata": {
    "source": "frontend"
  }
}
```

응답은 SSE event다. 생성 중에는 `agent.text.delta` event가 여러 번 전송되고, main agent 최종 답변은 `agent.text.final`로 전송된다. 모델이 공개 reasoning content block을 제공하면 `agent.reasoning.delta` event로 분리된다. `speech_text_agent` 출력은 `speech_text.delta`/`speech_text.final`로 분리되고, TTS 오디오는 `tts.audio.chunk`/`tts.completed`로 전송된다. LangGraph node lifecycle은 `node.updated`와 `task.*`로 전송하지만, BFF는 현재 이 이벤트를 FE로 전달하지 않는다.

```text
event: agent.text.delta
data: {"type": "agent.text.delta", "source_agent": "main_agent", "node": "main_agent", "text": "신청은 "}
```

```text
event: agent.text.delta
data: {"type": "agent.text.delta", "source_agent": "main_agent", "node": "main_agent", "text": "주민센터에서 "}
```

```text
event: agent.text.final
data: {"type": "agent.text.final", "source_agent": "main_agent", "node": "main_agent_result", "text": "신청은 주민센터에서 할 수 있습니다.", "answer": "신청은 주민센터에서 할 수 있습니다.", "sources": [], "session_id": "optional-session-id"}
```

`agent.reasoning.delta`는 provider/LangChain이 stream으로 공개한 reasoning token만 전달한다. backend가 숨겨진 chain-of-thought를 별도로 수집하거나 생성하지 않는다.

```text
event: agent.reasoning.delta
data: {"type": "agent.reasoning.delta", "source_agent": "main_agent", "node": "main_agent", "text": "..."}
```

`speech_text.delta`는 `speech_text_agent`의 TTS용 문장 생성 token을 전달한다. 현재 FE는 이 이벤트를 일반 답변으로 누적하지 않고 trace data로만 받을 수 있으며, backend는 같은 이벤트를 `logger.debug`로 남기되 토큰 본문은 로그에 넣지 않고 글자 수만 기록한다.

```text
event: speech_text.delta
data: {"type": "speech_text.delta", "source_agent": "speech_text_agent", "node": "speech_text_agent", "text": "..."}
```

`agent.text.final` event는 최종 답변 필드(`answer`, `sources`, `session_id`)를 포함한다. 이후 `speech_text_agent`가 `final_response_script`를 state에 저장하고, `speech_synthesis_node`가 그 값을 ElevenLabs로 보내 `speech_text.final`, `tts.audio.chunk`, `tts.completed` event를 이어 보낸다. `session_id`는 LangGraph `thread_id`로 전달되므로 같은 세션의 대화 문맥이 이어진다. 자세한 정책은 `../docs/chat_thread_policy.md`를 참고한다.

## 🧾 Prompt

프롬프트는 각 agent 디렉터리에 있는 Jinja2 템플릿을 사용한다.

- `src/agents/main_agent/system_prompt.j2`는 Main Agent system prompt다.
- `src/agents/speech_text_agent/speech_text_prompt.j2`는 TTS용 speech text prompt다.
- `src/utils/prompt_loader.py`는 agent-local template path를 받아 렌더링한다.
- 보기 생성 여부는 backend 분기 코드가 아니라 LLM이 답변 맥락에 따라 판단한다.
- tool 사용 여부도 LLM이 system prompt와 tool description을 보고 판단한다.
- frontend component, JSON UI, API schema를 생성하지 않도록 system prompt에 명시한다.

## 🛠️ Tools and MCP

`src/tools/registery.py`는 agent 이름에 맞는 `src/tools/profiles/*.json` profile을
읽고 Agent에 전달할 tool 목록을 캐시한다. 현재 `main_agent` profile은 RAG MCP
tool 전체를 받는다. `src/tools/from_mcp.py`는 RAG Backend의 FastMCP endpoint에서
아래 read-only MCP tools를 로딩한다.

- `memgraph_read_query`
- `memgraph_vector_search`
- `memgraph_text_index_search`
- `memgraph_graph_traverse`
- `memgraph_schema_read`

원본 MCP tool 이름은 `memgraph.read_query` 형식이고, LangChain/OpenAI에
전달하는 이름만 안전한 snake style로 바꾼다.

신규 tool 구현은 MCP tool이면 `from_mcp.py`, backend local tool이면 `local.py`,
agent별 제공 정책은 `profiles/{agent_name}.json`, 조합/캐시는 `registery.py`에 둔다.

RAG 없이 main model만 확인해야 하는 경우에는 `RAG_TOOLS_ENABLED=false`로
실행한다. 이때 agent에는 빈 tool 목록이 전달되므로 RAG MCP 서버가 떠 있지
않아도 `/chat/stream` 호출 경로를 확인할 수 있다.

## 📊 벤치마크 결과 위치

벤치마크 실행/변환/LangSmith 검증용 임시 스크립트는 backend 서비스 코드 안에 두지 않고, 발표와 검증에 사용할 결과 산출물은 repo 루트의 `presentation/test-data/no-tool-benchmark/`에 정리했다.

주요 산출물:

| 파일 | 내용 |
| --- | --- |
| `../presentation/test-data/no-tool-benchmark/no_tool_benchmark_report.md` | model/provider별 no_tool 통합 분석 리포트 |
| `../presentation/test-data/no-tool-benchmark/artifacts/no_tool_combined_results.csv` | strict 기준으로 합친 원본 benchmark CSV |
| `../presentation/test-data/no-tool-benchmark/artifacts/no_tool_provider_summary.csv` | model/provider별 평균 token, 비용, latency 요약 |
| `../presentation/test-data/no-tool-benchmark/artifacts/no_tool_question_summary.csv` | 질문별 평균 token, 비용, latency 요약 |
| `../presentation/test-data/no-tool-benchmark/charts/*.png` | 비용, latency, token 비교 차트 |
| `../presentation/test-data/no-tool-benchmark/results/benchmark_all_model_by_provider.xlsx` | 전체 결과를 묶은 Excel 파일 |

비교 범위:

- no_tool 상태에서 동일한 360개 질문을 model/provider별로 비교했다.
- Qwen은 비용 문제로 제외했다.
- 비교한 항목은 성공/실패 수, input/output/used token, 질문당 평균 비용, 총 비용, 평균 latency, p95 latency, routing 일치 여부다.
- 답변 품질 평가는 별도 단계이므로, 현재 리포트는 비용/속도/token 중심의 운영 지표 비교로 봐야 한다.

## 🔐 환경 변수

Env field 계약은 `backend/.env.schema`에서 관리한다. 실제 값은 Infisical 또는 ignored local env 파일에서 관리하고 커밋하지 않는다.

```bash
make env-check
```

주요 값:

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `LLM_PROVIDER_OPENAI_API_KEY` | 빈 값 | `LLM_AGENT_*_PROVIDER=openai`일 때 필요한 OpenAI API 키 |
| `LLM_PROVIDER_OPENROUTER_API_KEY` | 빈 값 | `LLM_AGENT_*_PROVIDER=openrouter`일 때 필요한 OpenRouter API 키 |
| `LLM_PROVIDER_CEREBRAS_API_KEY` | 빈 값 | `LLM_AGENT_*_PROVIDER=cerebras`일 때 필요한 Cerebras API 키 |
| `LLM_AGENT_MAIN_PROVIDER` | `cerebras` | main agent provider. `openai`, `openrouter`, `cerebras` |
| `LLM_AGENT_MAIN_MODEL` | `gpt-oss-120b` | main agent가 사용할 모델 |
| `LLM_AGENT_SANITIZE_PROVIDER` | `openrouter` | speech text sanitization agent provider |
| `LLM_AGENT_SANITIZE_MODEL` | `openai/gpt-oss-20b` | speech text sanitization agent가 사용할 모델 |
| `LLM_AGENT_WINDOW_PROVIDER` | `cerebras` | screen control/window-changing agent provider |
| `LLM_AGENT_WINDOW_MODEL` | `gpt-oss-120b` | screen control/window-changing agent가 사용할 모델 |
| `LLM_REQUEST_TIMEOUT_MS` | `60000` | 모든 LLM 요청 timeout |
| `LLM_REQUEST_MAX_RETRIES` | `2` | 모든 LLM 요청 재시도 횟수 |
| `LLM_RESPONSE_MAX_TOKENS` | 빈 값 | 모든 LLM 응답 max token. 비워두면 제한 없음 |
| `LLM_PROVIDER_OPENAI_BASE_URL` | 빈 값 | 비워두면 OpenAI SDK 기본 endpoint 사용 |
| `LLM_PROVIDER_OPENROUTER_PROVIDER_ORDER` | `["groq"]` | OpenRouter에서 우선 시도할 provider 순서 |
| `LLM_PROVIDER_OPENROUTER_ALLOW_FALLBACKS` | `true` | primary provider 실패 시 OpenRouter fallback 허용 여부 |
| `LLM_PROVIDER_OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | OpenRouter API base URL |
| `LLM_PROVIDER_OPENROUTER_REQUIRE_PARAMETERS` | `false` | provider가 요청 parameter를 지원해야 하는지 여부 |
| `LLM_PROVIDER_CEREBRAS_BASE_URL` | 빈 값 | 비워두면 Cerebras SDK 기본 endpoint 사용 |
| `RUNTIME_HOST` | `127.0.0.1` | backend bind host |
| `RUNTIME_PORT` | `8000` | backend 서버 포트 |
| `RUNTIME_CORS_ORIGINS` | `["http://localhost:8501","http://127.0.0.1:8501","http://localhost:5173","http://127.0.0.1:5173","http://localhost:3000","http://127.0.0.1:3000"]` | 허용할 frontend origin |
| `BACKEND_HOST_BIND` | `127.0.0.1` | Docker compose가 host에 공개할 bind 주소 |
| `BACKEND_HOST_PORT` | `8001` | Docker compose가 host에 공개할 포트 |
| `RAG_MCP_URL` | `http://127.0.0.1:8010/mcp` | RAG MCP Tool Server URL |
| `RAG_TOOLS_ENABLED` | `true` | `false`로 두면 RAG MCP tools를 로딩하지 않고 no-RAG/no-tool로 agent 실행 |
| `RAG_TOOL_TIMEOUT_MS` | `30000` | tool 실행 timeout |

실제 `backend/.env`와 `.env.local`은 Git에 커밋하지 않는다. local env 내용을 직접 출력하지 말고 `varlock load --agent --path backend` 또는 `make env-check`를 사용한다. `/health`는 키 없이도 동작하지만 `/chat/stream`은 실제 LLM 호출이므로 선택한 provider의 API key가 필요하다.

## 🐳 Docker 실행

다른 계정이나 다른 클라이언트에서 같은 backend에 붙어 개발할 때는 Docker compose로 backend를 띄운다.

```bash
cd backend
make docker-up
```

기본값은 host의 `127.0.0.1:8001`을 컨테이너 내부 `8000`에 연결한다. 현재 개발 서버가 `8000`을 쓰고 있지 않다면 `.env`에서 `BACKEND_HOST_PORT=8000`으로 바꿔도 된다. 같은 서버 계정이나 VS Code/SSH port forwarding으로 붙는 개발자는 `127.0.0.1:8001`을 쓰면 된다. 서버 네트워크 인터페이스에 직접 공개해야 한다면 `.env`에서 `BACKEND_HOST_BIND=0.0.0.0`으로 바꾼다.

상태 확인:

```bash
curl -s http://127.0.0.1:8001/health
make docker-logs
```

RAG 없이 Qwen3.7 Max를 한 번 확인하려면 backend compose만 사용해서 아래처럼
띄운다. 루트 `deploy/`의 compose 파일은 사용하지 않는다.

```bash
cd backend
BACKEND_HOST_PORT=8002 \
LLM_AGENT_MAIN_PROVIDER=openrouter \
LLM_AGENT_MAIN_MODEL='qwen/qwen3.7-max' \
LLM_PROVIDER_OPENROUTER_PROVIDER_ORDER='["alibaba"]' \
LLM_PROVIDER_OPENROUTER_ALLOW_FALLBACKS=false \
RAG_TOOLS_ENABLED=false \
docker compose up -d --build backend

curl -s http://127.0.0.1:8002/health
curl -N http://127.0.0.1:8002/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"session_id":"qwen-no-rag-smoke","message":"근로기준법에서 근로자와 사용자 관련해서 기본적으로 어떤 내용을 확인해야 해? 5문장 이내로 답해줘."}'
```

이 스모크 테스트는 실제 LLM provider 호출이므로 `backend/.env`에
선택한 provider의 API key가 유효해야 한다.

종료:

```bash
make docker-down
```

## ✅ 검증 방법

아래 명령은 모두 `backend` 디렉터리에서 실행한다.

### 1. 의존성 동기화

```bash
make sync
```

`make sync`는 `uv sync`를 실행해 `backend/.venv`를 준비한다.

### 2. 정적 import와 문법 확인

```bash
make check
```

성공하면 `Compiling ...` 또는 `Listing ...`만 출력되고 에러 없이 종료된다.

### 3. 소스 컴파일 확인

```bash
make check
```

기존 unittest는 FastAPI/WebSocket 기반 legacy 계약이라 제거했다. Django ASGI + SSE 기준 E2E 테스트는 후속으로 추가한다.

### 4. 서버 실행

```bash
make start
```

정상 실행 시 아래와 비슷한 로그가 나온다.

```text
Listening on TCP address 127.0.0.1:8000
```

종료는 서버 터미널에서 `Ctrl+C`를 누른다.

### 5. health curl 확인

다른 터미널에서 실행한다.

```bash
curl -s http://127.0.0.1:8000/health
```

기대 응답:

```json
{"status":"ok","service":"SKN28 Backend","version":"0.1.0"}
```

### 6. chat stream SSE 확인

실제 LLM 호출이므로 선택한 provider의 API key가 필요하다. 아래 명령은 HTTP SSE event stream을 확인한다.

```bash
curl -N http://127.0.0.1:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"session_id":"manual-stream-session","message":"노인일자리 신청 방법을 5문장으로 알려줘"}'
```

기대 응답 형태:

```text
event: agent.text.delta
data: {"type":"agent.text.delta","source_agent":"main_agent","node":"main_agent","text":"..."}

event: agent.text.final
data: {"type":"agent.text.final","source_agent":"main_agent","text":"...","answer":"...","sources":[],"session_id":"manual-stream-session"}
```

`agent.text.delta` event가 여러 번 출력되면 text chunk가 나뉘어 수신된 것이다.

## 🧯 자주 나는 문제

| 증상 | 확인할 것 |
| --- | --- |
| `/chat/stream` SSE 연결이 실패 | 최신 backend 코드로 실행 중인지, 서버를 재시작했는지 확인 |
| `/chat/stream`이 한 번에만 출력됨 | 질문이 너무 짧은지 확인하고, curl `-N`으로 실제 SSE event를 확인 |
| `/health` 연결 실패 | Daphne이 켜져 있는지, 포트가 `8000`인지 확인 |
| `Address already in use` | 이미 8000 포트를 쓰는 서버 종료 또는 `--port 8001` 사용 |
| RAG 근거가 안 붙음 | 아직 MCP RAG tool 연결 전 상태인지 확인 |
| frontend에서 CORS 오류 | `RUNTIME_CORS_ORIGINS`에 frontend 주소 추가 |

## ☑️ 검증 체크리스트

- `uv sync` 성공
- `compileall` 성공
- `make check` 성공
- `GET /health`가 200 반환
- `POST /chat/stream` SSE가 `agent.text.delta`와 `agent.text.final` event 반환
- 같은 `session_id`로 연속 요청 시 같은 LangGraph thread를 사용
- `schemas`, `mock`, `session_store.py`, `rate_limiter.py` import가 남아 있지 않음

남은 구현 작업은 MCP RAG tool 설정을 검증하고, 필요하면 in-memory checkpointer를 영속 저장소 기반 checkpointer로 교체하는 것이다.
