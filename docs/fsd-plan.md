# FSD Expansion Plan

This project follows Feature-Sliced Design (FSD) with kebab-case slice names.

## Current Layers
- `app/`: app composition and wiring
- `widgets/`: UI blocks (`topbar`, `editor-panel`, `ai-panel`)
- `features/ai-diff`: AI rewrite + diff preview
- `shared/`: cross-cutting utilities (`config`, `model`, `lib`)

## Proposed Entities
Entities represent durable domain concepts for a writing tool.

1. `entities/document`
   - `model`: text, metadata, file path
   - `lib`: text utilities (word count, selection helpers)
   - `ui` (optional): read-only document preview or metadata chip

2. `entities/selection`
   - `model`: selection range and selected text
   - `lib`: helpers for mapping selection to document

3. `entities/diff-change`
   - `model`: suggested change structure (from/to/original/suggested)
   - `ui`: optional diff badge or summary card

## Proposed Features
Features represent user actions or workflows.

1. `features/ai-rewrite`
   - `model`: async state + request lifecycle
   - `lib`: prompt building, response parsing
   - `ui`: request controls if separated from AI panel

2. `features/file-io`
   - `model`: open/save flow state
   - `lib`: tauri file operations

3. `features/ai-panel-toggle`
   - `model`: open/close state, hotkey bindings

## Proposed Widgets
Widgets combine features/entities for major UI blocks.

- `widgets/editor-panel`
  - consumes `entities/document`, `entities/selection`, `features/ai-panel-toggle`

- `widgets/ai-panel`
  - consumes `features/ai-rewrite`, `entities/diff-change`

- `widgets/topbar`
  - consumes `features/file-io`, `features/ai-panel-toggle`

## Migration Notes
- Keep slices small; move logic only when a clear owner emerges.
- Favor `shared/` only for domain-agnostic utilities.
- Use public APIs (`index.ts`) for cross-slice imports.
- Kebab-case for all slice directories.

## Next Refactor Targets
1. Extract `document` + `selection` models into `entities/`.
2. Move file open/save into `features/file-io`.
3. Move AI request lifecycle into `features/ai-rewrite`.
