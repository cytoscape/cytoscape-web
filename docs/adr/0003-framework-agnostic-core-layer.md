# 0003: Framework-Agnostic Core API Layer with React Hook Wrappers

## Status

Accepted

## Context

The facade API layer (`src/app-api/`) was originally designed as React Hooks
(`useElementApi`, `useNetworkApi`, etc.) for consumption by external apps loaded
via Module Federation. This design assumes all consumers are React applications.

Three concrete near-term use cases require API access **without React**:

1. **Browser Extension Bridge** — A Chrome extension content script relays
   commands from a local MCP server (e.g., Claude Code). Content scripts do not
   run inside a React component tree.
2. **`window.CyWebApi` global** — A non-Module-Federation entry point for
   vanilla JS consumers (browser extensions, bookmarklets, automation scripts,
   LLM agent bridges).
3. **Future non-React runtimes** — As browser ML capabilities evolve (e.g.,
   WebMCP), non-React consumers will need programmatic access to Cytoscape Web
   operations without a bundler or React runtime.

The fundamental question is: **should the domain logic of each facade operation
live inside the React Hook, or in a separate layer?**

Examining the existing facade design (CLAUDE.md), hooks already mandate
`useXxxStore.getState()` for store access — React's subscription mechanism is
explicitly avoided. This means the hooks have no inherent React _dependency_;
the only React constraint is the function signature convention.

## Decision

Split each facade domain into two files:

1. **`src/app-api/core/<domain>Api.ts`** — Framework-agnostic pure functions.
   Uses `useXxxStore.getState()` for all store access. No React imports. Never
   calls internal React hooks (`useCreateNode`, etc.).
2. **`src/app-api/use<Domain>Api.ts`** — React Hook wrapper. Returns the core
   API object. May use `useCallback` / `useMemo` for memoization if needed. No
   domain logic.

The core functions are assembled into a `CyWebApi` singleton object in
`src/app-api/core/index.ts` and assigned to `window.CyWebApi` during app
initialization (`src/init.tsx`).

### Directory structure

```
src/app-api/
├── core/
│   ├── elementApi.ts        ← framework-agnostic domain functions
│   ├── networkApi.ts
│   ├── selectionApi.ts
│   ├── tableApi.ts
│   ├── visualStyleApi.ts
│   ├── layoutApi.ts
│   ├── viewportApi.ts
│   ├── exportApi.ts
│   └── index.ts             ← assembles and exports CyWebApi object
├── useElementApi.ts          ← React wrapper: returns elementApi
├── useNetworkApi.ts
├── useSelectionApi.ts
├── useTableApi.ts
├── useVisualStyleApi.ts
├── useLayoutApi.ts
├── useViewportApi.ts
├── useExportApi.ts
├── types/
│   ├── ApiResult.ts
│   ├── AppContext.ts
│   ├── ElementTypes.ts
│   └── index.ts
└── index.ts
```

### Core function pattern

```typescript
// src/app-api/core/elementApi.ts
import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { ok, fail, ApiErrorCode } from '../types'
import type { ElementApi } from '../types'

export const elementApi: ElementApi = {
  createNode(networkId, position, options): ApiResult<{ nodeId: IdType }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (!network) return fail(ApiErrorCode.NetworkNotFound, `Network ${networkId} not found`)
      // Coordinate stores directly — no useCreateNode() hook call
      // ...
      return ok({ nodeId })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },
  // ...
}
```

### React hook wrapper (ultra-thin)

```typescript
// src/app-api/useElementApi.ts
import { elementApi } from './core/elementApi'
import type { ElementApi } from './types'

export const useElementApi = (): ElementApi => elementApi
```

### Global entry point

```typescript
// src/app-api/core/index.ts
import { elementApi } from './elementApi'
import { networkApi } from './networkApi'
// ...

export const CyWebApi = {
  element: elementApi,
  network: networkApi,
  selection: selectionApi,
  table: tableApi,
  visualStyle: visualStyleApi,
  layout: layoutApi,
  viewport: viewportApi,
  export: exportApi,
}

export type CyWebApiType = typeof CyWebApi
```

```typescript
// src/init.tsx (existing initialization file — add at end of init sequence)
import { CyWebApi } from './app-api/core'
declare global { interface Window { CyWebApi: CyWebApiType } }
window.CyWebApi = CyWebApi
```

### Core functions do NOT call internal React hooks

Internal hooks (`useCreateNode`, `useCreateEdge`, etc. in `src/data/hooks/`)
are React hooks — they cannot be called outside a React component tree. Core
functions must implement their own store coordination logic using `.getState()`.

This is **not** duplication of business logic. The coordination logic _belongs_
in the core API layer; the internal hooks are convenience wrappers for React
components inside Cytoscape Web's own UI. Internal hooks remain unchanged and
are not modified by this decision.

### All public API inputs and outputs are JSON-serializable

All types appearing in core function signatures (parameters and return values) must
be serializable with `JSON.stringify`. This guarantees correct behavior when results
are relayed over WebSocket, `postMessage`, or other message-passing channels used by
vanilla JS consumers.

**Concrete implications:**

- `Map<K, V>` is **not** JSON-serializable — it serializes to `{}`. Replace with
  `Record<K, V>` in all public signatures.
- `Set<T>` is **not** JSON-serializable — replace with `T[]`.
- Class instances are **not** JSON-serializable unless they implement `toJSON()` —
  use plain objects instead.
- `ApiResult<T>` (`{ success, data } | { success, error }`) is a plain object and
  serializes correctly.
- `PositionRecord = Record<IdType, [number, number, number?]>` replaces
  `Map<IdType, [number, number]>` for all node position operations.

Core functions may use `Map` and `Set` internally to interface with Zustand stores
(which contain Maps). The conversion to/from `Record` or `T[]` happens at the
facade boundary, inside the core function, before returning to the caller.

## Rationale

### Alternative 1: Keep all logic in hooks, expose via `AppContext` (rejected for near-term)

The `AppContext.apis` pattern (facade-api-specification.md § 1.5.9) provides
pre-resolved API instances via the `mount(context)` lifecycle callback. This
works for Module Federation apps that implement the lifecycle contract.

**Rejected for near-term use cases because:**

- Not available in browser extension content scripts (no lifecycle callbacks)
- Requires the host to initialize React and call `mount(context)` before any
  API access is possible
- `AppContext` is a Phase 3 feature; it blocks simpler use cases unnecessarily

`AppContext` remains the recommended pattern for React apps with lifecycle
support and will delegate to the same core functions.

### Alternative 2: Expose raw Zustand stores via `window` (rejected)

```typescript
window.CyNetworkStore = useNetworkStore.getState()
```

**Rejected because:**

- Exposes internal store interfaces directly, breaking the stable public contract
- External code would depend on internal store shape, making refactoring impossible
- No input validation or error handling at the facade boundary

### Alternative 3: Single utility module (not a hook, not `core/`)

A flat `src/app-api/apiImpl.ts` could contain all logic and be called by both
hooks and the global. Functionally equivalent but less discoverable. The `core/`
subdirectory makes the framework-agnostic layer an explicit, first-class concern
with its own directory, tests, and linting rules.

## Consequences

**File count increase:** Each domain gains a `core/<domain>Api.ts` file (+8
files). Hook wrappers become thin (~3–5 lines each). Net code reduction overall
since domain logic moves from hooks to core.

**Testing simplification:** Core function tests do not use `renderHook` or
`@testing-library/react` — they are plain Jest tests with mocked Zustand stores.
This is faster to write and faster to run.

**`window.CyWebApi` availability:** Assigned in `src/init.tsx` after all stores
are initialized. Consumers must check `window.CyWebApi !== undefined` or listen
for the optional `'cywebapi:ready'` CustomEvent before accessing it.

**`AppContext.apis` delegates to core:** When Phase 3 App Lifecycle is
implemented, `AppContext.apis` is assembled from the same core function objects
rather than from hook instances. This removes the React-context dependency from
`AppContext` setup.

**Linting rule:** A new ESLint rule (or comment convention) should prevent
`import React` or `import { useXxx }` from `react` inside `src/app-api/core/`.

**Related documents:**

- [facade-api-specification.md § 1.2, 1.8, 2.7](../design/module-federation/facade-api-specification.md)
  — Directory structure, wrapping pattern, `window.CyWebApi` specification
- [module-federation-design.md § 1.1](../design/module-federation/module-federation-design.md)
  — Priority and roadmap update
- [ADR 0001](0001-api-result-discriminated-union.md) — `ApiResult<T>` used by
  both core functions and hooks unchanged
