# `src/page`

Route-level screen composition.

Use this layer for page-specific components, state orchestration, and route workflows. Do not import backend adapters directly from here.

Route composition targets:

- `home/`: `/` product landing/start page.
- `chat/`: canonical `/chat` 상담 workspace layout and page-specific interaction orchestration.
- `mocks/`: `/mocks` and `/mocks/[scene]` mock-state viewer for design and future AG-UI/A2UI component inspection.
