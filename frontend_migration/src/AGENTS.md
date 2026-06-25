# Source Layer Rules

This `src/` tree is split by responsibility, not by previous folder names. Follow these boundaries before adding code.

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

For `/chat`, keep page aggregation and route-owned hooks in `src/page/chat`:

- `src/page/chat/page.tsx` composes the chat page from `ui` components and page hooks.
- `src/page/chat/hooks/` owns route-specific orchestration hooks such as chat session, panel resizing, dictation, TTS playback, and workspace state controllers.
- Do not create chat workspace component directories under `src/page/chat`; workspace root components belong under `src/ui/components/chat/workspace_root`, and workspace surface implementations belong under `src/ui/components/chat/workspace_surface`.

## `ui/`

Reusable UI only. Use these subdirectories by ownership:

- `theme/`: semantic tokens, white/dark theme values, and document-level base CSS imported by `app/globals.css`.
- `primitives/`: shadcn-generated primitives and thin generic wrappers.
- `ai-elements/`: AI Elements registry source and AI-native building blocks.
- `components/`: reusable product-facing web components composed from primitives, AI Elements, and icons.

Keep UI free of backend endpoint names, backend event names, and environment variables. Use Heroicons for app icons.

For chat UI, keep reusable component families under `src/ui/components/chat`:

- Sidebar, composer, trace drawer, and message surfaces live directly under `src/ui/components/chat`.
- The right-side chat workspace root component family lives under `src/ui/components/chat/workspace_root`; concrete surface implementations live under `src/ui/components/chat/workspace_surface`.
- Workspace rendering should consume typed frontend state/commands and render prebuilt frontend surfaces. Agents or BFF events should not inject JSX, arbitrary component names, backend endpoint names, or backend event shapes into UI components.

## `lib/`

Generic utilities only. Keep utilities pure and broadly reusable unless there is a clear reason otherwise.

## Dependencies

Use AI SDK for chat/streaming behavior. Use Streamdown for AI message rendering. Use shadcn registry components where they fit before building new primitives. Change dependencies with Bun commands, not manual `package.json` edits.

## Route Policy

- `/` is the product landing/start page. Keep the route file thin and delegate the screen to `src/page/home/`.
- `/chat` is the canonical 상담 workspace route in this migration app.
- `/mocks` is a preserved design/development surface for inspecting chat states and future AG-UI/A2UI component shapes.
