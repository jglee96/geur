# geur

`geur` is a desktop markdown writing app focused on deep writing flow with inline AI rewrite suggestions.

Built with Tauri + React + CodeMirror, and designed for:
- distraction-reduced writing
- selection-based AI rewriting
- accept/undo diff workflow
- local folder-based markdown editing

## Core Features

- Single-document writing experience with markdown (`.md`, `.mdx`) support
- Folder tree explorer (open/create/rename/delete)
- Selection-based AI rewrite request (`Ctrl/Cmd + L`)
- Inline change preview with `Keep` / `Undo`
- Theme modes: `light`, `dark`, `system`
- OpenAI API key input from in-app settings
- Model selection in AI panel

## Tech Stack

- `Tauri v2` (desktop shell)
- `React + TypeScript + Vite`
- `CodeMirror`
- `Tailwind CSS`
- `Feature-Sliced Design (FSD)` structure

## Project Structure

```
src
├─ app
├─ pages
├─ widgets
├─ features
├─ entities
└─ shared
```

FSD conventions:
- Slice folders use `kebab-case`.
- Use slice public APIs (`index.ts`) for cross-slice imports.
- Prefer `@/` alias imports.

## Requirements

- Node.js `20+`
- Rust toolchain (`stable`)
- Tauri prerequisites for your OS

For macOS:
- Xcode Command Line Tools

For Linux CI/build:
- `webkit2gtk`, `libsoup3`, `gtk3` related dev packages

## Local Development

Install dependencies:

```bash
npm ci
```

Run web dev server:

```bash
npm run dev
```

Run desktop app in dev mode:

```bash
npm run tauri dev
```

Build frontend:

```bash
npm run build
```

Run FSD check:

```bash
npm run fsd:check
```

## Release

This repository uses GitHub Actions for CI and release automation.

- CI workflow:
  - frontend build
  - fsd check
  - rust check
- Release workflow:
  - trigger by tag `v*` or manual dispatch
  - build on macOS/Linux/Windows
  - create GitHub Draft Release
  - auto-generate release notes

Create a release tag:

```bash
git checkout main
git pull
git tag v0.1.0
git push origin v0.1.0
```

Then open GitHub `Releases`, review draft notes/assets, and publish.

## Security Note

- API keys are user-provided and stored locally in app storage (`localStorage` in renderer).
- Do not hardcode private API keys in repository code.
