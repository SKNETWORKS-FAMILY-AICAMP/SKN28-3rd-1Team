# `src/ui/theme`

Global theme contract for the migration app.

- `tokens.css`: Tailwind v4 and shadcn-compatible semantic token mappings.
- `white.css`: default white theme values and explicit `.theme-white` override.
- `dark.css`: dark theme values for system preference and explicit `.theme-dark`.
- `base.css`: truly global document/body defaults only.

Keep `src/app/globals.css` as the global import entrypoint. Page-specific styling belongs near the page composition as CSS Modules under `src/page`, not in this directory.
