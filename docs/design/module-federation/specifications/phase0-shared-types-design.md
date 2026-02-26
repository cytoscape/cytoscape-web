# Phase 0: Shared Types and Public Type Re-exports — Detailed Design

**Rev. 1 (2/12/2026): Keiichiro ONO and Claude Code w/ Opus 4.6**

Implementation design for Phase 0 of the [implementation roadmap](../module-federation-design.md):

> _"Define shared types (`ApiResult<T>`, `ApiErrorCode`) and public type re-exports"_

This document specifies every file to create, every type to define, every export to wire up, and every test to write. It is intended to be directly actionable — an implementer should be able to execute this document line-by-line without further design decisions.

**Parent documents:**

- [module-federation-design.md](../module-federation-design.md) — Priorities and roadmap
- [app-api-specification.md](app-api-specification.md) — Full app API specification

---

## 1. Scope

This phase creates the **foundational type infrastructure** for the entire app API layer. No app API hooks are implemented in this phase — only the types and directory structure that all subsequent phases depend on.

### In Scope

1. Create the `src/app-api/` directory structure
2. Define `ApiResult<T>`, `ApiSuccess<T>`, `ApiFailure`, `ApiError`, `ApiErrorCode`
3. Define helper functions for constructing `ApiResult` values (`ok()`, `fail()`)
4. Define `AppContext` and `CyAppWithLifecycle` types (forward declarations)
5. Re-export public-facing model types via `ElementTypes.ts`
6. Create barrel exports (`src/app-api/types/index.ts`, `src/app-api/index.ts`)
7. Add `./ApiTypes` entry to `webpack.config.js` Module Federation `exposes`
8. Write unit tests for result helper functions
9. Add behavioral documentation in `src/app-api/api_docs/Api.md`

### Out of Scope

- App API hook implementations (`useElementApi`, `useNetworkApi`, etc.) — Phase 1a through 1e
- Event bus (`initEventBus`, `useCyWebEvent`) — Phase 1 Step 2 (after Phase 1e); see [event-bus-specification.md](event-bus-specification.md)
- `@cytoscape-web/types` package fixes (issues 1–4) — tracked separately as P1 in [module-federation-design.md § 1.3](../module-federation-design.md)

> **Note:** Publishing `@cytoscape-web/api-types@0.1.0-alpha.0` is **in scope for Phase 0** and
> is listed as a separate deliverable in
> [implementation-checklist-phase0.md](../checklists/implementation-checklist-phase0.md).
> `@cytoscape-web/api-types` (type declarations for vanilla JS consumers) is a different package
> from `@cytoscape-web/types` (internal model types).

---

## 2. Directory Structure

After this phase completes, the following files will exist:

```
src/app-api/
├── api_docs/
│   └── Api.md                          # Behavioral documentation
├── types/
│   ├── ApiResult.ts                    # Result types + helper functions
│   ├── ApiResult.test.ts               # Unit tests for helpers
│   ├── AppContext.ts                   # AppContext, CyAppWithLifecycle (forward declarations)
│   ├── ElementTypes.ts                 # Re-exported public-facing model types
│   └── index.ts                        # Barrel export for types/
└── index.ts                            # Barrel export for api/ (types only in this phase)
```

---

## 3. Type Definitions

### 3.1 `ApiResult.ts` — Result Types and Helpers

**File:** `src/app-api/types/ApiResult.ts`

This is the most critical file in this phase. It defines the discriminated union that every app API operation returns, plus helper functions for ergonomic construction.

```typescript
// src/app-api/types/ApiResult.ts

/**
 * Error codes for app API operations.
 *
 * Each code maps to a specific category of failure. App API hooks
 * choose the most specific code applicable. External apps can
 * switch on `error.code` for programmatic error handling.
 */
export const ApiErrorCode = {
  /** The specified network does not exist in the store */
  NetworkNotFound: 'NETWORK_NOT_FOUND',

  /** The specified node does not exist in the network */
  NodeNotFound: 'NODE_NOT_FOUND',

  /** The specified edge does not exist in the network */
  EdgeNotFound: 'EDGE_NOT_FOUND',

  /** Input validation failed (missing/malformed parameters) */
  InvalidInput: 'INVALID_INPUT',

  /** CX2 data failed structural validation */
  InvalidCx2: 'INVALID_CX2',

  /** A store operation threw an unexpected error */
  OperationFailed: 'OPERATION_FAILED',

  /** The requested layout engine is not registered */
  LayoutEngineNotFound: 'LAYOUT_ENGINE_NOT_FOUND',

  /** A renderer function (e.g., fit) is not registered */
  FunctionNotAvailable: 'FUNCTION_NOT_AVAILABLE',

  /** No network is currently selected in the workspace */
  NoCurrentNetwork: 'NO_CURRENT_NETWORK',
} as const

/**
 * Union type of all error code string values.
 * Use `typeof ApiErrorCode[keyof typeof ApiErrorCode]` for the type.
 */
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode]
```

**Design decisions:** (see [ADR 0001](../../../adr/0001-api-result-discriminated-union.md) for full rationale)

| Decision                         | Rationale                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as const` object + derived type | Follows the same pattern as `ValueTypeName`, `VisualPropertyName` in the existing codebase. Allows both value usage (`ApiErrorCode.NetworkNotFound`) and type usage (`ApiErrorCode`). |
| JSDoc on every code              | External app developers need to know when each code is returned without reading app API source.                                                                                        |
| No numeric codes                 | String codes are self-documenting in logs and debugger output.                                                                                                                        |

````typescript
/**
 * Detailed error information returned by failed app API operations.
 */
export interface ApiError {
  /** Machine-readable error code for programmatic handling */
  readonly code: ApiErrorCode

  /** Human-readable error description for logging and debugging */
  readonly message: string
}

/**
 * Successful result branch of the discriminated union.
 * `T` defaults to `void` for operations that return no data.
 */
export interface ApiSuccess<T = void> {
  readonly success: true
  readonly data: T
}

/**
 * Failed result branch of the discriminated union.
 */
export interface ApiFailure {
  readonly success: false
  readonly error: ApiError
}

/**
 * Discriminated union returned by all app API operations.
 *
 * External apps check `result.success` to narrow the type:
 *
 * ```typescript
 * const result = api.createNode(networkId, [100, 200])
 * if (result.success) {
 *   console.log(result.data.nodeId) // TypeScript narrows to ApiSuccess
 * } else {
 *   console.error(result.error.code) // TypeScript narrows to ApiFailure
 * }
 * ```
 *
 * App API hooks **never** throw exceptions across the API boundary.
 * All errors are captured as `ApiFailure` values.
 */
export type ApiResult<T = void> = ApiSuccess<T> | ApiFailure
````

**Design decisions:** (see [ADR 0001](../../../adr/0001-api-result-discriminated-union.md) for full rationale and rejected alternatives)

| Decision                      | Rationale                                                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `readonly` on all properties  | Prevents accidental mutation by external apps. Result objects are immutable after creation.                                                                                         |
| `T = void` default            | Most write operations (delete, set value) return no meaningful data. Callers only need `ok()` without a type parameter.                                                             |
| No `cause` or `details` field | Keeps the error model simple. Internal exceptions are logged via the `debug` logger, not exposed to external apps. A `details` field could be added later without breaking changes. |

#### Helper Functions

````typescript
/**
 * Construct a successful ApiResult with optional data.
 *
 * @example
 * ```typescript
 * // Operation with no return data
 * return ok()
 *
 * // Operation with return data
 * return ok({ nodeId: '42' })
 * ```
 */
export function ok(): ApiSuccess<void>
export function ok<T>(data: T): ApiSuccess<T>
export function ok<T>(data?: T): ApiSuccess<T> | ApiSuccess<void> {
  if (arguments.length === 0) {
    return { success: true, data: undefined as void }
  }
  return { success: true, data: data as T }
}

/**
 * Construct a failed ApiResult from an error code and message.
 *
 * @example
 * ```typescript
 * return fail(ApiErrorCode.NetworkNotFound, `Network ${id} not found`)
 * ```
 */
export function fail(code: ApiErrorCode, message: string): ApiFailure {
  return {
    success: false,
    error: { code, message },
  }
}
````

**Design decisions:**

| Decision                                  | Rationale                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Function overloads for `ok()`             | Allows `ok()` (void) and `ok(data)` (typed) without requiring callers to pass `undefined`.     |
| `fail()` takes primitives, not `ApiError` | Avoids forcing callers to construct an object literal for every failure. The helper builds it. |
| Named functions, not arrow functions      | Named functions produce better stack traces and are hoistable.                                 |
| No class-based `Result` type              | Keeps the types serializable and aligned with the codebase's preference for plain objects.     |

#### Type Guards

```typescript
/**
 * Type guard for narrowing ApiResult to ApiSuccess.
 * Useful when the discriminated union narrowing is inconvenient
 * (e.g., in filter/map chains).
 */
export function isOk<T>(result: ApiResult<T>): result is ApiSuccess<T> {
  return result.success
}

/**
 * Type guard for narrowing ApiResult to ApiFailure.
 */
export function isFail<T>(result: ApiResult<T>): result is ApiFailure {
  return !result.success
}
```

**Design decisions:**

| Decision                           | Rationale                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| Type guards are optional utilities | Most callers will use `if (result.success)` directly. Guards help in functional pipelines. |
| Both `isOk` and `isFail` provided  | Symmetry; avoids `!isOk(result)` which doesn't narrow to `ApiFailure`.                     |

---

### 3.2 `AppContext.ts` — App Lifecycle Types

**File:** `src/app-api/types/AppContext.ts`

This file contains **forward declarations** for the app lifecycle contract. The concrete app API types referenced in `AppContext.apis` are not yet defined (they come in Phase 1a–1e), so this file uses placeholder `interface` stubs or `any` initially and will be updated as each app API hook is implemented.

```typescript
// src/app-api/types/AppContext.ts

import { CyApp } from '../../models/AppModel/CyApp'

/**
 * Context object passed to external apps during mount().
 *
 * Provides pre-instantiated app API instances. The host creates
 * these within a React rendering context and passes the resolved
 * objects, so apps can use them outside of React components.
 *
 * NOTE: API fields are added incrementally as app API hooks are
 * implemented in Phase 1a–1e. This initial version declares the
 * shape but marks unimplemented APIs as optional.
 */
export interface AppContext {
  /** The unique ID of this app instance */
  readonly appId: string

  /** Pre-instantiated app API instances */
  readonly apis: {
    // Populated in Phase 1a
    // element: ElementApi
    // Populated in Phase 1b
    // network: NetworkApi
    // Populated in Phase 1c
    // selection: SelectionApi
    // viewport: ViewportApi
    // Populated in Phase 1d
    // table: TableApi
    // visualStyle: VisualStyleApi
    // Populated in Phase 1e
    // layout: LayoutApi
    // export: ExportApi
  }
}

/**
 * Extended CyApp interface with lifecycle callbacks.
 *
 * Backward-compatible — existing apps without lifecycle methods
 * continue to work unchanged.
 */
export interface CyAppWithLifecycle extends CyApp {
  /**
   * Called when the app is activated (after React components are registered).
   * Receives an AppContext providing access to all app APIs.
   * If this returns a Promise, the host awaits it before marking
   * the app as ready.
   */
  mount?(context: AppContext): void | Promise<void>

  /**
   * Called when the app is deactivated or unloaded.
   * Apps must clean up DOM nodes, listeners, timers, and async tasks.
   * No async work should survive past unmount().
   * Will always be called, even on page reload.
   */
  unmount?(): void | Promise<void>
}
```

**Incremental update plan:**

| Phase                           | Update to `AppContext.apis`                                         |
| ------------------------------- | ------------------------------------------------------------------- |
| Phase 1a (Element API)          | Uncomment `element: ElementApi`, add import                         |
| Phase 1b (Network API)          | Uncomment `network: NetworkApi`, add import                         |
| Phase 1c (Selection + Viewport) | Uncomment `selection`, `viewport`, add imports                      |
| Phase 1d (Table + Visual Style) | Uncomment `table`, `visualStyle`, add imports                       |
| Phase 1e (Layout + Export)      | Uncomment `layout`, `export`, add imports. All fields now required. |

---

### 3.3 `ElementTypes.ts` — Public Type Re-exports

**File:** `src/app-api/types/ElementTypes.ts`

This file re-exports key model types so external apps import from `cyweb/ApiTypes` rather than reaching into internal model paths. External apps should **never** import directly from `../../models/...` — those paths are internal and subject to change.

```typescript
// src/app-api/types/ElementTypes.ts

// ── Identity ────────────────────────────────────────────────────
export type { IdType } from '../../models/IdType'

// ── Table model types ───────────────────────────────────────────
export type { AttributeName } from '../../models/TableModel/AttributeName'
export type { ValueType } from '../../models/TableModel/ValueType'
export { ValueTypeName } from '../../models/TableModel/ValueTypeName'
export type { Table } from '../../models/TableModel/Table'
export type { Column } from '../../models/TableModel/Column'

// ── Network model types ─────────────────────────────────────────
export type { Network } from '../../models/NetworkModel/Network'
export type { Node } from '../../models/NetworkModel/Node'
export type { Edge } from '../../models/NetworkModel/Edge'
export type { CyNetwork } from '../../models/CyNetworkModel/CyNetwork'
export type { NetworkSummary } from '../../models/NetworkSummaryModel/NetworkSummary'

// ── Visual style types ──────────────────────────────────────────
export { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
export type { VisualStyle } from '../../models/VisualStyleModel/VisualStyle'

// ── View model types ────────────────────────────────────────────
export type { NetworkView } from '../../models/ViewModel/NetworkView'

// ── CX2 types ───────────────────────────────────────────────────
export type { Cx2 } from '../../models/CxModel/Cx2'
```

**Design decisions:** (see [ADR 0002](../../../adr/0002-public-type-reexport-strategy.md) for full rationale and rejected alternatives)

| Decision                               | Rationale                                                                                                                                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `export type` vs `export`              | `type`-only re-exports are used for interfaces/type aliases. Value-bearing `const` objects (`ValueTypeName`, `VisualPropertyName`) use plain `export` so they are available at runtime.                                                                |
| No `VisualPropertyValueType` re-export | `VisualPropertyValueType` is a complex union type used for internal style engine work. External apps primarily need `VisualPropertyName` for identifying properties and `ValueType` for attribute values. Can be added later if external apps need it. |
| Flat re-exports, not namespace objects | Follows existing model barrel export patterns (e.g., `src/models/index.ts`). Tree-shaking works better with named exports.                                                                                                                             |
| Separate sections with comments        | Helps maintainers quickly find which domain a type belongs to when adding new re-exports.                                                                                                                                                              |

#### Types NOT re-exported (with rationale)

| Type                           | Reason                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `GraphObject`                  | Internal base interface; external apps use `Node` and `Edge` directly.               |
| `GraphObjectType`              | Internal enum for table type discrimination.                                         |
| `NetworkAttributes`            | Rarely needed externally; accessible through `CyNetwork.networkAttributes`.          |
| `OpaqueAspects`                | Internal storage detail for CX2 pass-through aspects.                                |
| `UndoRedoStack`                | Internal undo/redo mechanics. External apps must not manipulate the undo stack.      |
| `VisualProperty<T>`            | Internal style engine type. External apps use `VisualPropertyName` + `ValueType`.    |
| `NodeView`, `EdgeView`, `View` | Internal view model internals. External apps use `NetworkView` for read-only access. |

---

### 3.4 `types/index.ts` — Types Barrel Export

**File:** `src/app-api/types/index.ts`

```typescript
// src/app-api/types/index.ts

// ── App API result types ─────────────────────────────────────────
export { ApiErrorCode, ok, fail, isOk, isFail } from './ApiResult'
export type { ApiResult, ApiSuccess, ApiFailure, ApiError } from './ApiResult'

// ── App lifecycle types ─────────────────────────────────────────
export type { AppContext, CyAppWithLifecycle } from './AppContext'

// ── Re-exported model types ─────────────────────────────────────
export { ValueTypeName, VisualPropertyName } from './ElementTypes'
export type {
  IdType,
  AttributeName,
  ValueType,
  Table,
  Column,
  Network,
  Node,
  Edge,
  CyNetwork,
  NetworkSummary,
  VisualStyle,
  NetworkView,
  Cx2,
} from './ElementTypes'
```

**Design decisions:**

| Decision                                 | Rationale                                                                                                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explicit re-export lists (no `export *`) | Precise control over the public surface. Prevents accidental leakage of internal types if `ElementTypes.ts` gains development-only exports. Easier to audit.                                                         |
| Split `export` and `export type`         | Runtime values (`ApiErrorCode`, `ok`, `fail`, `isOk`, `isFail`, `ValueTypeName`, `VisualPropertyName`) need plain `export`. Types need `export type`. TypeScript's `isolatedModules` mode requires this distinction. |

---

### 3.5 `api/index.ts` — API Barrel Export

**File:** `src/app-api/index.ts`

In this phase, only types are exported. App API hooks will be added in subsequent phases.

```typescript
// src/app-api/index.ts

// ── Types (Phase 0) ──────────────────────────────────────────────
export * from './types'

// ── App API hooks (added in Phase 1a–1e) ─────────────────────────
// export { useElementApi } from './useElementApi'       // Phase 1a
// export { useNetworkApi } from './useNetworkApi'       // Phase 1b
// export { useSelectionApi } from './useSelectionApi'   // Phase 1c
// export { useViewportApi } from './useViewportApi'     // Phase 1c
// export { useTableApi } from './useTableApi'           // Phase 1d
// export { useVisualStyleApi } from './useVisualStyleApi' // Phase 1d
// export { useLayoutApi } from './useLayoutApi'         // Phase 1e
// export { useExportApi } from './useExportApi'         // Phase 1e
```

---

## 4. Module Federation Integration

### 4.1 Webpack Config Change

**File:** `webpack.config.js`

Add one new entry to `ModuleFederationPlugin.exposes`:

```javascript
exposes: {
  // === Public App API Types ===
  './ApiTypes': './src/app-api/types/index.ts',

  // === Existing stores (unchanged) ===
  './CredentialStore': './src/data/hooks/stores/CredentialStore.ts',
  // ... (12 stores unchanged)
  './CreateNetwork': './src/data/task/useCreateNetwork.tsx',
  './CreateNetworkFromCx2': './src/data/task/useCreateNetworkFromCx2.tsx',
},
```

**Why only `./ApiTypes` in this phase:**

The app API hook entries (`./ElementApi`, `./NetworkApi`, etc.) are not added until the corresponding hooks exist and export valid React hooks. Adding entries that point to empty or stub files would cause Webpack build failures: Module Federation validates that exposed modules export _something_ at build time.

**External app consumption after this phase:**

```typescript
import type {
  ApiResult,
  ApiErrorCode,
  IdType,
  VisualPropertyName,
} from 'cyweb/ApiTypes'
```

### 4.2 Webpack Shared Singletons — No Changes

No changes to `shared` configuration. The types module has no runtime dependencies beyond what is already shared (`react`, `react-dom`, `@mui/material`).

---

## 5. Unit Tests

### 5.1 `ApiResult.test.ts`

**File:** `src/app-api/types/ApiResult.test.ts`

Tests validate the helper functions and type narrowing behavior.

```typescript
// src/app-api/types/ApiResult.test.ts

import { ok, fail, isOk, isFail, ApiErrorCode } from './ApiResult'
import type { ApiResult, ApiSuccess, ApiFailure } from './ApiResult'

describe('ApiResult helpers', () => {
  describe('ok()', () => {
    it('creates a void success result when called with no arguments', () => {
      const result = ok()
      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    it('creates a typed success result with data', () => {
      const result = ok({ nodeId: '42' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ nodeId: '42' })
    })

    it('preserves complex data types', () => {
      const data = { ids: ['1', '2'], count: 2 }
      const result = ok(data)
      expect(result.data).toEqual(data)
    })
  })

  describe('fail()', () => {
    it('creates a failure result with code and message', () => {
      const result = fail(ApiErrorCode.NetworkNotFound, 'Network abc not found')
      expect(result.success).toBe(false)
      expect(result.error.code).toBe('NETWORK_NOT_FOUND')
      expect(result.error.message).toBe('Network abc not found')
    })

    it('creates a failure result for each error code', () => {
      const codes = Object.values(ApiErrorCode)
      for (const code of codes) {
        const result = fail(code, `Error: ${code}`)
        expect(result.success).toBe(false)
        expect(result.error.code).toBe(code)
      }
    })
  })

  describe('isOk()', () => {
    it('returns true for success results', () => {
      expect(isOk(ok())).toBe(true)
      expect(isOk(ok({ id: '1' }))).toBe(true)
    })

    it('returns false for failure results', () => {
      expect(isOk(fail(ApiErrorCode.InvalidInput, 'bad input'))).toBe(false)
    })
  })

  describe('isFail()', () => {
    it('returns true for failure results', () => {
      expect(isFail(fail(ApiErrorCode.OperationFailed, 'oops'))).toBe(true)
    })

    it('returns false for success results', () => {
      expect(isFail(ok())).toBe(false)
    })
  })

  describe('ApiErrorCode', () => {
    it('has the expected number of error codes', () => {
      const codes = Object.keys(ApiErrorCode)
      expect(codes.length).toBe(9)
    })

    it('has unique string values', () => {
      const values = Object.values(ApiErrorCode)
      const uniqueValues = new Set(values)
      expect(uniqueValues.size).toBe(values.length)
    })

    it('all values are UPPER_SNAKE_CASE strings', () => {
      const values = Object.values(ApiErrorCode)
      for (const value of values) {
        expect(value).toMatch(/^[A-Z][A-Z_]+$/)
      }
    })
  })

  describe('type narrowing', () => {
    it('narrows to ApiSuccess when success is true', () => {
      const result: ApiResult<{ nodeId: string }> = ok({
        nodeId: '42',
      })
      if (result.success) {
        // TypeScript should narrow to ApiSuccess<{ nodeId: string }>
        const nodeId: string = result.data.nodeId
        expect(nodeId).toBe('42')
      }
    })

    it('narrows to ApiFailure when success is false', () => {
      const result: ApiResult<{ nodeId: string }> = fail(
        ApiErrorCode.NodeNotFound,
        'Not found',
      )
      if (!result.success) {
        // TypeScript should narrow to ApiFailure
        const code: string = result.error.code
        expect(code).toBe('NODE_NOT_FOUND')
      }
    })
  })
})
```

---

## 6. Behavioral Documentation

### 6.1 `Api.md`

**File:** `src/app-api/api_docs/Api.md`

````markdown
# App API — Behavioral Documentation

## Overview

The app API (`src/app-api/`) is the sole public API for external apps
loaded via Module Federation. It provides a stable contract independent of
internal store and hook implementations.

## Result Convention

All app API operations return `ApiResult<T>`, a discriminated union:

- `{ success: true, data: T }` — operation succeeded
- `{ success: false, error: { code, message } }` — operation failed

App API hooks **never** throw exceptions across the API boundary.

## Error Codes

| Code                      | When Returned                                          |
| ------------------------- | ------------------------------------------------------ |
| `NETWORK_NOT_FOUND`       | The specified network ID does not exist                |
| `NODE_NOT_FOUND`          | The specified node ID does not exist in the network    |
| `EDGE_NOT_FOUND`          | The specified edge ID does not exist in the network    |
| `INVALID_INPUT`           | Input validation failed (missing/malformed parameters) |
| `INVALID_CX2`             | CX2 data failed structural validation                  |
| `OPERATION_FAILED`        | An internal store operation threw an unexpected error  |
| `LAYOUT_ENGINE_NOT_FOUND` | The requested layout engine is not registered          |
| `FUNCTION_NOT_AVAILABLE`  | A renderer function (e.g., fit) is not registered yet  |
| `NO_CURRENT_NETWORK`      | No network is currently selected in the workspace      |

## Module Federation Entry

External apps import types from `cyweb/ApiTypes`:

```typescript
import type { ApiResult, IdType } from 'cyweb/ApiTypes'
import { ApiErrorCode, ok, fail } from 'cyweb/ApiTypes'
```

````

## App API Hooks (added incrementally)

| Module                 | Hook                  | Phase |
| ---------------------- | --------------------- | ----- |
| `cyweb/ElementApi`     | `useElementApi()`     | 1a    |
| `cyweb/NetworkApi`     | `useNetworkApi()`     | 1b    |
| `cyweb/SelectionApi`   | `useSelectionApi()`   | 1c    |
| `cyweb/ViewportApi`    | `useViewportApi()`    | 1c    |
| `cyweb/TableApi`       | `useTableApi()`       | 1d    |
| `cyweb/VisualStyleApi` | `useVisualStyleApi()` | 1d    |
| `cyweb/LayoutApi`      | `useLayoutApi()`      | 1e    |
| `cyweb/ExportApi`      | `useExportApi()`      | 1e    |


---

## 7. Dependency Analysis

### 7.1 Import Graph

```

src/app-api/types/ApiResult.ts
└── (no imports — self-contained)

src/app-api/types/AppContext.ts
└── src/models/AppModel/CyApp.ts

src/app-api/types/ElementTypes.ts
├── src/models/IdType.ts
├── src/models/TableModel/AttributeName.ts
├── src/models/TableModel/ValueType.ts
├── src/models/TableModel/ValueTypeName.ts
├── src/models/TableModel/Table.ts
├── src/models/TableModel/Column.ts
├── src/models/NetworkModel/Network.ts
├── src/models/NetworkModel/Node.ts
├── src/models/NetworkModel/Edge.ts
├── src/models/CyNetworkModel/CyNetwork.ts
├── src/models/NetworkSummaryModel/NetworkSummary.ts
├── src/models/VisualStyleModel/VisualPropertyName.ts
├── src/models/VisualStyleModel/VisualStyle.ts
├── src/models/ViewModel/NetworkView.ts
└── src/models/CxModel/Cx2/index.ts

src/app-api/types/index.ts
├── ./ApiResult.ts
├── ./AppContext.ts
└── ./ElementTypes.ts

src/app-api/index.ts
└── ./types/index.ts

```

### 7.2 External Dependencies

| Dependency | Where | Impact |
|---|---|---|
| `react` (type only) | `CyNetwork` → `RendererModel` (transitive) | Not imported directly by api/ files. `CyNetwork` is re-exported as `type` only, so no runtime dependency. |
| `cytoscape` (type only) | `NetworkView` → `View` (transitive) | Same — `type` export only. |

**Risk:** If any re-exported type transitively imports a runtime dependency, it could cause Module Federation to try to resolve that module in external apps. Mitigation: all model re-exports in `ElementTypes.ts` use `export type`, which TypeScript erases entirely at compile time. The runtime values re-exported (`ValueTypeName`, `VisualPropertyName`) are plain `as const` objects with no external dependencies.

---

## 8. Prerequisite: Verify `CyApp` Interface

The `AppContext.ts` file imports `CyApp` from `src/models/AppModel/CyApp`. Before implementation, verify this interface exists and has the expected shape.

**Expected location:** `src/models/AppModel/CyApp.ts`

If the interface does not exist or has a different name/path, update the import in `AppContext.ts` accordingly. The `CyAppWithLifecycle extends CyApp` relationship requires the base interface.

---

## 9. Implementation Checklist

> The authoritative checklist is [implementation-checklist-phase0.md](../checklists/implementation-checklist-phase0.md).
> The table below is a summary for quick reference; for npm package publication steps see the full checklist.

Ordered steps for the implementer:

| # | Task | Files Created/Modified | Verification |
|---|---|---|---|
| 1 | Create directory structure | `src/app-api/`, `src/app-api/types/`, `src/app-api/api_docs/` | Directories exist |
| 2 | Verify `CyApp` interface location | — | Import path resolves |
| 3 | Create `ApiResult.ts` | `src/app-api/types/ApiResult.ts` | `npm run lint` passes |
| 4 | Create `AppContext.ts` | `src/app-api/types/AppContext.ts` | `npm run lint` passes |
| 5 | Create `ElementTypes.ts` | `src/app-api/types/ElementTypes.ts` | `npm run lint` passes; all import paths resolve |
| 6 | Create `types/index.ts` barrel | `src/app-api/types/index.ts` | `npm run lint` passes |
| 7 | Create `api/index.ts` barrel | `src/app-api/index.ts` | `npm run lint` passes |
| 8 | Create `src/app-api/CLAUDE.md` | `src/app-api/CLAUDE.md` | File exists |
| 9 | Add `./ApiTypes` to webpack exposes | `webpack.config.js` | `npm run build` succeeds |
| 10 | Create `ApiResult.test.ts` | `src/app-api/types/ApiResult.test.ts` | `npm run test:unit -- --testPathPattern="ApiResult"` passes |
| 11 | Create `Api.md` documentation | `src/app-api/api_docs/Api.md` | File exists, reviewed |
| 12 | Full build verification | — | `npm run build` succeeds |
| 13 | Full lint verification | — | `npm run lint` passes |
| 14–18 | Publish `@cytoscape-web/api-types@0.1.0-alpha.0` | `packages/api-types/` | See [implementation-checklist-phase0.md](../checklists/implementation-checklist-phase0.md) |

---

## 10. Future Phase Impacts

This phase creates the foundation for all subsequent work. Here is how later phases build on it:

| Phase | What It Adds | What It Uses From This Phase |
|---|---|---|
| 1a: Element API | `useElementApi.ts` | `ApiResult`, `ok()`, `fail()`, `ApiErrorCode`, `IdType`, `AttributeName`, `ValueType` |
| 1b: Network API | `useNetworkApi.ts` | `ApiResult`, `ok()`, `fail()`, `ApiErrorCode`, `Cx2`, `CyNetwork` |
| 1c: Selection + Viewport | `useSelectionApi.ts`, `useViewportApi.ts` | `ApiResult`, `ok()`, `fail()`, `ApiErrorCode`, `IdType` |
| 1d: Table + Visual Style | `useTableApi.ts`, `useVisualStyleApi.ts` | `ApiResult`, `ok()`, `fail()`, `ApiErrorCode`, `IdType`, table types, VP types |
| 1e: Layout + Export | `useLayoutApi.ts`, `useExportApi.ts` | `ApiResult`, `ok()`, `fail()`, `ApiErrorCode`, `Cx2` |
| Step 2: Event Bus | `initEventBus.ts`, `useCyWebEvent.ts`, `CyWebEvents.ts` | `IdType` (re-exported via `cyweb/ApiTypes`) |
| Webpack update | New `./ElementApi`, etc. + `./EventBus` entries | `./ApiTypes` entry already present |
| `AppContext` completion | Uncomment API fields | `AppContext` type shell already defined |

---

## 11. Open Questions

| # | Question | Owner | Resolution |
|---|---|---|---|
| 1 | Should `ApiResult` support a `warnings` array alongside `error`? Some operations (e.g., CX2 import) may partially succeed with warnings. | API Design | **Deferred.** Current design is success/failure binary. Warnings can be added as `ApiResult<T & { warnings?: string[] }>` in specific hooks without changing the core type. |
| 2 | Should `ok()` and `fail()` be frozen (`Object.freeze`)? | API Design | **No.** See [ADR 0001](../../../adr/0001-api-result-discriminated-union.md). |
| 3 | Should `ApiErrorCode` be extensible by external apps? | API Design | **No.** See [ADR 0001](../../../adr/0001-api-result-discriminated-union.md). |

