<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Frontend Migration Rules

This directory is the clean Next.js App Router migration target. Do not copy the existing `frontend/` implementation wholesale into this app. Build the new app by layer, preserving only intentionally selected assets, dependencies, contracts, and small pieces of verified behavior.

## Source Layout

Use this `src/` structure:

```txt
src/
├── app/   # Next.js App Router entrypoints only
├── bff/   # FE server/BFF contracts, backend adapters, stream mapping
├── page/  # route-level screen composition
├── ui/    # reusable UI primitives, theme, shadcn components, AI elements
└── lib/   # framework-neutral utilities
```

`src/app` is not an application layer. It is the Next.js routing boundary. Keep `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and `route.ts` files thin. Route files should delegate to `src/page` or `src/bff` instead of owning business logic.

## Layer Rules

- `src/bff`: server-only code, API contracts, backend endpoint adapters, SSE parsing, AI SDK stream conversion, and event filtering. Backend lifecycle events such as `node.updated` and `task.*` are dropped or mapped here, not in UI.
- `src/page`: route-level composition, page-specific hooks/state, and screen orchestration. It may call browser APIs and BFF endpoints, but it must not import backend adapters directly.
- `src/ui`: reusable visual components only. Split theme tokens into `theme/`, shadcn primitives into `primitives/`, AI Elements registry source into `ai-elements/`, and product-facing reusable components into `components/`. UI code must not know backend endpoint names.
- `src/lib`: generic utilities such as `cn`, formatting, validation helpers, and small pure functions. Keep it independent of `app`, `page`, and `bff`.

## Dependency And Component Policy

- Use the installed AI SDK packages for chat and streaming behavior.
- Use Streamdown and its plugins for AI message markdown rendering when markdown, CJK text, code, math, or Mermaid rendering is needed.
- Use shadcn components when an existing registry component fits the need. Do not hand-roll a component before checking installed shadcn components and the shadcn registry.
- Use the project package runner, Bun, for dependency changes. Do not edit dependency entries in `package.json` by hand.
- Use Heroicons for app-level icons.

## Migration Policy

- Do not copy bloated legacy frontend modules into this app as a shortcut.
- When moving behavior from `frontend/`, first identify the target layer and rewrite the smallest contract-shaped piece.
- Keep commits atomic by layer or artifact type: static assets, dependencies, scaffolding, BFF contracts, UI primitives, and page composition should be separable.
