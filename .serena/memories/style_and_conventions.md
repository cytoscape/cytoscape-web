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
|----------|---------|
| Model interfaces | `src/models/<Domain>Model/<Domain>.ts` |
| Model implementations | `src/models/<Domain>Model/impl/<domain>Impl.ts` |
| Model barrel export | `src/models/<Domain>Model/index.ts` → default export `<Domain>Fn` |
| Store model interfaces | `src/models/StoreModel/<Domain>StoreModel.ts` → type `<Domain>Store` |
| Store implementations | `src/data/hooks/stores/<Domain>Store.ts` → hook `use<Domain>Store` |
| Feature modules | `src/features/<Feature>/` (PascalCase) |
| Unit tests | `.test.ts` (utilities/hooks/APIs) |
| Spec tests | `.spec.ts` (stores and feature modules) |

## Design Patterns
- Zustand middleware stack: `create(subscribeWithSelector(immer<StoreType>(persist(...))))`
- IndexedDB persistence: proxy objects must be converted with `toPlainObject()` before saving
- Specialized serializers: `serializeTable`, `serializeVisualStyle`, `serializeNetworkView`
- Tests co-located with source files (not in separate directory)
