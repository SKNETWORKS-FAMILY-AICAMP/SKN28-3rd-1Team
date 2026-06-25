# Issue 81 Chat Page AI SDK Scope

## Goal

`/chat_page`의 왼쪽 sidebar chat을 AI SDK 기반 streaming chat으로 전환한다.
Backend는 이미 `POST /chat/stream` SSE 계약을 확정했으므로, 이번 작업은 frontend/BFF가 해당 stream을 받아 AI SDK `UIMessage` stream/data part로 감싸고, `/chat_page` sidebar에서 보기 좋게 렌더링하는 데 집중한다.

핵심 의도는 사용자가 말로 대화하는 상담 sidebar를 자연스럽게 만드는 것이다. 오른쪽 workspace 영역은 이후 AG-UI 또는 custom React hook 기반 rendering page를 붙일 예정이며, 이번 scope에서는 제외한다.

## Fixed Context

- Canonical user-facing page는 `/chat_page`다.
- `/chat` page는 legacy redirect로만 유지한다.
- 기존 `/api/chat_page` JSON BFF는 legacy이며 현재는 `410 Gone`을 반환한다. Backend `/chat` JSON 경로는 현재 계약에 없다.
- Backend canonical endpoint는 `POST /chat/stream`이다.
- Backend stream 검증 기준은 `backend/tests/artifacts/chat_stream_events.jsonl`이다.
- Backend code는 이번 작업에서 수정하지 않는다.

## In Scope

- `/chat_page` sidebar chat을 AI SDK `useChat` 기반으로 연결한다.
- BFF가 Backend SSE event를 AI SDK UIMessage stream으로 변환한다.
- BE event 이름과 `source_agent` 기준을 유지해서 FE가 역할별로 렌더링할 수 있게 한다.
- Main sidebar에는 사용자 발화와 `main_agent` 답변만 기본 표시한다.
- Internal/debug 영역에는 `speech_text_agent`, `screen_control_agent`, reasoning, TTS/audio 상태를 agent lane별로 확인할 수 있게 한다.
- Demo 목적상 internal reasoning/token stream은 제거하지 않고, 왼쪽 sidebar의 확장 drawer에서만 노출한다.
- `tts.audio.chunk`는 FE에서 재생 가능한 audio chunk flow로 전달하고, `tts.completed`에서 flush/cleanup한다.
- SSE multi-line `data:` 조립과 JSON 문자열 내부 `\n` 렌더링을 구분해서 유지한다.
- `node.updated`, `task.started`, `task.completed`, `task.failed`는 현재 화면에 노출하지 않는다. 단, BFF 변환 지점에서 의도적으로 drop한다는 것이 보이게 둔다.
- AI Elements와 현재 shadcn/ui component를 사용해 sidebar chat rendering을 정리한다.

## Out of Scope

- Backend stream contract 변경.
- Backend agent, prompt, graph, TTS node 변경.
- 오른쪽 workspace/custom rendering page 구현.
- AG-UI runtime, custom React hook 기반 workspace state 연동.
- RAG ingest, file upload, ASR pipeline 변경.
- `/chat_page` 전체 레이아웃 재설계. 이번 작업은 sidebar chat 중심이다.

## Event Mapping

| Backend SSE event | Source 기준 | BFF/FE 처리 |
| --- | --- | --- |
| `agent.text.delta` | `main_agent` | Assistant text delta로 누적 렌더링 |
| `agent.text.delta` | `screen_control_agent` | Internal trace로 렌더링, main answer에는 섞지 않음 |
| `agent.text.final` | `main_agent` | final answer, sources, session metadata 반영 |
| `agent.reasoning.delta` | any agent | 왼쪽 sidebar 확장 drawer의 agent별 reasoning trace로 렌더링 |
| `speech_text.delta` | `speech_text_agent` | Internal speech text stream으로 렌더링 |
| `speech_text.final` | `speech_text_agent` | TTS용 최종 문장 trace로 렌더링 |
| `agent.tool_call.delta` | `main_agent` or `screen_control_agent` | tool call 상태 data part로 전달 및 렌더링 |
| `tts.audio.chunk` | `speech_synthesis_node` | base64 audio chunk 누적 |
| `tts.completed` | `speech_synthesis_node` | audio flush/playback cleanup |
| `node.updated` | LangGraph lifecycle | 현재 drop |
| `task.*` | LangGraph lifecycle | 현재 drop |
| `error` | Backend/BFF error | Assistant error text로 노출 |

## Frontend Shape

`/chat_page`는 기존 sidebar UI를 유지하되, 메시지 state를 수동 `fetch("/api/chat_page")` JSON 응답으로 관리하지 않는다.

예상 구조:

- `frontend/src/app/chat_page/page.tsx`
  - 계속 `/chat_page` entrypoint로 유지.
- `frontend/src/app/chat_page/chat-page-client.tsx`
  - sidebar chat state를 AI SDK hook 기반으로 전환.
  - 오른쪽 workspace state는 현재 mock/static interaction을 유지.
- `frontend/src/features/chat/hooks/use-chat-session.ts`
  - `useChat` 기반 conversation id, message send, data part handling 담당.
  - audio chunk 누적과 `tts.completed` flush 담당.
- `frontend/src/app/api/chat/_lib/backend-chat-stream-adapter.ts`
  - `/api/chat` BFF 내부에서 Backend SSE parser와 AI SDK `UIMessageChunk` 변환 담당.
  - event별 mapping/drop 위치를 명확하게 유지.
- `frontend/src/features/chat/types.ts`
  - `ChatMessageData`, trace/tool/audio data part 타입 정의.
- `frontend/src/features/chat/components/*`
  - sidebar message bubble, reasoning/tool/internal trace 렌더링 정리.

## Route Cleanup

- `/chat_page`: canonical browser page.
- `/chat`: `/chat_page` redirect만 남기는 legacy route.
- `/api/chat_page`: legacy JSON BFF. backend를 호출하지 않고 `410 Gone` 반환.
- `/api/chat`: AI SDK `useChat` default transport와 맞는 internal BFF로 유지할 수 있다. 이름을 바꾸려면 `DefaultChatTransport({ api: ... })`를 명시해야 한다.
- `/chat_page/*`: local `frontend/src/chat_page/` generated/static asset serving route. `/chat_page` page route와 책임이 다르므로 `docs/chat_route_boundary.md`에서 별도 관리한다.

## Rendering Requirements

- Assistant main answer와 internal stream이 같은 bubble 안에서 섞이면 안 된다.
- `main_agent` delta만 일반 assistant 답변으로 누적한다.
- `screen_control_agent`, `speech_text_agent`, reasoning, TTS 상태는 왼쪽 sidebar 확장 drawer의 작고 scan 가능한 trace UI로 분리한다.
- AI-generated text는 raw JSX가 아니라 `MessageResponse` 계열로 렌더링한다.
- Tool call은 이름, 상태, source agent를 볼 수 있어야 한다.
- TTS 상태는 chunk count/completed 여부를 확인할 수 있어야 한다.
- Mobile width에서 sidebar text와 control이 overflow되지 않아야 한다.

## Verification

- `cd frontend && make lint`
- `cd frontend && make build`
- 가능하면 backend 없이도 BFF parser 단위 검증 또는 fixture 기반 smoke test를 추가한다.
- 실제 backend가 실행 중이면 `/chat_page`에서 다음을 확인한다.
  - `/chat_page`는 `/api/chat_page`를 호출하지 않는다.
  - 직접 `POST /api/chat_page`를 호출하면 `410 Gone`을 반환한다.
  - BFF가 `POST /chat/stream`만 호출한다.
  - `main_agent` 답변이 streaming으로 보인다.
  - internal reasoning/token stream이 main 답변과 분리되어 보인다.
  - `node.updated`/`task.*`가 UI에 표시되지 않는다.
  - newline이 깨지지 않는다.
  - audio chunk가 완료 이벤트에서 flush된다.

## Implementation Checklist

- [x] `/chat_page` client를 AI SDK hook 기반으로 연결한다.
- [x] `/api/chat_page` JSON 호출 제거.
- [x] BFF event mapping에서 internal token stream data part를 persistent/renderable하게 정리한다.
- [x] `node.updated`/`task.*` drop 위치를 명확히 남긴다.
- [x] sidebar message bubble을 AI Elements/shadcn 조합으로 정리한다.
- [x] tool call, reasoning, speech text, TTS status trace UI를 추가한다.
- [x] 왼쪽 sidebar 확장 drawer에서 agent별 reasoning/screen control/speech/TTS lane을 분리한다.
- [x] legacy screen-control source/node 이름을 `screen_control_agent`로 정리한다.
- [x] 왼쪽 sidebar와 trace drawer 폭을 drag로 조절할 수 있게 한다.
- [x] speech input shortcut을 `Ctrl+Shift+M`/`Cmd+Shift+M`로 제공한다.
- [x] legacy `/chat` page/route 정책을 정리한다.
- [x] frontend README의 `/chat_page`, BFF, backend endpoint 설명을 실제 구현과 맞춘다.
- [x] 관련 lint/build를 실행한다.
