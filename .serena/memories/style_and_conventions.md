# Code Style & Conventions

## Formatting (Prettier)
- **No semicolons**
- **Single quotes**
- **Trailing commas** (all positions)
- **2-space indentation**
- **80-char line width**

Config: `.prettierrc.json`

## Linting (ESLint)
- Import sorting via `eslint-plugin-simple-import-sort` (error level — builds fail)
- `@typescript-eslint/no-explicit-any` is **OFF** — `any` is permitted
- Config: `eslint.config.js`

## TypeScript
- Target: ES2022, Module: ESNext
- `strictNullChecks: true`, `noImplicitAny: true`
- JSX: `react-jsx` (new transform — do NOT add `import React from 'react'`)
- `esModuleInterop: true`, `allowSyntheticDefaultImports: true`

## React
- **Functional components only** — no class components
- No explicit React import needed in JSX files

## Logging
- Use structured `debug` logger from `src/debug.ts`, NOT `console.log`
- Production builds strip all `console.log` via Terser
- Available loggers: `logDb`, `logStore`, `logApi`, `logApp`, `logUi`, `logStartup`, `logPerformance`, `logHistory`, `logModel`

## Naming Conventions
| Artifact | Pattern |
|----------|---------:|
| Model interfaces | `src/models/<Domain>Model/<Domain>.ts` |
| Model implementations | `src/models/<Domain>Model/impl/<domain>Impl.ts` |
| Model barrel export | `src/models/<Domain>Model/index.ts` → default export `<Domain>Fn` |
| Store model interfaces | `src/models/StoreModel/<Domain>StoreModel.ts` → type `<Domain>Store` |
| Store implementations | `src/data/hooks/stores/<Domain>Store.ts` → hook `use<Domain>Store` |
| Feature modules | `src/features/<Feature>/` (PascalCase) |
| Unit tests | `.test.ts` (utilities/hooks/APIs) |
| Spec tests | `.spec.ts` (stores and feature modules) |
| Facade core functions | `src/app-api/core/<domain>Api.ts` |
| Facade React hooks | `src/app-api/use<Domain>Api.ts` |

## Design Patterns
- Zustand middleware stack: `create(subscribeWithSelector(immer<StoreType>(persist(...))))`
- IndexedDB persistence: proxy objects must be converted with `toPlainObject()` before saving
- Specialized serializers: `serializeTable`, `serializeVisualStyle`, `serializeNetworkView`
- Tests co-located with source files (not in separate directory)

## Facade API (`src/app-api/`) Conventions — ADR 0003
- **Core functions** (`core/`) are framework-agnostic: use `useXxxStore.getState()`, no React imports
- **Hook wrappers** (`use<Domain>Api.ts`) are ultra-thin (~3–5 lines), contain zero domain logic
- All public API inputs/outputs must be **JSON-serializable** (no `Map`/`Set` in signatures — use `Record`/`T[]`)
- Always return `ApiResult<T>` — never throw across the facade boundary
- `ApiResult<T>` helpers: `ok(data)` / `ok()` / `fail(code, message)` (named functions, not arrows)
- Hardcode `skipUndo: false` — external apps must not corrupt the undo stack
- `window.CyWebApi` is assigned in `src/init.tsx` after stores initialize
