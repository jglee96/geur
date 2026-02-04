# Tauri + React

This template should help get you started developing with Tauri and React in Vite.

## Frontend Conventions

- Feature-Sliced Design (FSD) structure under `src/`.
- Slice folder names must be **kebab-case**.
  - Examples: `widgets/editor-panel`, `features/ai-diff`, `pages/home`.
- Segments live inside slices (e.g. `ui`, `model`, `lib`, `config`).
- Use slice public APIs (`index.ts`) for cross-slice imports.
- Prefer the `@/` alias for absolute imports.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
