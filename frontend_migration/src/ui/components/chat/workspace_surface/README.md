# `src/ui/components/chat/workspace_surface`

Workspace surface implementations for chat.

Each surface receives a typed state object from `src/ui/components/chat/workspace_root/workspace-state.ts` and composes real reusable components from its own surface folder, `shared/`, `src/ui/components/mascot`, and `src/ui/primitives`.

Keep the workspace frame, reducer, and renderer switch in sibling `workspace_root/`. Keep route hooks and backend adapter code in `src/page` or service layers.

Directory rules:

- `shared/`: components used by two or more workspace surfaces.
- `<surface>/...-surface.tsx`: the surface entry rendered by `workspace_root/workspace-renderer.tsx`.
- `<surface>/...-components.tsx`: components used only by that surface.

Surface-specific content, labels, map landmarks, and action text should come from `ChatWorkspaceState` fixtures or backend-provided state. Keep only generic presentation primitives in component code.
