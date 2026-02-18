# CLAUDE.md — Facade API Layer

> Local context for `src/app-api/`. Read this before implementing any facade hook.

## Purpose

This directory is the **sole public API** for external apps consuming Cytoscape Web via Module Federation. Facade hooks wrap internal stores and hooks — they never duplicate store coordination logic.

## Core Principles

1. **Wrap, never duplicate** — delegate to internal hooks in `src/data/hooks/` and convert results
2. **Always return `ApiResult<T>`** — never throw exceptions across the facade boundary
3. **Validate before mutating** — check store state existence before calling any store method
4. **Hide `skipUndo`** — hardcode to `false`; external apps must not corrupt the undo stack
5. **No React component imports** — facade hooks import stores via `useXxxStore.getState()`

## Wrapping Pattern

```typescript
// src/app-api/useExampleApi.ts
import { useNetworkStore } from '../data/hooks/stores/NetworkStore'
import { ok, fail, ApiErrorCode } from './types'

export const useExampleApi = () => {
  const internalHook = useSomeInternalHook()

  const someMethod = (networkId: IdType): ApiResult<SomeData> => {
    try {
      // 1. Validate inputs
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      // 2. Delegate to internal hook
      const result = internalHook.doSomething(networkId, { skipUndo: false })
      // 3. Convert to ApiResult
      if (result.success) {
        return ok({ data: result.data })
      }
      return fail(ApiErrorCode.OperationFailed, result.error ?? 'Unknown error')
    } catch (e) {
      // 4. Catch exceptions → ApiFailure
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  }

  return { someMethod }
}
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

```typescript
// src/app-api/useExampleApi.test.ts
jest.mock('../data/hooks/stores/NetworkStore', () => ({ ... }))
jest.mock('../data/hooks/useSomeHook', () => ({ ... }))

describe('useExampleApi', () => {
  beforeEach(() => { /* reset mock store state */ })

  it('returns ok() with correct data on success', ...)
  it('returns fail(NetworkNotFound) when network does not exist', ...)
  it('returns fail(OperationFailed) when internal hook throws', ...)
  it('never exposes skipUndo to internal hooks', ...)
})
```

Uses `renderHook` + `act` from `@testing-library/react`. Mock `../db` for DB operations.

## Webpack `exposes` Pattern

Add new facade entries to `webpack.config.js` `ModuleFederationPlugin.exposes`:

```javascript
exposes: {
  // ... existing stores (legacy, @deprecated) ...

  // Public Facade API
  './ApiTypes': './src/app-api/types/index.ts',
  './ElementApi': './src/app-api/useElementApi.ts',
  // etc.
},
```

## Import Constraints

| From facade hooks, you CAN import                           | You CANNOT import                                     |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| `src/data/hooks/stores/*.ts` (via `useXxxStore.getState()`) | React components (`src/features/`)                    |
| `src/data/hooks/use*.ts` (internal hooks)                   | Other facade hooks (no cross-dependencies)            |
| `src/models/` (types and pure functions)                    | Anything from `node_modules` not in shared singletons |
| `./types/` (barrel export)                                  |                                                       |

## Code Style Reminders

- No semicolons, single quotes, trailing commas, 2-space indent
- Import sorting enforced by `eslint-plugin-simple-import-sort`
- New JSX transform — do NOT add `import React from 'react'`
- Use `debug` loggers from `src/debug.ts`, not `console.log`

## Files to Read Per Phase

| Phase                             | Read before implementing                                                                                                                                                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 0** (types)               | [phase1a-shared-types-design.md](../docs/design/module-federation/phase1a-shared-types-design.md), [ADR 0001](../docs/adr/0001-api-result-discriminated-union.md), [ADR 0002](../docs/adr/0002-public-type-reexport-strategy.md), `src/models/AppModel/CyApp.ts` |
| **Phase 1a** (Element)            | `src/data/hooks/useCreateNode.ts` (226L), `useCreateEdge.ts` (255L), `useDeleteNodes.ts` (271L), `useDeleteEdges.ts` (240L), facade-spec §3.1 + §3.1.1                                                                                                           |
| **Phase 1b** (Network)            | `src/data/task/useCreateNetworkFromCx2.tsx` (127L), `src/data/task/useCreateNetwork.tsx` (236L), `src/data/hooks/useDeleteCyNetwork.ts` (171L), facade-spec §3.2                                                                                                 |
| **Phase 1c** (Selection+Viewport) | `src/models/StoreModel/ViewModelStoreModel.ts` (165L), `src/data/hooks/stores/RendererFunctionStore.ts` (64L), facade-spec §3.3 + §3.7                                                                                                                           |
| **Phase 1d** (Table+VisualStyle)  | `src/models/StoreModel/TableStoreModel.ts` (106L), `src/models/StoreModel/VisualStyleStoreModel.ts` (115L), facade-spec §3.4 + §3.5                                                                                                                              |
| **Phase 1e** (Layout+Export)      | `src/models/LayoutModel/LayoutEngine.ts` (30L), `src/models/CxModel/impl/exporter.ts`, facade-spec §3.6 + §3.8                                                                                                                                                   |

## Parent Documents

- [facade-api-specification.md](../docs/design/module-federation/facade-api-specification.md) — full API spec (1,900+ lines)
- [phase1a-shared-types-design.md](../docs/design/module-federation/phase1a-shared-types-design.md) — Phase 0 line-by-line blueprint
- [module-federation-design.md](../docs/design/module-federation/module-federation-design.md) — roadmap and priorities
- [ADR 0001](../docs/adr/0001-api-result-discriminated-union.md) — `ApiResult<T>` design decisions
- [ADR 0002](../docs/adr/0002-public-type-reexport-strategy.md) — public type re-export strategy
