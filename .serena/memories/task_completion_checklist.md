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

## 3. Run Unit Tests
```bash
npm run test:unit
```
Vitest tests with a jsdom environment. Tests are co-located with source files.

## 4. Run E2E Tests (if UI changed)
```bash
npm run test:e2e
```
Playwright tests against localhost:5500.

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
