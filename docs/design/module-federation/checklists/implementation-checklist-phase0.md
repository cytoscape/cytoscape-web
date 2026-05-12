# Implementation Checklist — Phase 0: Foundation Types

> Track progress for Phase 0. Mark `[x]` when complete. Run verification after each step.
>
> Phase 1 checklist: [implementation-checklist-phase1.md](implementation-checklist-phase1.md)

_Design: [phase0-shared-types-design.md](../specifications/phase0-shared-types-design.md) — line-by-line blueprint_

## Deliverables

### App API Types (in-repo)

- [x] Create directory structure: `src/app-api/`, `src/app-api/types/`, `src/app-api/api_docs/`
- [x] Verify `CyApp` interface location — `src/models/AppModel/CyApp.ts` import resolves
- [x] Create `src/app-api/types/ApiResult.ts` — `ApiResult<T>`, `ApiSuccess<T>`, `ApiFailure`, `ApiError`, `ApiErrorCode`, `ok()`, `fail()`
- [x] Create `src/app-api/types/AppContext.ts` — `AppContext`, `CyAppWithLifecycle` (app API fields commented out until each phase)
- [x] Create `src/app-api/types/ElementTypes.ts` — re-exports of `IdType`, `AttributeName`, `ValueType`, `ValueTypeName`, `VisualPropertyName`, `CyNetwork`, `Cx2`, `Table`, `NetworkView`, `NetworkSummary`
- [x] Create `src/app-api/types/index.ts` — barrel export for all type modules
- [x] Create `src/app-api/index.ts` — top-level barrel export (app API hooks commented out initially)
- [x] Create `src/app-api/CLAUDE.md` — local context file for this layer
- [x] Modify `webpack.config.js` — add `'./ApiTypes': './src/app-api/types/index.ts'` to `exposes`
- [x] Create `src/app-api/types/ApiResult.test.ts` — unit tests for `ok()`, `fail()`, type narrowing
- [x] Create `src/app-api/api_docs/Api.md` — behavioral documentation stub

### `@cytoscape-web/api-types` npm Package (published at end of Phase 0)

The package provides TypeScript declarations for vanilla JS consumers (browser extensions, LLM agent bridges) who cannot use Module Federation. It lives in `packages/api-types/` as an npm workspace package within this repository, and is generated from the same `src/app-api/types/` sources finalized above.

- [x] Add `"workspaces": ["packages/*"]` to the root `package.json` (enables npm workspace)
- [x] Create `packages/api-types/` directory with `package.json` (`name: "@cytoscape-web/api-types"`, `version: "0.1.0-alpha.0"`, `main: "dist/index.d.ts"`)
- [x] Configure `packages/api-types/tsconfig.json` — re-export `src/app-api/types/` with ambient global declarations for `window.CyWebApi` and `WindowEventMap`
- [x] Add build script (`tsc` or `tsup`) to `packages/api-types/package.json` and verify generated `.d.ts` files are correct
- [x] Add `"build:api-types"` script to root `package.json` that builds this workspace package
- [x] Publish `@cytoscape-web/api-types@0.1.0-alpha.0` to npm

## Verification

- [x] `npm run lint` passes
- [x] `npm run test:unit -- --testPathPattern="ApiResult"` passes
- [x] `npm run build` succeeds
- [x] `npm install @cytoscape-web/api-types@alpha` resolves and ambient types for `window.CyWebApi` are available in a consuming project
