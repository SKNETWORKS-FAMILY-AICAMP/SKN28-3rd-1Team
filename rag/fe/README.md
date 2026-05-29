# RAG Frontend

Bun + Vite + React 기반의 RAG 운영 UI입니다. 루트 `frontend/` 서비스와 독립적으로 실행됩니다.

## Run

```bash
bun install
bun run dev
```

Default URL:

```text
http://127.0.0.1:5173
```

## Environment

```bash
cp .env.example .env
```

```env
VITE_RAG_API_BASE_URL="http://127.0.0.1:8010"
```

## Checks

```bash
bun run lint
bun run build
```
