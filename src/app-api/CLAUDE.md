# CLAUDE.md — App API Layer

> Local context for `src/app-api/`. Read this before implementing any app API hook, core function, or event bus code.

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
│   ├── layoutApi.ts            ← dispatches layout:started / layout:completed events directly
│   ├── viewportApi.ts
│   ├── exportApi.ts
│   ├── workspaceApi.ts         ← workspace state reads/writes (WorkspaceStore + NetworkSummaryStore)
│   ├── contextMenuApi.ts       ← context menu item registry (ContextMenuItemStore)
│   └── index.ts                 ← Assembles CyWebApi object; assigned to window.CyWebApi
├── event-bus/                   ← Typed event bus (Step 2, after Phase 1e)
│   ├── CyWebEvents.ts           ← CyWebEvents interface (8 event types + detail shapes)
│   ├── dispatchCyWebEvent.ts    ← Generic dispatch helper — sole place new CustomEvent() is called
│   └── initEventBus.ts          ← Zustand subscribeWithSelector → window.dispatchEvent
├── useElementApi.ts             ← React Hook: returns elementApi (thin wrapper)
├── useNetworkApi.ts
├── useSelectionApi.ts
├── useTableApi.ts
├── useVisualStyleApi.ts
├── useLayoutApi.ts
├── useViewportApi.ts
├── useExportApi.ts
├── useWorkspaceApi.ts           ← React Hook: returns workspaceApi (thin wrapper)
├── useCyWebEvent.ts             ← React Hook: window.addEventListener wrapper with cleanup
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
4. **Always return `ApiResult<T>`** — Never throw exceptions across the app API boundary.
5. **Validate before mutating** — Check store state existence before calling any store method.
6. **Hide `skipUndo`** — Hardcode to `false`; external apps must not corrupt the undo stack.
7. **No React imports in `core/`** — ESLint should flag any `import ... from 'react'` inside
   `src/app-api/core/`.
8. **`dispatchCyWebEvent` is the only dispatch site** — All 6 store-subscription-driven events go
   through `event-bus/dispatchCyWebEvent.ts`. Never call `window.dispatchEvent(new CustomEvent(...))`
   directly anywhere else.
9. **`initEventBus()` is called once after hydration** — `window.CyWebApi = CyWebApi` is assigned
   in `src/init.tsx` (before React renders). `initEventBus()` and `cywebapi:ready` are called in
   `src/features/AppShell.tsx` immediately after `setWorkspace(workspace)` completes, so
   subscriptions are never active during the IndexedDB → store hydration transition and no
   spurious `network:created` / `network:switched` events fire on startup.
10. **Layout events come from `core/layoutApi.ts`** — Not from store subscriptions. `layout:started`
    fires before `LayoutStore.setIsRunning(true)`, `layout:completed` fires inside the layout
    promise resolution. Errors do NOT dispatch `layout:completed`.

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
      if (!network)
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
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
window.CyWebApi = CyWebApi // accessible by browser extensions, LLM agent bridges, etc.
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

All properties are `readonly`. No `Object.freeze()`. See [ADR 0001](../../docs/adr/0001-api-result-discriminated-union.md).

## Event Bus Pattern

### `CyWebEvents` interface (8 types)

```typescript
// src/app-api/event-bus/CyWebEvents.ts
export interface CyWebEvents {
  'network:created': { networkId: IdType }
  'network:deleted': { networkId: IdType }
  'network:switched': { networkId: IdType; previousId: IdType }
  'selection:changed': {
    networkId: IdType
    selectedNodes: IdType[]
    selectedEdges: IdType[]
  }
  'layout:started': { networkId: IdType; algorithm: string }
  'layout:completed': { networkId: IdType; algorithm: string }
  'style:changed': { networkId: IdType; property: string }
  'data:changed': {
    networkId: IdType
    tableType: 'node' | 'edge'
    rowIds: IdType[]
  }
}
```

### `dispatchCyWebEvent` helper (sole dispatch site)

```typescript
// src/app-api/event-bus/dispatchCyWebEvent.ts
export function dispatchCyWebEvent<K extends keyof CyWebEvents>(
  type: K,
  detail: CyWebEvents[K],
): void {
  window.dispatchEvent(new CustomEvent(type, { detail }))
}
```

### `initEventBus` (Zustand subscriptions)

```typescript
// src/app-api/event-bus/initEventBus.ts
import { subscribeWithSelector } from 'zustand/middleware'

export function initEventBus(): void {
  // network:created — fires when a new network is added to the workspace
  useWorkspaceStore.subscribe(
    (state) => state.networkIds,
    (curr, prev) => {
      const prevSet = new Set(prev)
      const currSet = new Set(curr)
      for (const id of currSet) {
        if (!prevSet.has(id))
          dispatchCyWebEvent('network:created', { networkId: id })
      }
      for (const id of prevSet) {
        if (!currSet.has(id))
          dispatchCyWebEvent('network:deleted', { networkId: id })
      }
    },
  )
  // ... similarly for network:switched, selection:changed,
  //     style:changed, data:changed
  // layout:started and layout:completed are dispatched from core/layoutApi.ts, NOT here
}
```

### `useCyWebEvent` React hook (for external React apps)

```typescript
// src/app-api/useCyWebEvent.ts
import { useEffect } from 'react'
import type { CyWebEvents } from './event-bus/CyWebEvents'

export function useCyWebEvent<K extends keyof CyWebEvents>(
  eventType: K,
  handler: (detail: CyWebEvents[K]) => void,
): void {
  useEffect(() => {
    const listener = (e: Event): void => {
      handler((e as CustomEvent<CyWebEvents[K]>).detail)
    }
    window.addEventListener(eventType, listener)
    return () => {
      window.removeEventListener(eventType, listener)
    }
  }, [eventType, handler])
}
```

### Vanilla JS consumption (non-React)

```javascript
window.addEventListener('cywebapi:ready', () => {
  window.addEventListener('network:switched', (e) => {
    console.log('switched to', e.detail.networkId)
  })
})
```

`cywebapi:ready` fires on `window`, once, after stores and event bus are initialized.

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

### Event bus tests

```typescript
// src/app-api/event-bus/initEventBus.test.ts
// Mock store subscriptions; call initEventBus(); mutate mock state; assert dispatchEvent called
jest.mock('../../data/hooks/stores/WorkspaceStore', () => ({ ... }))

it('dispatches network:created when a new network is added', () => {
  const spy = jest.spyOn(window, 'dispatchEvent')
  initEventBus()
  // trigger mock store change
  expect(spy).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'network:created', detail: { networkId: 'net1' } })
  )
})

it('does not dispatch on startup (startup suppression)', () => {
  // subscriptions set up AFTER initial state is already present → no spurious events
  const spy = jest.spyOn(window, 'dispatchEvent')
  initEventBus()
  expect(spy).not.toHaveBeenCalled()
})
```

## Webpack `exposes` Pattern

Add new app API entries to `webpack.config.js` `ModuleFederationPlugin.exposes`:

```javascript
exposes: {
  // Public App API (hook-based, for React apps via Module Federation)
  './ApiTypes':        './src/app-api/types/index.ts',
  './ElementApi':      './src/app-api/useElementApi.ts',
  './NetworkApi':      './src/app-api/useNetworkApi.ts',
  './SelectionApi':    './src/app-api/useSelectionApi.ts',
  './TableApi':        './src/app-api/useTableApi.ts',
  './VisualStyleApi':  './src/app-api/useVisualStyleApi.ts',
  './LayoutApi':       './src/app-api/useLayoutApi.ts',
  './ViewportApi':     './src/app-api/useViewportApi.ts',
  './ExportApi':       './src/app-api/useExportApi.ts',
  './WorkspaceApi':    './src/app-api/useWorkspaceApi.ts',
  './AppIdContext':    './src/app-api/AppIdContext.tsx',
  './EventBus':        './src/app-api/useCyWebEvent.ts',
  // Note: window.CyWebApi is NOT a Module Federation expose —
  // it is assigned globally in src/init.tsx for non-React consumers.
},
```

## Import Constraints

| From `core/` files, you CAN import                          | You CANNOT import                               |
| ----------------------------------------------------------- | ----------------------------------------------- |
| `src/data/hooks/stores/*.ts` (via `useXxxStore.getState()`) — including `WorkspaceStore`, `NetworkSummaryStore` | Anything from `react` or `react-dom`            |
| `src/models/` (types and pure functions)                    | Internal React hooks (`src/data/hooks/use*.ts`) |
| `./types/` (barrel export)                                  | React components (`src/features/`)              |
| `./event-bus/dispatchCyWebEvent` (in `layoutApi.ts` only)   | Other app API hooks (no cross-dependencies)     |

| From `use<Domain>Api.ts` files, you CAN import | You CANNOT import                     |
| ---------------------------------------------- | ------------------------------------- |
| `./core/<domain>Api` (the core object)         | `src/data/hooks/stores/*.ts` directly |
| `./types/` (for return type annotations)       | React components (`src/features/`)    |

| From `event-bus/` files, you CAN import                  | You CANNOT import                      |
| -------------------------------------------------------- | -------------------------------------- |
| `src/data/hooks/stores/*.ts` (in `initEventBus.ts` only) | Anything from `react` or `react-dom`   |
| `./CyWebEvents` (type imports)                           | `./core/` or `use<Domain>Api.ts` files |

## Code Style Reminders

- No semicolons, single quotes, trailing commas, 2-space indent
- Import sorting enforced by `eslint-plugin-simple-import-sort`
- New JSX transform — do NOT add `import React from 'react'`
- Use `debug` loggers from `src/debug.ts`, not `console.log`
- `core/` files must have zero React imports (enforced by linting or code review)

## Files to Read Per Phase

| Phase                             | Read before implementing                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 0** (types)               | [phase0-shared-types-design.md](../../docs/design/module-federation/specifications/phase0-shared-types-design.md), [ADR 0001](../../docs/adr/0001-api-result-discriminated-union.md), [ADR 0002](../../docs/adr/0002-public-type-reexport-strategy.md), [ADR 0003](../../docs/adr/0003-framework-agnostic-core-layer.md), `src/models/AppModel/CyApp.ts` |
| **Phase 1a** (Element)            | `src/data/hooks/useCreateNode.ts` (226L), `useCreateEdge.ts` (255L), `useDeleteNodes.ts` (271L), `useDeleteEdges.ts` (240L), app-api-spec §3.1 + §3.1.1                                                                                                                                                                                                  |
| **Phase 1b** (Network)            | `src/data/task/useCreateNetworkFromCx2.tsx` (127L), `src/data/task/useCreateNetwork.tsx` (236L), `src/data/hooks/useDeleteCyNetwork.ts` (171L), app-api-spec §3.2                                                                                                                                                                                        |
| **Phase 1c** (Selection+Viewport) | `src/models/StoreModel/ViewModelStoreModel.ts` (165L), `src/data/hooks/stores/RendererFunctionStore.ts` (64L), app-api-spec §3.3 + §3.7                                                                                                                                                                                                                  |
| **Phase 1d** (Table+VisualStyle)  | `src/models/StoreModel/TableStoreModel.ts` (106L), `src/models/StoreModel/VisualStyleStoreModel.ts` (115L), app-api-spec §3.4 + §3.5                                                                                                                                                                                                                     |
| **Phase 1e** (Layout+Export)      | `src/models/LayoutModel/LayoutEngine.ts` (30L), `src/models/CxModel/impl/exporter.ts`, app-api-spec §3.6 + §3.8                                                                                                                                                                                                                                          |
| **Phase 1f** (Workspace)          | `src/models/StoreModel/WorkspaceStoreModel.ts`, `src/models/StoreModel/NetworkSummaryStoreModel.ts`, `src/models/WorkspaceModel/Workspace.ts`, app-api-spec §1.5.10 + §3.9                                                                                                                                                                               |
| **Phase 1a+** (Element bypass)    | `src/app-api/core/elementApi.ts`, `src/app-api/core/visualStyleApi.ts`, app-api-spec §1.5.1 (CreateNodeOptions/CreateEdgeOptions)                                                                                                                                                                                                                        |
| **Phase 1h** (Context Menu)       | `src/data/hooks/stores/` (any store for pattern), context menu components in `src/features/`, app-api-spec §1.5.11, `src/models/StoreModel/ContextMenuItemStoreModel.ts` (to be created)                                                                                                                                                                 |
| **Step 2** (Event Bus)            | [event-bus-specification.md](../../docs/design/module-federation/specifications/event-bus-specification.md), `src/data/hooks/stores/WorkspaceStore.ts`, `src/data/hooks/stores/ViewModelStore.ts`, `src/data/hooks/stores/VisualStyleStore.ts`, `src/data/hooks/stores/TableStore.ts`, `src/init.tsx` (for init order)                                   |
| **Phase 3.6** (Graph Traversal)   | `src/app-api/core/elementApi.ts` (getNodeIds, getEdgeIds, getConnectedEdges, getConnectedNodes, getOutgoers, getIncomers, getSuccessors, getPredecessors, getRoots, getLeaves), `src/app-api/api_docs/Api.md` §Graph Traversal                                                                                                                         |

## Parent Documents

- [app-api-specification.md](../../docs/design/module-federation/specifications/app-api-specification.md) — Full API spec (2,000+ lines)
- [event-bus-specification.md](../../docs/design/module-federation/specifications/event-bus-specification.md) — Event bus full spec (store mappings, edge cases, test patterns)
- [phase0-shared-types-design.md](../../docs/design/module-federation/specifications/phase0-shared-types-design.md) — Phase 0 line-by-line blueprint
- [module-federation-design.md](../../docs/design/module-federation/module-federation-design.md) — Roadmap and priorities
- [ADR 0001](../../docs/adr/0001-api-result-discriminated-union.md) — `ApiResult<T>` design decisions
- [ADR 0002](../../docs/adr/0002-public-type-reexport-strategy.md) — Public type re-export strategy
- [ADR 0003](../../docs/adr/0003-framework-agnostic-core-layer.md) — Framework-agnostic core layer decision
