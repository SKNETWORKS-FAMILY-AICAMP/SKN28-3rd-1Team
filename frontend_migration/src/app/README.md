# `src/app`

Next.js App Router entrypoints only.

Keep route files thin. Page routes delegate to `src/page`, and API route handlers delegate to `src/bff`.

Current route policy:

- `/`: product landing/start page.
- `/chat`: canonical chat workspace.
- `/mocks`: design/development surface for chat mock states and future AG-UI/A2UI component inspection.
