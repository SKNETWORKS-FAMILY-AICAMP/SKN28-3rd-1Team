# Source Layer Rules

This `src/` tree is split by responsibility, not by legacy folder names. Follow these boundaries before adding code.

## `app/`

Next.js App Router entrypoints only. Keep route files thin:

- `page.tsx` imports page composition from `src/page`.
- `route.ts` imports BFF handlers from `src/bff`.
- `layout.tsx`, `loading.tsx`, `error.tsx`, and `not-found.tsx` stay route-boundary focused.

Do not put reusable UI, backend adapters, SSE parsing, or feature state machines directly in `app/`.

## `bff/`

Frontend server boundary. Put server-only chat APIs, backend adapters, event contracts, stream parsing, stream mapping, and lifecycle event filtering here. UI layers should consume the BFF contract, not backend event shapes.

## `page/`

Route-level screen composition. Put route-specific client/server components, page state, and orchestration here. Page modules may compose `ui` components and call BFF routes, but they must not import backend adapters directly.

## `ui/`

Reusable UI only. Use these subdirectories by ownership:

- `theme/`: semantic tokens, white/dark theme values, and document-level base CSS imported by `app/globals.css`.
- `primitives/`: shadcn-generated primitives and thin generic wrappers.
- `ai-elements/`: AI Elements registry source and AI-native building blocks.
- `components/`: reusable product-facing web components composed from primitives, AI Elements, and icons.

Keep UI free of backend endpoint names, backend event names, and environment variables. Use Heroicons for app icons.

## `lib/`

Generic utilities only. Keep utilities pure and broadly reusable unless there is a clear reason otherwise.

## Dependencies

Use AI SDK for chat/streaming behavior. Use Streamdown for AI message rendering. Use shadcn registry components where they fit before building new primitives. Change dependencies with Bun commands, not manual `package.json` edits.
