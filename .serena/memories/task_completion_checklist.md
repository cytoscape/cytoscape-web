# Task Completion Checklist

When completing a coding task in this project, follow these steps:

## 1. Lint
```bash
npm run lint
```
Fix all TypeScript and oxlint errors.

## 2. Format
```bash
npm run format
```
Ensures Prettier formatting is applied (no semicolons, single quotes, trailing commas, 2-space indent).

## 3. Run Lint + Unit Tests
```bash
npm run test:checks:quiet
```
Runs lint and the Vitest suite in parallel. Tests are co-located with source
files. **Agents must always use the `:quiet` variants** (`test:unit:quiet`,
`test:checks:quiet`, ...) — they print failures and a summary only, so passing
tests do not flood the context.

## 4. Run the E2E Specs Covering the Change (if UI changed)
```bash
npx playwright test <spec-name> --project=chromium --quiet --reporter=test/playwright/quiet-reporter.ts
```
Playwright against localhost:5500 (port must be free). **Agents must not run the
whole e2e suite locally** — `.claude/settings.json` denies `npm test`,
`npm run test:e2e[:chromium]`, their `:quiet` variants, the `e2e:run` scripts,
and bare `npx playwright test`. CI owns the full suite.

## 5. Build Check (if needed)
```bash
npm run build
```
Ensures the production build succeeds.

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
