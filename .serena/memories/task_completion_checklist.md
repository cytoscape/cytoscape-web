# Task Completion Checklist

Commands live in AGENTS.md §5 — the single source of truth. This file is the
order to run them in, not a second copy of them.

When completing a coding task in this project:

1. **Lint + unit tests** — `npm run test:checks:quiet` (runs both in parallel).
   Always the `:quiet` variants: they print failures and a summary only, so
   passing tests do not flood your context.
2. **Format** — `npm run format` (Prettier over `src/`).
3. **E2E, if the UI changed** — `npm run e2e:spec -- <spec-name>`, scoped to the
   specs covering the change. Never the whole suite locally: CI owns it, and
   both the deny list and `scripts/run-playwright.mjs` refuse it.
4. **Build, if the change could affect bundling** — `npm run build`.

Regression test first, then the fix: prove the test fails, apply the fix, prove
it passes.

## Key Reminders
- Do NOT use `console.log` — use the structured `debug` logger from `src/debug.ts`
- Ensure `enableMapSet()` is called if creating new test entry points
- All external CX2 data must be validated with `validateCX2()`
- No semicolons, single quotes, trailing commas
- No `import React from 'react'` in component files
- `core/` files in `src/app-api/core/` must have **zero React imports**
- App API core functions must return `ApiResult<T>`, never throw
- Public API types must be JSON-serializable (`Record` not `Map`, `T[]` not `Set`)
- AGENTS.md is the source of truth; CLAUDE.md includes it with `@AGENTS.md`
