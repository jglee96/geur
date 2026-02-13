# geur

[![Built with Codex](https://img.shields.io/badge/Built%20with-Codex-0A84FF)](https://openai.com/codex/)

`geur` is a desktop markdown writing app focused on deep writing flow with inline AI rewrite suggestions.

> This project was developed entirely with Codex (AI coding agent), without using a traditional IDE-based implementation workflow.

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

## Skills Used In Development

- `apple-hig-ui-design`: Apple HIG 기준 UI 방향 정리 및 macOS 느낌의 화면 개선
- `react-fsd-refactor`: React 코드 구조를 FSD 레이어 중심으로 정리
- `vercel-react-best-practices`: 렌더링/상태 업데이트 성능 개선 포인트 적용
- `tailwind-only-styling`: 스타일링을 Tailwind 유틸리티 중심으로 통일
- `shadcn-ui-design-system`: UI 컴포넌트 일관성 유지 및 토큰 기반 구성
- `rust-architecture-patterns`: Tauri(Rust) 백엔드 모듈 경계/구조 개선
- `product-feedback-interviewer`: 사용자 관점(아마추어 작가) 기반 UX 개선 항목 도출

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

### Development Note

- The implementation workflow for this project is intentionally **Codex-first**.
- Core architecture, UI iterations, performance tuning, and release automation were developed through Codex-driven changes.
- This repository is maintained without relying on a traditional IDE-centric coding process.

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

### macOS (Free Mode) Install Guide

- In free mode (without Apple Developer signing/notarization), release asset is distributed as `*.app.zip` instead of signed `*.dmg`.
- Depending on Gatekeeper policy, macOS may block first launch unless quarantine metadata is removed.

Install steps:

```bash
# 1) Unzip downloaded asset (example: Apple Silicon)
unzip geur-macos-arm64.app.zip

# 2) Remove quarantine attribute
xattr -dr com.apple.quarantine geur.app

# 3) Move to Applications
mv geur.app /Applications/
```

Notes:
- Apple Silicon only: use `geur-macos-arm64.app.zip`.

## Security Note

- API keys are user-provided and stored locally in app storage (`localStorage` in renderer).
- Do not hardcode private API keys in repository code.
