# `src/ui/components`

Reusable product-facing UI components.

Use this for real web components that are composed from `src/ui/primitives`, `src/ui/ai-elements`, Heroicons, and small local styling. Keep route-specific state and page orchestration in `src/page`.

This directory should not contain backend endpoint names, backend event names, or BFF adapter logic.

Current component scopes:

- `chat/`: chat sidebar, composer, messages, trace drawer, workspace frame, reusable workspace surfaces, and chat-only field/control components.
- `mascot/`: product-wide 로디 avatar and animation renderers shared by chat, mocks, and future agent-rendered surfaces.
