# `src/ui`

Reusable UI layer.

Prefer installed shadcn components and AI Elements before creating custom components. Keep this layer independent from backend routes and event shapes.

- `theme/`: global semantic tokens, white/dark theme values, and document-level base CSS.
- `primitives/`: low-level shadcn primitives and thin generic wrappers.
- `ai-elements/`: AI Elements registry source and AI-native building blocks.
- `components/`: reusable product-facing web components composed from primitives, AI Elements, and icons.
