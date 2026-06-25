# `src/ui/components/chat/workspace_root`

Right-side chat workspace frame and state contract.

Use this directory for the workspace frame, renderer switch, and typed surface state that the `/chat` page composes. Rendering stays in the frontend: agent or BFF events should resolve into typed workspace state or commands before reaching these components.

Keep actual surface UI implementations in sibling `src/ui/components/chat/workspace_surface`. Keep route orchestration hooks in `src/page/chat/hooks`. Keep backend endpoint names, backend event names, and adapter logic out of this directory.

Current shape:

- `workspace-state.ts`: typed surface state and frontend workspace commands.
- `workspace-renderer.tsx`: switches on `state.surface.type` and renders prebuilt surfaces from `src/ui/components/chat/workspace_surface`.
- `chat-workspace.tsx`: workspace root frame used by `/chat` and `/mocks`.

`/mocks` should pass fixture `ChatWorkspaceState` values into `ChatWorkspace` rather than rendering separate ad hoc mock JSX for each workspace screen.
