# Frontend

노인·고령층 법률·복지 상담 서비스의 Next.js 기반 프론트엔드입니다.
채팅 화면인 `/chat_page`의 왼쪽 상담 sidebar는 AI SDK `useChat` 기반으로 Next.js App Router의 `POST /api/chat` route handler를 호출합니다.
해당 route handler가 backend의 canonical SSE 엔드포인트인 `POST /chat/stream`을 호출하고, backend event stream을 AI SDK `UIMessage` stream/data part로 변환합니다.
레거시 `/chat` 경로는 실제 backend 연동 채팅 화면인 `/chat_page`로 리다이렉트합니다.
레거시 JSON BFF인 `POST /api/chat_page`는 `/chat_page`에서 더 이상 호출하지 않고 `410 Gone`을 반환합니다.

## 채팅 route map

| 구분 | 경로/파일 | 책임 |
| --- | --- | --- |
| Browser page | `GET /chat_page` | 사용자가 여는 상담 화면 |
| Legacy page | `GET /chat` | `/chat_page` redirect 전용 |
| AI SDK BFF | `POST /api/chat` | `useChat` 요청을 받아 backend SSE를 UI message stream으로 변환 |
| Legacy JSON BFF | `POST /api/chat_page` | 제거된 endpoint. `410 Gone` 반환 |
| Backend endpoint | `POST /chat/stream` | backend canonical SSE 계약 |
| Static asset route | `GET /chat_page/*` | `src/chat_page/` generated asset serving |
| SSE adapter | `src/app/api/chat/_lib/backend-chat-stream-adapter.ts` | `/api/chat` BFF 내부에서 backend SSE를 AI SDK chunk로 변환 |

상세 경계는 `../docs/chat_route_boundary.md`를 참고합니다.

## Prerequisites

- Node.js 20.9.0 이상
- Bun 1.3 이상
- Make
- Git

## 처음 pull 받은 뒤 실행

```bash
git pull
cd frontend
make start
```

기본 접속 주소:

```text
http://127.0.0.1:3000
```

Next.js가 `0.0.0.0:3000` 바인딩 권한 문제를 내거나 Turbopack 캐시 오류가 나면 webpack 모드로 실행합니다.

```bash
bun run dev -- --webpack -H 127.0.0.1
```

포트 3000을 이미 사용 중이면 다른 포트를 지정합니다.

```bash
bun run dev -- --webpack -H 127.0.0.1 -p 3001
```

이 경우 접속 주소는 `http://127.0.0.1:3001`입니다.

## 실행 확인

브라우저에서 아래 페이지가 열리면 정상입니다.

```text
http://127.0.0.1:3000
http://127.0.0.1:3000/chat_page
http://127.0.0.1:3000/mocks
```

터미널로 확인할 수도 있습니다.

```bash
curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1:3000/chat_page
curl -I http://127.0.0.1:3000/mocks
curl -I http://127.0.0.1:3000/chat
```

`/`와 `/chat_page` 요청이 `HTTP/1.1 200 OK`를 반환하면 서버가 응답하고 있는 상태입니다.
`/chat`은 `/chat_page`로 리다이렉트되므로 `307 Temporary Redirect`를 반환합니다.

장면별 상담 화면 디자인은 `/mocks/<scene>` 형식으로 확인합니다. 예: `/mocks/chat-start`, `/mocks/map-results`, `/mocks/document-references`.

## 대화 ID 정책

AI SDK 기반 채팅 hook은 mount 시 URL query의 `conversation_id`를 확인합니다. 값이 없거나 비어 있으면 browser에서 새 `conversation_id`를 만들고 URL query에 `replace`로 반영합니다.

이 값은 Next.js chat route에서 backend `session_id`로 전달되며, backend는 이를 LangGraph `thread_id`로 사용합니다. `conversation_id` 없이 backend를 호출하면 backend는 fallback thread를 만들지 않고 Agent 호출을 무시합니다. 자세한 정책은 `../docs/chat_thread_policy.md`를 참고합니다.

## 채팅 스트림 정책

`/chat_page` sidebar는 `POST /api/chat`을 통해 AI SDK UI message stream을 받습니다.
Next.js route handler는 `src/app/api/chat/_lib/backend-chat-stream-adapter.ts`를 통해 backend `POST /chat/stream` SSE event를 다음처럼 분리합니다.

| Backend event | Frontend 처리 |
| --- | --- |
| `agent.text.delta` + `main_agent` | assistant text part로만 streaming 렌더링. Trace drawer에는 표시하지 않음 |
| `agent.text.delta` + `screen_control_agent` | persistent `data-agentTrace` part로 변환하고 `Screen Control Agent` lane에서 렌더링 |
| `agent.text.final` + non-main agent | persistent `data-agentTrace` part로 변환하고 agent별 final debug text로 렌더링 |
| `agent.reasoning.delta`, `thinking_delta` + `speech_text_agent` | persistent `data-agentTrace` part로 변환하고 `Speech Agent` lane에서 reasoning으로 렌더링 |
| `agent.reasoning.delta`, `thinking_delta` + main/screen agent | 내부 reasoning token으로 간주하고 BFF 변환 지점에서 drop |
| `agent.tool_call.delta` | persistent `data-toolCall` part로 tool 이름, 상태, source agent를 agent별 drawer에 렌더링 |
| `speech_text.input` | speech agent에 들어간 입력을 `Speech Agent` lane에서 렌더링 |
| `screen_control.input` | screen control agent에 들어간 입력을 `Screen Control Agent` lane에서 렌더링 |
| `speech_text.*` | speech/internal trace로 변환하고 speech agent lane에서 렌더링 |
| `tts.audio.chunk` | transient audio chunk를 MediaSource player에 append하고, persistent `data-audioStatus`로 chunk 상태 표시 |
| `tts.completed` | MediaSource stream finalize/cleanup. MediaSource 미지원 또는 초기화 실패 시 기존 Blob playback fallback |
| `error` | assistant error text로 노출하고 진행 중인 TTS playback buffer cleanup |
| `node.updated`, `task.*` | BFF 변환 지점에서 의도적으로 drop |

일반 assistant bubble에는 `main_agent` 답변만 표시합니다. Screen control agent, speech agent, TTS 상태는 왼쪽 sidebar 상단의 `Trace` 버튼으로 확장한 drawer에서 확인합니다.

### TTS playback debug log

TTS chunk가 Blob fallback으로 재생되는지, MediaSource stream으로 재생되는지 확인할 때는 브라우저 콘솔에서 debug log를 켭니다.

```js
localStorage.setItem("debug:tts", "1")
location.reload()
```

또는 `/chat_page?debug_tts=1`처럼 query string으로 일회성 활성화할 수 있습니다. Chrome DevTools Console에서 `tts:`로 필터링하면 다음 이벤트를 볼 수 있습니다.

| Console event | 확인 기준 |
| --- | --- |
| `[tts:chunk.received]` | frontend가 `data-audio` chunk를 받은 시점. `msSinceFirstChunk`는 첫 chunk 이후 경과 시간 |
| `[tts:source-buffer.append.start]` / `[tts:source-buffer.append.done]` | MediaSource `SourceBuffer`에 chunk가 append되는 시점 |
| `[tts:play.started]` | 실제 audio playback 시작 시점. `startedBeforeStreamCompleted: true`면 `tts.completed` 전에 재생이 시작된 streaming playback |
| `[tts:stream.finalize]` | `data-audioDone` 수신 후 stream finalize 시점 |
| `[tts:fallback.blob]` / `[tts:blob.create]` | MediaSource 미지원/실패로 Blob fallback 경로를 탄 시점 |
| `[tts:cleanup.dispose]` | 새 메시지, reset, error, unmount 등으로 audio resource를 정리한 시점 |

확인 후에는 로그를 끕니다.

```js
localStorage.removeItem("debug:tts")
```

## 개발 명령

```bash
# 개발 서버
make start

# 프로덕션 빌드
make build

# 빌드 결과 실행
make preview

# 린트
make lint
```

## 환경 파일

환경 변수 계약은 `frontend/.env.schema`에서 관리합니다.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `BACKEND_URL` | `http://127.0.0.1:8000` | Next.js route handler가 호출할 backend base URL |

브라우저는 backend URL을 직접 알 필요가 없습니다. API key나 token 같은 secret은 `NEXT_PUBLIC_*` 값으로 두지 않습니다.

로컬에서만 쓰는 환경 파일은 Git에 올리지 않습니다.

```text
.env
.env.local
env.development.local
.env.development.local
.env.test.local
.env.production.local
```

## 문제 해결

### `next: Permission denied`

`node_modules` 실행 파일 권한이 깨진 경우입니다. 보통 lockfile 기준으로 다시 설치하면 해결됩니다.

```bash
rm -rf node_modules
bun install
```

### `Cannot find module 'next/dist/compiled/commander'`

의존성 설치가 불완전한 상태입니다.

```bash
bun install
```

### `listen EPERM: operation not permitted 0.0.0.0:3000`

localhost만 사용하도록 host를 지정합니다.

```bash
bun run dev -- -H 127.0.0.1
```

### `Failed to open database` 또는 Turbopack persistence 오류

Turbopack 캐시 문제일 수 있습니다. webpack 모드로 우회합니다.

```bash
bun run dev -- --webpack -H 127.0.0.1
```

필요하면 `.next` 캐시를 지운 뒤 다시 실행합니다.

```bash
rm -rf .next
bun run dev -- --webpack -H 127.0.0.1
```
