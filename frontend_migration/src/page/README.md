# `src/page`

Route-level screen composition.

Use this layer for page-specific components, state orchestration, and route workflows. Do not import backend adapters directly from here.

Route composition targets:

- `home/`: `/` product landing/start page.
- `chat/`: canonical `/chat` 상담 workspace layout and page-specific interaction orchestration. Compose workspace UI from `src/ui/components/chat/workspace_root` and `src/ui/components/chat/workspace_surface`.
- `mocks/`: `/mocks` full-size mock-state viewer for design and future AG-UI/A2UI component inspection. Scene selection happens in the mock top bar and may be reflected as `/mocks?scene=...`; `/mocks/[scene]` only redirects to that viewer.
