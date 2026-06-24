# Chat Route Boundary

채팅 관련 이름은 browser page, Next.js BFF, backend SSE endpoint, static asset route, frontend module을 구분해서 사용한다.

## Route Map

| 구분 | Canonical 이름 | 구현 위치 | 책임 |
| --- | --- | --- | --- |
| User-facing browser page | `GET /chat_page` | `frontend/src/app/chat_page/page.tsx` | 사용자가 여는 실제 상담 화면 |
| Legacy browser page | `GET /chat` | `frontend/src/app/chat/page.tsx` | `/chat_page`로 redirect만 수행 |
| Next.js AI SDK BFF | `POST /api/chat` | `frontend/src/app/api/chat/route.ts` | AI SDK `useChat` 요청을 받아 backend SSE를 `UIMessage` stream으로 변환 |
| Legacy JSON BFF | `POST /api/chat_page` | `frontend/src/app/api/chat_page/route.ts` | 제거된 JSON BFF. `410 Gone`을 반환하고 backend를 호출하지 않음 |
| Backend service endpoint | `POST /chat/stream` | `backend/src/django_backend/urls.py` | canonical backend SSE 계약. LangGraph 실행 event를 `text/event-stream`으로 반환 |
| Generated/static asset route | `GET /chat_page/*` | `frontend/src/app/chat_page/[...path]/route.ts` | local `frontend/src/chat_page/` generated asset만 서빙 |
| Static asset helper | `chat-page-assets.ts` | `frontend/src/app/chat_page/chat-page-assets.ts` | `frontend/src/chat_page/` 경로 밖 파일 접근을 막고 asset response 생성 |
| Frontend feature module | `features/chat/*` | `frontend/src/features/chat/` | reusable chat UI, hook, type, client-side service |
| Backend SSE adapter | `backend-chat-stream-adapter.ts` | `frontend/src/app/api/chat/_lib/backend-chat-stream-adapter.ts` | BFF 내부에서 backend `/chat/stream` SSE를 AI SDK `UIMessageChunk`로 변환 |

## Active Flow

```text
/chat_page
  -> useChat()
  -> POST /api/chat
  -> createBackendChatStream()
  -> POST BACKEND_URL/chat/stream
  -> backend SSE
  -> AI SDK UIMessage stream/data parts
```

`/chat_page` 화면은 `POST /api/chat_page`를 호출하지 않는다. `POST /api/chat_page`는 legacy JSON BFF였고, 현재 backend 계약에 없는 `BACKEND_URL/chat`으로 proxy하지 않는다.

## Static Asset Boundary

`GET /chat_page`는 Next.js page route가 담당한다. `GET /chat_page/*` catch-all route는 `frontend/src/chat_page/`에 남아 있는 generated/static asset을 서빙하기 위한 legacy compatibility route다.

이 구조를 유지하는 동안 새 page-level UI는 `frontend/src/app/chat_page/`에 두고, generated asset은 `frontend/src/chat_page/` 아래에만 둔다. `chat-page-assets.ts`는 `path.relative()` 검사를 통해 `frontend/src/chat_page/` 밖 파일을 반환하지 않는다.

Next.js가 직접 서빙하는 정적 파일은 `frontend/public/`에 둔다. `public/`은 Next.js 프로젝트 루트 convention이므로 `src/public/`로 옮기지 않는다.

## Naming Rules

- Browser page route는 `/chat_page`처럼 사용자 URL을 기준으로 부른다.
- Next.js BFF route는 `/api/chat`처럼 frontend 내부 API boundary로 부른다.
- Backend service endpoint는 `/chat/stream`처럼 backend HTTP 계약으로 부른다.
- SSE 변환 코드는 `frontend/src/app/api/chat/_lib/backend-chat-stream-adapter.ts`에 두고, `/api/chat` BFF 내부 구현으로 관리한다.
- Reusable frontend UI와 hook은 `frontend/src/features/chat/`에 둔다.
- Route-specific UI는 `frontend/src/app/chat_page/`에 둔다.

## Related Docs

- `docs/issue_81_chat_page_ai_sdk_scope.md`
- `frontend/README.md`
- `backend/README.md`
