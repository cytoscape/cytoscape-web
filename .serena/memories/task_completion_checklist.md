# Task Completion Checklist

When completing a coding task in this project, follow these steps:

## 1. Lint
```bash
npm run lint
```
Fix any errors, especially import sorting (`eslint-plugin-simple-import-sort` is at error level).

## 2. Format
```bash
npm run format
```
Ensures Prettier formatting is applied (no semicolons, single quotes, trailing commas, 2-space indent).

## 3. Run Unit Tests
```bash
npm run test:unit
```
Jest tests with jsdom environment. Tests are co-located with source files.

## 4. Run E2E Tests (if UI changed)
```bash
npm run test:e2e
```
Playwright tests against localhost:5500.

## 5. Build Check (if needed)
```bash
npm run build
```
Ensures production build succeeds (import sort errors will fail the build).

## Key Reminders
- Do NOT use `console.log` — use the structured `debug` logger from `src/debug.ts`
- Ensure `enableMapSet()` is called if creating new test entry points
- All external CX2 data must be validated with `validateCX2()`
- No semicolons, single quotes, trailing commas
- No `import React from 'react'` in component files
