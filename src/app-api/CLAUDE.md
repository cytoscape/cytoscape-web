# CLAUDE.md — Facade API Layer

> Local context for `src/app-api/`. Read this before implementing any facade hook or core function.

## Purpose

This directory is the **sole public API** for external apps consuming Cytoscape Web. It has two
access paths:

- **Module Federation** — React apps import `useXxxApi()` hooks from `cyweb/ElementApi` etc.
- **`window.CyWebApi`** — Vanilla JS consumers (browser extensions, LLM agent bridges) access the
  same operations via the global object assigned during app initialization.

Both paths execute the same domain logic, which lives entirely in `src/app-api/core/`.

## Directory Structure

```
src/app-api/
├── core/                        ← Framework-agnostic domain logic (no React)
│   ├── elementApi.ts
│   ├── networkApi.ts
│   ├── selectionApi.ts
│   ├── tableApi.ts
│   ├── visualStyleApi.ts
│   ├── layoutApi.ts
│   ├── viewportApi.ts
│   ├── exportApi.ts
│   └── index.ts                 ← Assembles CyWebApi object; assigned to window.CyWebApi
├── useElementApi.ts             ← React Hook: returns elementApi (thin wrapper)
├── useNetworkApi.ts
├── useSelectionApi.ts
├── useTableApi.ts
├── useVisualStyleApi.ts
├── useLayoutApi.ts
├── useViewportApi.ts
├── useExportApi.ts
├── api_docs/
│   └── Api.md                   ← Behavioral documentation
├── types/
│   ├── ApiResult.ts             ← ApiResult<T>, ApiError, ApiErrorCode
│   ├── AppContext.ts            ← AppContext, CyAppWithLifecycle
│   ├── ElementTypes.ts          ← Curated re-exports of public model types
│   └── index.ts                 ← Barrel export
└── index.ts                     ← Barrel export
```

## Core Principles

1. **Core logic is framework-agnostic** — All domain logic lives in `src/app-api/core/<domain>Api.ts`.
   These files use `useXxxStore.getState()` and never import React or call internal React hooks
   (`useCreateNode`, etc.).
2. **Hooks are thin wrappers** — `use<Domain>Api.ts` files return the corresponding core object.
   They contain no domain logic. `useElementApi = (): ElementApi => elementApi`.
3. **Wrap, never duplicate store coordination** — Core functions delegate to internal hooks where
   possible via `.getState()`. They do NOT call `useCreateNode()` etc. (React context required).
4. **Always return `ApiResult<T>`** — Never throw exceptions across the facade boundary.
5. **Validate before mutating** — Check store state existence before calling any store method.
6. **Hide `skipUndo`** — Hardcode to `false`; external apps must not corrupt the undo stack.
7. **No React imports in `core/`** — ESLint should flag any `import ... from 'react'` inside
   `src/app-api/core/`.

## Two-Layer Pattern

### Layer 1: Core function (framework-agnostic)

```typescript
// src/app-api/core/elementApi.ts
import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { ok, fail, ApiErrorCode } from '../types'
import type { ElementApi } from '../types'

export const elementApi: ElementApi = {
  createNode(networkId, position, options): ApiResult<{ nodeId: IdType }> {
    try {
      // 1. Validate inputs using .getState() — no React context needed
      const network = useNetworkStore.getState().networks.get(networkId)
      if (!network) return fail(ApiErrorCode.NetworkNotFound, `Network ${networkId} not found`)
      // 2. Coordinate stores directly
      // ...
      return ok({ nodeId })
    } catch (e) {
      // 3. Catch exceptions → ApiFailure
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },
}
```

### Layer 2: React hook wrapper (ultra-thin)

```typescript
// src/app-api/useElementApi.ts
import { elementApi } from './core/elementApi'
import type { ElementApi } from './types'

export const useElementApi = (): ElementApi => elementApi
```

### Global assignment (in `src/init.tsx`)

```typescript
import { CyWebApi } from './app-api/core'
window.CyWebApi = CyWebApi  // accessible by browser extensions, LLM agent bridges, etc.
```

## `ApiResult<T>` Convention

```typescript
// Discriminated union — callers use `result.success` to narrow
type ApiResult<T = void> = ApiSuccess<T> | ApiFailure

// Helpers (named functions, not arrows — see ADR 0001)
function ok<T>(data: T): ApiSuccess<T>
function ok(): ApiSuccess<void>
function fail(code: ApiErrorCode, message: string): ApiFailure
```

All properties are `readonly`. No `Object.freeze()`. See [ADR 0001](../docs/adr/0001-api-result-discriminated-union.md).

## Testing Pattern

### Core function tests (no `renderHook` needed)

```typescript
// src/app-api/core/elementApi.test.ts
jest.mock('../../data/hooks/stores/NetworkStore', () => ({ ... }))
jest.mock('../../data/hooks/stores/TableStore', () => ({ ... }))

describe('elementApi', () => {
  beforeEach(() => { /* reset mock store state */ })

  it('returns ok() with nodeId on success', ...)
  it('returns fail(NetworkNotFound) when network does not exist', ...)
  it('returns fail(OperationFailed) when store throws', ...)
  it('never passes skipUndo: true to internal stores', ...)
})
```

### Hook wrapper tests (trivial)

```typescript
// src/app-api/useElementApi.test.ts
import { renderHook } from '@testing-library/react'
import { useElementApi } from './useElementApi'
import { elementApi } from './core/elementApi'

it('returns the core elementApi object', () => {
  const { result } = renderHook(() => useElementApi())
  expect(result.current).toBe(elementApi)
})
```

## Webpack `exposes` Pattern

Add new facade entries to `webpack.config.js` `ModuleFederationPlugin.exposes`:

```javascript
exposes: {
  // Public Facade API (hook-based, for React apps via Module Federation)
  './ApiTypes':       './src/app-api/types/index.ts',
  './ElementApi':     './src/app-api/useElementApi.ts',
  './NetworkApi':     './src/app-api/useNetworkApi.ts',
  './SelectionApi':   './src/app-api/useSelectionApi.ts',
  './TableApi':       './src/app-api/useTableApi.ts',
  './VisualStyleApi': './src/app-api/useVisualStyleApi.ts',
  './LayoutApi':      './src/app-api/useLayoutApi.ts',
  './ViewportApi':    './src/app-api/useViewportApi.ts',
  './ExportApi':      './src/app-api/useExportApi.ts',
  // Note: window.CyWebApi is NOT a Module Federation expose —
  // it is assigned globally in src/init.tsx for non-React consumers.
},
```

## Import Constraints

| From `core/` files, you CAN import                          | You CANNOT import                                     |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| `src/data/hooks/stores/*.ts` (via `useXxxStore.getState()`) | Anything from `react` or `react-dom`                  |
| `src/models/` (types and pure functions)                    | Internal React hooks (`src/data/hooks/use*.ts`)       |
| `./types/` (barrel export)                                  | React components (`src/features/`)                    |
|                                                             | Other facade hooks (no cross-dependencies)            |

| From `use<Domain>Api.ts` files, you CAN import              | You CANNOT import                                     |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| `./core/<domain>Api` (the core object)                      | `src/data/hooks/stores/*.ts` directly                 |
| `./types/` (for return type annotations)                    | React components (`src/features/`)                    |

## Code Style Reminders

- No semicolons, single quotes, trailing commas, 2-space indent
- Import sorting enforced by `eslint-plugin-simple-import-sort`
- New JSX transform — do NOT add `import React from 'react'`
- Use `debug` loggers from `src/debug.ts`, not `console.log`
- `core/` files must have zero React imports (enforced by linting or code review)

## Files to Read Per Phase

| Phase                             | Read before implementing                                                                                                                                                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 0** (types)               | [phase1a-shared-types-design.md](../docs/design/module-federation/phase1a-shared-types-design.md), [ADR 0001](../docs/adr/0001-api-result-discriminated-union.md), [ADR 0002](../docs/adr/0002-public-type-reexport-strategy.md), [ADR 0003](../docs/adr/0003-framework-agnostic-core-layer.md), `src/models/AppModel/CyApp.ts` |
| **Phase 1a** (Element)            | `src/data/hooks/useCreateNode.ts` (226L), `useCreateEdge.ts` (255L), `useDeleteNodes.ts` (271L), `useDeleteEdges.ts` (240L), facade-spec §3.1 + §3.1.1                                                                                                                                 |
| **Phase 1b** (Network)            | `src/data/task/useCreateNetworkFromCx2.tsx` (127L), `src/data/task/useCreateNetwork.tsx` (236L), `src/data/hooks/useDeleteCyNetwork.ts` (171L), facade-spec §3.2                                                                                                                        |
| **Phase 1c** (Selection+Viewport) | `src/models/StoreModel/ViewModelStoreModel.ts` (165L), `src/data/hooks/stores/RendererFunctionStore.ts` (64L), facade-spec §3.3 + §3.7                                                                                                                                                 |
| **Phase 1d** (Table+VisualStyle)  | `src/models/StoreModel/TableStoreModel.ts` (106L), `src/models/StoreModel/VisualStyleStoreModel.ts` (115L), facade-spec §3.4 + §3.5                                                                                                                                                    |
| **Phase 1e** (Layout+Export)      | `src/models/LayoutModel/LayoutEngine.ts` (30L), `src/models/CxModel/impl/exporter.ts`, facade-spec §3.6 + §3.8                                                                                                                                                                         |

## Parent Documents

- [facade-api-specification.md](../docs/design/module-federation/facade-api-specification.md) — Full API spec (1,900+ lines)
- [phase1a-shared-types-design.md](../docs/design/module-federation/phase1a-shared-types-design.md) — Phase 0 line-by-line blueprint
- [module-federation-design.md](../docs/design/module-federation/module-federation-design.md) — Roadmap and priorities
- [ADR 0001](../docs/adr/0001-api-result-discriminated-union.md) — `ApiResult<T>` design decisions
- [ADR 0002](../docs/adr/0002-public-type-reexport-strategy.md) — Public type re-export strategy
- [ADR 0003](../docs/adr/0003-framework-agnostic-core-layer.md) — Framework-agnostic core layer decision
