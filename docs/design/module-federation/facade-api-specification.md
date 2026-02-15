# Facade API Specification

**Rev. 2 (2/15/2026): Keiichiro ONO and Claude Code w/ Opus 4.6**

Detailed design for the facade API (External App API) layer. For priorities and roadmap, see [module-federation-design.md](module-federation-design.md). For the audit of the current system, see [module-federation-audit.md](module-federation-audit.md).

---

## 1. Facade Layer Design

### 1.1 Overview

The facade layer at `src/app-api/` is the **sole public API** for external apps. Rather than exposing internal stores or hooks directly, the facade defines a stable contract that external apps program against. This ensures that internal refactoring (store splits, hook reorganization, etc.) never breaks the external API.

Each facade hook wraps existing internal hooks or store actions, providing:

- Input validation at the boundary before any store mutation
- Consistent `ApiResult<T>` return types (no thrown exceptions cross the facade)
- Internal-only options (`skipUndo`) hidden from external callers
- Side-effect control via explicit options

The facade does **not** duplicate store coordination logic. It delegates to existing internal hooks (`src/data/hooks/`) and converts their results. Internal stores and hooks are created or modified as needed to support the facade, but are never independently exposed via Module Federation.

### 1.2 Directory Structure

```
src/app-api/
├── api_docs/
│   └── Api.md                     # Behavioral documentation
├── types/
│   ├── ApiResult.ts               # Result<T>, ApiError, ApiErrorCode
│   ├── AppContext.ts              # AppContext, CyAppWithLifecycle
│   ├── ElementTypes.ts            # Re-exported public-facing types
│   └── index.ts                   # Barrel export
├── useElementApi.ts               # Node/edge CRUD
├── useNetworkApi.ts               # Network lifecycle
├── useSelectionApi.ts             # Selection operations
├── useTableApi.ts                 # Table data operations
├── useVisualStyleApi.ts           # Visual style operations
├── useLayoutApi.ts                # Layout execution
├── useViewportApi.ts              # Viewport control (fit, positions)
├── useExportApi.ts                # CX2 export
└── index.ts                       # Barrel export
```

### 1.3 Shared Result Types

All facade operations return `ApiResult<T>`, a discriminated union:

```typescript
// src/app-api/types/ApiResult.ts

interface ApiSuccess<T = void> {
  readonly success: true
  readonly data: T
}

interface ApiFailure {
  readonly success: false
  readonly error: ApiError
}

type ApiResult<T = void> = ApiSuccess<T> | ApiFailure

interface ApiError {
  readonly code: ApiErrorCode
  readonly message: string
}

const ApiErrorCode = {
  NetworkNotFound: 'NETWORK_NOT_FOUND',
  NodeNotFound: 'NODE_NOT_FOUND',
  EdgeNotFound: 'EDGE_NOT_FOUND',
  InvalidInput: 'INVALID_INPUT',
  InvalidCx2: 'INVALID_CX2',
  OperationFailed: 'OPERATION_FAILED',
  LayoutEngineNotFound: 'LAYOUT_ENGINE_NOT_FOUND',
  FunctionNotAvailable: 'FUNCTION_NOT_AVAILABLE',
  NoCurrentNetwork: 'NO_CURRENT_NETWORK',
} as const
```

Usage by external apps:

```typescript
const result = api.createNode(networkId, [100, 200])
if (result.success) {
  console.log(result.data.nodeId) // TypeScript narrows to ApiSuccess
} else {
  console.error(result.error.code, result.error.message) // narrows to ApiFailure
}
```

### 1.4 Public Type Re-exports

`src/app-api/types/ElementTypes.ts` re-exports key model types so external apps import from the API module rather than internal model paths:

```typescript
export type { IdType } from '../../models/IdType'
export type { AttributeName } from '../../models/TableModel/AttributeName'
export type { ValueType } from '../../models/TableModel/ValueType'
export { ValueTypeName } from '../../models/TableModel/ValueTypeName'
export { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
export type { CyNetwork } from '../../models/CyNetworkModel/CyNetwork'
export type { Cx2 } from '../../models/CxModel/Cx2'
export type { Table } from '../../models/TableModel/Table'
export type { NetworkView } from '../../models/ViewModel/NetworkView'
export type { NetworkSummary } from '../../models/NetworkSummaryModel/NetworkSummary'

// App lifecycle types
export type { AppContext, CyAppWithLifecycle } from './AppContext'
```

### 1.5 Facade Hook Specifications

#### 1.5.1 Element API

Wraps: `useCreateNode`, `useCreateEdge`, `useDeleteNodes`, `useDeleteEdges`

```typescript
// src/app-api/useElementApi.ts

interface NodeData {
  attributes: Record<AttributeName, ValueType>
  position: [number, number, number?]
}

interface EdgeData {
  sourceId: IdType
  targetId: IdType
  attributes: Record<AttributeName, ValueType>
}

interface CreateNodeOptions {
  attributes?: Record<AttributeName, ValueType>
  autoSelect?: boolean // default: true
}

interface CreateEdgeOptions {
  attributes?: Record<AttributeName, ValueType>
  autoSelect?: boolean // default: true
}

interface ElementApi {
  // --- Read ---
  getNode(networkId: IdType, nodeId: IdType): ApiResult<NodeData>
  getEdge(networkId: IdType, edgeId: IdType): ApiResult<EdgeData>

  // --- Create ---
  createNode(
    networkId: IdType,
    position: [number, number, number?],
    options?: CreateNodeOptions,
  ): ApiResult<{ nodeId: IdType }>

  createEdge(
    networkId: IdType,
    sourceNodeId: IdType,
    targetNodeId: IdType,
    options?: CreateEdgeOptions,
  ): ApiResult<{ edgeId: IdType }>

  // --- Update ---
  moveEdge(
    networkId: IdType,
    edgeId: IdType,
    newSourceId: IdType,
    newTargetId: IdType,
  ): ApiResult

  // --- Delete ---
  deleteNodes(
    networkId: IdType,
    nodeIds: IdType[],
  ): ApiResult<{ deletedNodeCount: number; deletedEdgeCount: number }>

  deleteEdges(
    networkId: IdType,
    edgeIds: IdType[],
  ): ApiResult<{ deletedEdgeCount: number }>

  generateNextNodeId(networkId: IdType): IdType
  generateNextEdgeId(networkId: IdType): IdType
}

const useElementApi: () => ElementApi
```

**Implementation strategy:**

- **`getNode`**: Reads attributes from `TableStore` and position from `ViewModelStore`. Validates node existence in `NetworkStore`. Returns `NodeNotFound` if the node does not exist.
- **`getEdge`**: Reads source/target from `NetworkStore` and attributes from `TableStore`. Returns `EdgeNotFound` if the edge does not exist.
- **`createNode` / `createEdge`**: Calls internal `useCreateNode()` / `useCreateEdge()`, maps their result objects to `ApiResult<T>`. The `skipUndo` option is never passed — undo always records.
- **`moveEdge`**: Atomically updates source/target in `NetworkStore`, preserving all attributes in `TableStore` and visual style bypasses in `VisualStyleStore`. Records undo entry. Returns `EdgeNotFound` or `NodeNotFound` on invalid IDs.

#### 1.5.2 Network API

Wraps: `useCreateNetwork`, `useCreateNetworkFromCx2`, `useDeleteCyNetwork`

```typescript
// src/app-api/useNetworkApi.ts

interface CreateNetworkFromEdgeListProps {
  name: string
  description?: string
  edgeList: Array<[IdType, IdType, string?]>
}

interface CreateNetworkFromCx2Props {
  cxData: Cx2
  navigate?: boolean // default: true
  addToWorkspace?: boolean // default: true
}

interface DeleteNetworkOptions {
  navigate?: boolean // default: true
}

interface CreateNetworkData {
  networkId: IdType
  cyNetwork: CyNetwork
}

interface NetworkApi {
  createNetworkFromEdgeList(
    props: CreateNetworkFromEdgeListProps,
  ): ApiResult<CreateNetworkData>

  createNetworkFromCx2(
    props: CreateNetworkFromCx2Props,
  ): ApiResult<CreateNetworkData>

  deleteNetwork(networkId: IdType, options?: DeleteNetworkOptions): ApiResult

  deleteCurrentNetwork(options?: DeleteNetworkOptions): ApiResult

  deleteAllNetworks(): ApiResult
}

const useNetworkApi: () => NetworkApi
```

**Implementation strategy:**

- `createNetworkFromEdgeList`: Wraps existing `useCreateNetwork` task hook. Catches errors, returns `ApiResult`.
- `createNetworkFromCx2`: **Adds `validateCX2()` before processing** (fixes Audit Section 4.5 bug). Refactors internal `useCreateNetworkFromCx2` to accept `navigate` and `addToWorkspace` options (fixes Audit Section 4.6).
- `deleteNetwork` / `deleteCurrentNetwork` / `deleteAllNetworks`: Wraps `useDeleteCyNetwork`.

#### 1.5.3 Selection API

Wraps: `ViewModelStore` selection methods directly (no internal wrapper hook exists)

```typescript
// src/app-api/useSelectionApi.ts

interface SelectionState {
  selectedNodes: IdType[]
  selectedEdges: IdType[]
}

interface SelectionApi {
  exclusiveSelect(
    networkId: IdType,
    nodeIds: IdType[],
    edgeIds: IdType[],
  ): ApiResult

  additiveSelect(networkId: IdType, ids: IdType[]): ApiResult
  additiveUnselect(networkId: IdType, ids: IdType[]): ApiResult
  toggleSelected(networkId: IdType, ids: IdType[]): ApiResult
  getSelection(networkId: IdType): ApiResult<SelectionState>
}

const useSelectionApi: () => SelectionApi
```

**Implementation strategy:** Validates networkId existence via `getViewModel()`, then delegates to `ViewModelStore` actions.

#### 1.5.4 Table API

Wraps: `TableStore` CRUD methods

```typescript
// src/app-api/useTableApi.ts

type TableType = 'node' | 'edge'

interface CellEdit {
  id: IdType
  column: AttributeName
  value: ValueType
}

interface TableApi {
  // --- Read ---
  getValue(
    networkId: IdType,
    tableType: TableType,
    elementId: IdType,
    column: AttributeName,
  ): ApiResult<{ value: ValueType }>

  getRow(
    networkId: IdType,
    tableType: TableType,
    elementId: IdType,
  ): ApiResult<{ row: Record<AttributeName, ValueType> }>

  // --- Write ---
  createColumn(
    networkId: IdType,
    tableType: TableType,
    columnName: string,
    dataType: ValueTypeName,
    defaultValue: ValueType,
  ): ApiResult

  deleteColumn(
    networkId: IdType,
    tableType: TableType,
    columnName: string,
  ): ApiResult

  setColumnName(
    networkId: IdType,
    tableType: TableType,
    currentName: string,
    newName: string,
  ): ApiResult

  setValue(
    networkId: IdType,
    tableType: TableType,
    elementId: IdType,
    column: AttributeName,
    value: ValueType,
  ): ApiResult

  setValues(
    networkId: IdType,
    tableType: TableType,
    cellEdits: CellEdit[],
  ): ApiResult

  editRows(
    networkId: IdType,
    tableType: TableType,
    rows: Map<IdType, Record<AttributeName, ValueType>>,
  ): ApiResult

  applyValueToElements(
    networkId: IdType,
    tableType: TableType,
    columnName: string,
    value: ValueType,
    elementIds?: IdType[],
  ): ApiResult
}

const useTableApi: () => TableApi
```

**Implementation strategy:**

- **`getValue` / `getRow`**: Reads directly from `TableStore.tables[networkId]`. Validates table and element existence. Returns `NetworkNotFound` if the table does not exist.
- **Write operations**: Validates `tables[networkId]` existence, then delegates to `TableStore` actions. Adds column existence checks for operations on existing columns.

#### 1.5.5 Visual Style API

Wraps: `VisualStyleStore` mapping/bypass methods

```typescript
// src/app-api/useVisualStyleApi.ts

interface VisualStyleApi {
  setDefault(
    networkId: IdType,
    vpName: VisualPropertyName,
    vpValue: VisualPropertyValueType,
  ): ApiResult

  setBypass(
    networkId: IdType,
    vpName: VisualPropertyName,
    elementIds: IdType[],
    vpValue: VisualPropertyValueType,
  ): ApiResult

  deleteBypass(
    networkId: IdType,
    vpName: VisualPropertyName,
    elementIds: IdType[],
  ): ApiResult

  createDiscreteMapping(
    networkId: IdType,
    vpName: VisualPropertyName,
    attribute: AttributeName,
    attributeType: ValueTypeName,
  ): ApiResult

  createContinuousMapping(
    networkId: IdType,
    vpName: VisualPropertyName,
    vpType: string,
    attribute: AttributeName,
    attributeValues: ValueType[],
    attributeType: ValueTypeName,
  ): ApiResult

  createPassthroughMapping(
    networkId: IdType,
    vpName: VisualPropertyName,
    attribute: AttributeName,
    attributeType: ValueTypeName,
  ): ApiResult

  removeMapping(networkId: IdType, vpName: VisualPropertyName): ApiResult
}

const useVisualStyleApi: () => VisualStyleApi
```

**Implementation strategy:** Validates `visualStyles[networkId]` existence, then delegates to `VisualStyleStore` actions.

#### 1.5.6 Layout API

**New coordination logic** — no internal wrapper hook exists today.

```typescript
// src/app-api/useLayoutApi.ts

interface LayoutAlgorithmInfo {
  name: string
  engineName: string
  displayName: string
  description: string
}

interface ApplyLayoutOptions {
  algorithmName?: string // default: preferred layout
  fitAfterLayout?: boolean // default: true
}

interface LayoutApi {
  applyLayout(
    networkId: IdType,
    options?: ApplyLayoutOptions,
  ): Promise<ApiResult>

  getAvailableLayouts(): ApiResult<LayoutAlgorithmInfo[]>
}

const useLayoutApi: () => LayoutApi
```

**Implementation strategy:** This is the only facade with genuinely new coordination logic:

1. Read `LayoutStore.layoutEngines` to find the engine
2. Read `NetworkStore.networks` to get topology
3. Call `LayoutEngine.apply(nodes, edges, callback, algorithm)` asynchronously
4. In callback: `ViewModelStore.updateNodePositions(networkId, positionMap)`
5. If `fitAfterLayout`: `RendererFunctionStore.getFunction('cyjs', 'fit', networkId)()`
6. Resolve the `Promise<ApiResult>`

Returns a `Promise` because `LayoutEngine.apply()` is callback-based.

#### 1.5.7 Viewport API

Wraps: `RendererFunctionStore` (fit) + `ViewModelStore` (updateNodePositions)

```typescript
// src/app-api/useViewportApi.ts

interface ViewportApi {
  fit(networkId: IdType): Promise<ApiResult>

  getNodePositions(
    networkId: IdType,
    nodeIds: IdType[],
  ): ApiResult<Map<IdType, [number, number, number?]>>

  updateNodePositions(
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ): ApiResult
}

const useViewportApi: () => ViewportApi
```

**Implementation strategy:**

- **`fit()`**: Retrieves and calls `RendererFunctionStore.getFunction('cyjs', 'fit', networkId)`. Returns `Promise<ApiResult>` because Cytoscape.js `cy.fit()` may involve animation; wrapping in a Promise future-proofs against animated transitions. Returns `FunctionNotAvailable` error if the renderer function is not registered.
- **`getNodePositions()`**: Reads positions from `ViewModelStore.getViewModel(networkId)`. Returns `NetworkNotFound` if the view model does not exist. Returns positions for only the requested node IDs.

#### 1.5.8 Export API

Wraps: `exportCyNetworkToCx2` from `src/models/CxModel/impl/exporter.ts`

```typescript
// src/app-api/useExportApi.ts

interface ExportCx2Options {
  networkName?: string
}

interface ExportApi {
  exportToCx2(networkId: IdType, options?: ExportCx2Options): ApiResult<Cx2>
}

const useExportApi: () => ExportApi
```

**Implementation strategy:** Gathers `CyNetwork` data from NetworkStore, TableStore, VisualStyleStore, ViewModelStore, OpaqueAspectStore. Reads `NetworkSummary` from NetworkSummaryStore. Passes to `exportCyNetworkToCx2()`.

#### 1.5.9 App Lifecycle API

**New contract** — extends the `CyApp` interface with lifecycle callbacks.

```typescript
// src/app-api/types/AppContext.ts

interface AppContext {
  /** The unique ID of this app instance */
  appId: string

  /** Pre-instantiated facade API instances */
  apis: {
    element: ElementApi
    network: NetworkApi
    selection: SelectionApi
    table: TableApi
    visualStyle: VisualStyleApi
    layout: LayoutApi
    viewport: ViewportApi
    export: ExportApi
  }
}

// Extended CyApp interface (backward-compatible)
interface CyAppWithLifecycle extends CyApp {
  /**
   * Called when the app is activated (after React components are registered).
   * Use for initializing app state, registering event listeners, and preparing resources.
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

**Implementation strategy:**

- The host calls `mount(context)` after an app is activated and its React components are registered. The `AppContext.apis` object contains pre-instantiated facade API instances that provide non-hook access to all operations (the host creates them within a React rendering context and passes the resolved objects).
- The host calls `unmount()` when the app is deactivated or the page is unloading. The host guarantees `unmount()` is always called.
- Both callbacks are optional — existing apps without lifecycle methods continue to work unchanged.
- If `mount()` returns a `Promise`, the host awaits it before marking the app as ready.
- `AppContext` and `CyAppWithLifecycle` types are exported via `cyweb/ApiTypes`.

### 1.6 Sync/Async Policy

Facade operations use a **mixed sync/async** return type strategy based on the nature of the underlying implementation. The decision criteria are:

| Criterion                                                                                     | Return Type             | Rationale                                                                        |
| --------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| Pure store reads/writes (state update is immediate; IndexedDB persistence is fire-and-forget) | `ApiResult<T>`          | No reason to force `await` on callers when the operation completes synchronously |
| Callback-based async processing (layout engines, renderer operations)                         | `Promise<ApiResult<T>>` | The operation genuinely completes later; callers must `await`                    |
| External I/O (network requests, file operations)                                              | `Promise<ApiResult<T>>` | Inherently async                                                                 |
| Operations likely to be moved to Web Workers in the future                                    | `Promise<ApiResult<T>>` | Avoids a breaking change when the implementation becomes async                   |

**Classification of all facade operations:**

| Return Type                  | Operations                                                                                                                                                                                                                                                                                                                                                                                                                | Internal Mechanism                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ApiResult<T>` (sync)        | `createNode`, `createEdge`, `deleteNodes`, `deleteEdges`, `getNode`, `getEdge`, `moveEdge`, `createNetworkFromEdgeList`, `createNetworkFromCx2`, `deleteNetwork`, `exclusiveSelect`, `additiveSelect`, `getSelection`, `getValue`, `getRow`, `createColumn`, `setValue`, `setValues`, `setDefault`, `setBypass`, `createDiscreteMapping`, `getNodePositions`, `updateNodePositions`, `getAvailableLayouts`, `exportToCx2` | Zustand store read/write — state mutation is synchronous; IndexedDB persistence runs asynchronously but is not awaited                                      |
| `Promise<ApiResult>` (async) | `applyLayout`                                                                                                                                                                                                                                                                                                                                                                                                             | `LayoutEngine.apply()` is callback-based (CyjsLayout listens for `layoutstop` event; CosmosLayout uses a timer)                                             |
| `Promise<ApiResult>` (async) | `fit`                                                                                                                                                                                                                                                                                                                                                                                                                     | `RendererFunctionStore` delegates to Cytoscape.js `cy.fit()`, which may involve animation; wrapping in a Promise future-proofs against animated transitions |

**Stability guarantee:** Changing a synchronous operation to `Promise<ApiResult<T>>` is a **breaking change** for callers (they must add `await`). Facade operations are classified conservatively — if there is a reasonable expectation that the underlying implementation will become asynchronous, the operation returns `Promise` from the start.

### 1.7 Design Rules

| Rule                                         | Rationale                                                             |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `skipUndo` is never exposed externally       | Prevents external apps from corrupting the undo stack                 |
| All exceptions caught → `ApiFailure`         | External apps never need try/catch around facade calls                |
| Validate inputs before any store mutation    | Prevents partial state updates on invalid input                       |
| Options with sensible defaults               | Minimize required parameters; opt-in for advanced behavior            |
| Facade hooks wrap, never duplicate           | Single source of truth for store coordination logic                   |
| Sync/async return types match implementation | See § 1.6 — do not force `await` on inherently synchronous operations |

### 1.8 Wrapping Pattern

```
┌──────────────────────────────────────────────────────────────┐
│  External App                                                │
│  import { useElementApi } from 'cyweb/ElementApi'            │
│  const { createNode } = useElementApi()                      │
│  const result = createNode(networkId, [100, 200])            │
└────────────────────────┬─────────────────────────────────────┘
                         │  ApiResult<{ nodeId }>
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Facade Layer (src/app-api/useElementApi.ts)                 │
│  1. Validate inputs                                          │
│  2. Call internal hook                                       │
│  3. Convert result → ApiResult<T>                            │
│  4. Catch exceptions → ApiFailure                            │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Internal Hook (src/data/hooks/useCreateNode.ts)             │
│  Coordinates: NetworkStore, TableStore, ViewModelStore,      │
│  VisualStyleStore, NetworkSummaryStore, UndoStore            │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Public API via Module Federation

### 2.1 New Expose Entries

Add 9 facade entries to `webpack.config.js` `exposes`. These are the **only recommended public API** for new external apps:

```javascript
exposes: {
  // === Public Facade API (the only supported public API) ===
  './ElementApi':     './src/app-api/useElementApi.ts',
  './NetworkApi':     './src/app-api/useNetworkApi.ts',
  './SelectionApi':   './src/app-api/useSelectionApi.ts',
  './TableApi':       './src/app-api/useTableApi.ts',
  './VisualStyleApi': './src/app-api/useVisualStyleApi.ts',
  './LayoutApi':      './src/app-api/useLayoutApi.ts',
  './ViewportApi':    './src/app-api/useViewportApi.ts',
  './ExportApi':      './src/app-api/useExportApi.ts',
  './ApiTypes':       './src/app-api/types/index.ts',

  // === @deprecated — Raw stores (backward compatibility only) ===
  // These will be removed after 2 release cycles once the facade is stable.
  // Do NOT use in new apps. Use the facade API above instead.
  './CredentialStore':      './src/data/hooks/stores/CredentialStore.ts',
  './LayoutStore':          './src/data/hooks/stores/LayoutStore.ts',
  // ... (12 stores unchanged)

  // === @deprecated — Legacy task hooks (use NetworkApi instead) ===
  './CreateNetwork':        './src/data/task/useCreateNetwork.tsx',
  './CreateNetworkFromCx2': './src/data/task/useCreateNetworkFromCx2.tsx',
},
```

### 2.2 External App Usage

```typescript
// New facade API (recommended)
import { useElementApi } from 'cyweb/ElementApi'
import { useNetworkApi } from 'cyweb/NetworkApi'
import { useSelectionApi } from 'cyweb/SelectionApi'
import { useTableApi } from 'cyweb/TableApi'
import { useVisualStyleApi } from 'cyweb/VisualStyleApi'
import { useLayoutApi } from 'cyweb/LayoutApi'
import { useViewportApi } from 'cyweb/ViewportApi'
import { useExportApi } from 'cyweb/ExportApi'
import type { ApiResult, IdType, VisualPropertyName } from 'cyweb/ApiTypes'

// Legacy (deprecated)
import { useNetworkStore } from 'cyweb/NetworkStore'
```

### 2.3 API Surface Summary

| Module                 | Hook                  | Operations                                                                                                              |
| ---------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `cyweb/ElementApi`     | `useElementApi()`     | getNode, getEdge, createNode, createEdge, moveEdge, deleteNodes, deleteEdges                                            |
| `cyweb/NetworkApi`     | `useNetworkApi()`     | createNetworkFromEdgeList, createNetworkFromCx2, deleteNetwork                                                          |
| `cyweb/SelectionApi`   | `useSelectionApi()`   | exclusiveSelect, additiveSelect, additiveUnselect, toggleSelected, getSelection                                         |
| `cyweb/TableApi`       | `useTableApi()`       | getValue, getRow, createColumn, deleteColumn, setValue, setValues, editRows                                             |
| `cyweb/VisualStyleApi` | `useVisualStyleApi()` | setDefault, setBypass, createDiscreteMapping, createContinuousMapping, createPassthroughMapping                         |
| `cyweb/LayoutApi`      | `useLayoutApi()`      | applyLayout, getAvailableLayouts                                                                                        |
| `cyweb/ViewportApi`    | `useViewportApi()`    | fit, getNodePositions, updateNodePositions                                                                              |
| `cyweb/ExportApi`      | `useExportApi()`      | exportToCx2                                                                                                             |
| `cyweb/ApiTypes`       | —                     | IdType, ApiResult, ApiErrorCode, VisualPropertyName, ValueTypeName, CyNetwork, Cx2, AppContext, CyAppWithLifecycle, ... |

### 2.4 Backward Compatibility Strategy

| Aspect                      | Approach                                        |
| --------------------------- | ----------------------------------------------- |
| Existing 12 store exposures | Kept as-is, marked `@deprecated` in JSDoc       |
| Existing 2 task hooks       | Kept as-is, marked `@deprecated` in JSDoc       |
| Runtime behavior            | No change for existing consumers                |
| Migration path              | Incremental — replace one import at a time      |
| Removal timeline            | Minimum 2 release cycles after facade is stable |

### 2.5 Revised Use Case Gap Matrix

With the facade API in place, the use case coverage from Audit Section 5 changes:

| Use Case                                                                | Before             | After                                                                |
| ----------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------- |
| **A: Network Generator** — create + layout + style + fit                | Partial            | Full (`NetworkApi` + `LayoutApi` + `VisualStyleApi` + `ViewportApi`) |
| **B: Custom Layout** — read topology + compute + update positions + fit | Partial: No fit    | Full (`NetworkApi` read + `ViewportApi` + `LayoutApi`)               |
| **C: Style Modification** — mappings + bypasses                         | Partial: No types  | Full (`VisualStyleApi` + `ApiTypes` for VP names)                    |
| **D: Analysis / Annotation** — read + write attributes + select + style | Partial: No types  | Full (`TableApi` + `SelectionApi` + `VisualStyleApi`)                |
| **E: Data Import/Export** — import CX2 + export CX2                     | Partial: No export | Full (`NetworkApi` + `ExportApi`)                                    |
| **F: Graph Structure Modification** — add/remove nodes and edges        | [No]               | Full (`ElementApi` + `TableApi` + `VisualStyleApi` + `ViewportApi`)  |
| **G: LLM Agent-Driven Generation** — agent creates networks via relay   | [No]               | Full (`NetworkApi` + `ElementApi` + `LayoutApi` + `ApiTypes`)        |

### 2.6 Implementation Phases

| Phase | Scope                       | Key Files                                                                                |
| ----- | --------------------------- | ---------------------------------------------------------------------------------------- |
| 1     | Types + Element API         | `src/app-api/types/`, `src/app-api/useElementApi.ts`                                     |
| 2     | Network API                 | `src/app-api/useNetworkApi.ts`, refactor `src/data/task/useCreateNetworkFromCx2.tsx`     |
| 3     | Selection + Viewport        | `src/app-api/useSelectionApi.ts`, `src/app-api/useViewportApi.ts`                        |
| 4     | Table + Visual Style        | `src/app-api/useTableApi.ts`, `src/app-api/useVisualStyleApi.ts`                         |
| 5     | Layout + Export             | `src/app-api/useLayoutApi.ts`, `src/app-api/useExportApi.ts`                             |
| 6     | Documentation + deprecation | `src/app-api/api_docs/Api.md`, update `webpack.config.js`, mark legacy `@deprecated`     |
| 7     | App Lifecycle (Phase 3)     | `src/app-api/types/AppContext.ts`, extend `CyApp` interface, host-side lifecycle manager |

---

## 3. Wrap Target Mapping Tables

**Rev. 2 addition (2/15/2026): Wrap target mappings for all 8 facade hooks**

This section provides the internal hook/store → facade method mapping that implementers need to build each facade hook. For each facade method, the table specifies:

- Which internal hook or store method is called
- How inputs are transformed at the facade boundary
- How outputs are converted to `ApiResult<T>`
- Which error conditions map to which `ApiErrorCode`

### 3.1 Element API — `useElementApi`

**Internal targets:** `useCreateNode`, `useCreateEdge`, `useDeleteNodes`, `useDeleteEdges` (all in `src/data/hooks/`)

| Facade Method                                           | Internal Target                                                                                                                                                 | Input Transformation                                                             | Output Transformation                                                    | Error → ApiErrorCode                                                                                                                                                     |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createNode(networkId, position, options?)`             | `useCreateNode().createNode(networkId, position, {attributes, autoSelect, skipUndo: false})`                                                                    | Strip `skipUndo` — always false. Pass `attributes` and `autoSelect` from options | `CreateNodeResult.success` → `ok({nodeId})` / `fail(...)`                | `'Network ${id} not found'` → `NetworkNotFound`. Catch → `OperationFailed`                                                                                               |
| `createEdge(networkId, sourceId, targetId, options?)`   | `useCreateEdge().createEdge(networkId, sourceId, targetId, {attributes, autoSelect, skipUndo: false})`                                                          | Same as createNode                                                               | `CreateEdgeResult.success` → `ok({edgeId})` / `fail(...)`                | `'Network ... not found'` → `NetworkNotFound`. `'Source node ... not found'` → `NodeNotFound`. `'Target node ... not found'` → `NodeNotFound`. Catch → `OperationFailed` |
| `deleteNodes(networkId, nodeIds)`                       | `useDeleteNodes().deleteNodes(networkId, nodeIds, {skipUndo: false})`                                                                                           | Strip `skipUndo`                                                                 | `DeleteNodesResult.success` → `ok({deletedNodeCount, deletedEdgeCount})` | Network not found → `NetworkNotFound`. Empty array → `InvalidInput`. None exist → `NodeNotFound`. Catch → `OperationFailed`                                              |
| `deleteEdges(networkId, edgeIds)`                       | `useDeleteEdges().deleteEdges(networkId, edgeIds, {skipUndo: false})`                                                                                           | Strip `skipUndo`                                                                 | `DeleteEdgesResult.success` → `ok({deletedEdgeCount})`                   | Network not found → `NetworkNotFound`. Empty array → `InvalidInput`. None exist → `EdgeNotFound`. Catch → `OperationFailed`                                              |
| `getNode(networkId, nodeId)`                            | Direct reads: `NetworkStore.networks`, `TableStore.tables`, `ViewModelStore.viewModels`                                                                         | None — read-only                                                                 | Assemble `{attributes, position}` → `ok(NodeData)`                       | Network missing → `NetworkNotFound`. Node missing → `NodeNotFound`                                                                                                       |
| `getEdge(networkId, edgeId)`                            | Direct reads: `NetworkStore.networks`, `TableStore.tables`                                                                                                      | None — read-only                                                                 | Assemble `{sourceId, targetId, attributes}` → `ok(EdgeData)`             | Network missing → `NetworkNotFound`. Edge missing → `EdgeNotFound`                                                                                                       |
| `moveEdge(networkId, edgeId, newSourceId, newTargetId)` | **New coordination logic** (no internal hook): update `NetworkStore` edge source/target, preserve `TableStore` row and `VisualStyleStore` bypasses, record undo | Validate all IDs exist before mutation                                           | `ok()` on success                                                        | Edge missing → `EdgeNotFound`. Source/target missing → `NodeNotFound`. Catch → `OperationFailed`                                                                         |
| `generateNextNodeId(networkId)`                         | `useCreateNode().generateNextNodeId(networkId)`                                                                                                                 | None                                                                             | Return `IdType` directly (not wrapped in `ApiResult`)                    | Returns `"0"` if network not found (no error)                                                                                                                            |
| `generateNextEdgeId(networkId)`                         | `useCreateEdge().generateNextEdgeId(networkId)`                                                                                                                 | None                                                                             | Return `IdType` directly                                                 | Returns `"e0"` if network not found (no error)                                                                                                                           |

**Stores involved (6):** `NetworkStore`, `TableStore`, `ViewModelStore`, `VisualStyleStore`, `NetworkSummaryStore`, `UndoStore` (via `postEdit`)

**Undo behavior:** `createNode`, `createEdge`, `deleteNodes`, `deleteEdges` — all record undo via internal hooks. `moveEdge` — facade must call `postEdit` directly. `getNode`, `getEdge` — read-only, no undo.

**Key implementation notes:**

- Internal hooks already return `{success, error?, ...}` objects — the facade converts these to `ApiResult` without duplicating store coordination logic.
- `skipUndo` is never exposed to external apps — the facade hardcodes it to `false`.
- `moveEdge` requires new coordination logic since no internal hook exists. Must be atomic: validate all IDs, mutate edge source/target, record undo with before/after state.

---

### 3.2 Network API — `useNetworkApi`

**Internal targets:** `useCreateNetwork` (`src/data/task/`), `useCreateNetworkFromCx2` (`src/data/task/`), `useDeleteCyNetwork` (`src/data/hooks/`)

| Facade Method                        | Internal Target                                         | Input Transformation                                                                                                                                     | Output Transformation                                            | Error → ApiErrorCode                                                                                |
| ------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `createNetworkFromEdgeList(props)`   | `useCreateNetwork()(props)`                             | Pass `{name, description?, edgeList}` directly                                                                                                           | `CyNetwork` → `ok({networkId: cyNetwork.network.id, cyNetwork})` | Missing name → `InvalidInput`. Empty edge list → `InvalidInput`. Internal throw → `OperationFailed` |
| `createNetworkFromCx2(props)`        | `useCreateNetworkFromCx2()({cxData})`                   | **Add `validateCX2(cxData)` before calling internal hook.** Pass `navigate` and `addToWorkspace` options (requires refactoring internal hook — see note) | `CyNetwork` → `ok({networkId, cyNetwork})`                       | `validateCX2` fails → `InvalidCx2`. Internal throw → `OperationFailed`                              |
| `deleteNetwork(networkId, options?)` | `useDeleteCyNetwork().deleteNetwork(id, {navigate})`    | Pass `navigate` option (default: `true`)                                                                                                                 | Void → `ok()`                                                    | Network missing → `NetworkNotFound`. Catch → `OperationFailed`                                      |
| `deleteCurrentNetwork(options?)`     | `useDeleteCyNetwork().deleteCurrentNetwork({navigate})` | Pass `navigate` option                                                                                                                                   | Void → `ok()`. No-op if currentNetworkId is empty                | No current network → `NoCurrentNetwork`                                                             |
| `deleteAllNetworks()`                | `useDeleteCyNetwork().deleteAllNetworks()`              | None                                                                                                                                                     | Void → `ok()`                                                    | Catch → `OperationFailed`                                                                           |

**Stores involved:** `createNetworkFromEdgeList` → 5 stores. `createNetworkFromCx2` → 7 stores (adds `WorkspaceStore`). `deleteNetwork` → 10 stores (full cleanup).

**Internal hook refactoring required:**

- `useCreateNetworkFromCx2` currently always adds to workspace and navigates. The facade needs `navigate` and `addToWorkspace` options. Two approaches:
  1. **Preferred:** Add optional parameters to the internal hook.
  2. **Alternative:** The facade duplicates the workspace/navigation logic conditionally after calling the core hook.

**Undo behavior:** None of the network lifecycle operations record undo. Network creation and deletion are not undoable.

**Validation added by facade:**

- `createNetworkFromCx2`: Calls `validateCX2(cxData)` (from `src/models/CxModel/`) before passing to internal hook. This fixes Audit Section 4.5 (missing CX2 validation on CX2 import).
- `createNetworkFromEdgeList`: Validates `name` is non-empty and `edgeList` is non-empty.

---

### 3.3 Selection API — `useSelectionApi`

**Internal target:** `ViewModelStore` selection methods directly (no wrapper hook exists)

| Facade Method                                  | Internal Target                                                                  | Input Transformation       | Output Transformation                                   | Error → ApiErrorCode                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| `exclusiveSelect(networkId, nodeIds, edgeIds)` | `ViewModelStore.exclusiveSelect(networkId, nodeIds, edgeIds)`                    | None                       | Void → `ok()`                                           | `viewModels[networkId]` undefined → `NetworkNotFound` |
| `additiveSelect(networkId, ids)`               | `ViewModelStore.additiveSelect(networkId, ids)`                                  | None (node/edge IDs mixed) | Void → `ok()`                                           | `viewModels[networkId]` undefined → `NetworkNotFound` |
| `additiveUnselect(networkId, ids)`             | `ViewModelStore.additiveUnselect(networkId, ids)`                                | None                       | Void → `ok()`                                           | `viewModels[networkId]` undefined → `NetworkNotFound` |
| `toggleSelected(networkId, ids)`               | `ViewModelStore.toggleSelected(networkId, ids)`                                  | None                       | Void → `ok()`                                           | `viewModels[networkId]` undefined → `NetworkNotFound` |
| `getSelection(networkId)`                      | `ViewModelStore.getViewModel(networkId)` → read `selectedNodes`, `selectedEdges` | None                       | `{selectedNodes, selectedEdges}` → `ok(SelectionState)` | View model undefined → `NetworkNotFound`              |

**Stores involved (1):** `ViewModelStore` only.

**Facade validation pattern:** The facade calls `useViewModelStore.getState().getViewModel(networkId)` before each mutation. If it returns `undefined`, the facade returns `fail(ApiErrorCode.NetworkNotFound, ...)` instead of letting the store method silently no-op. This converts the store's silent-failure behavior into explicit `ApiResult` errors.

**Undo behavior:** None — selection changes are not undoable.

---

### 3.4 Table API — `useTableApi`

**Internal target:** `TableStore` methods directly (in `src/data/hooks/stores/TableStore.ts`)

| Facade Method                                                                | Internal Target                                                                        | Input Transformation                                                 | Output Transformation    | Error → ApiErrorCode                                                              |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| `getValue(networkId, tableType, elementId, column)`                          | Read `TableStore.tables[networkId].[nodeTable\|edgeTable].rows.get(elementId)[column]` | Map `tableType` → `'nodeTable'` / `'edgeTable'`                      | Value → `ok({value})`    | Table missing → `NetworkNotFound`. Row missing → `NodeNotFound` or `EdgeNotFound` |
| `getRow(networkId, tableType, elementId)`                                    | Read `TableStore.tables[networkId].[nodeTable\|edgeTable].rows.get(elementId)`         | Same                                                                 | Row record → `ok({row})` | Same                                                                              |
| `createColumn(networkId, tableType, columnName, dataType, defaultValue)`     | `TableStore.createColumn(networkId, tableType, columnName, dataType, defaultValue)`    | Pass directly                                                        | Void → `ok()`            | Table missing → `NetworkNotFound`. Catch → `OperationFailed`                      |
| `deleteColumn(networkId, tableType, columnName)`                             | `TableStore.deleteColumn(networkId, tableType, columnName)`                            | Pass directly                                                        | Void → `ok()`            | Table missing → `NetworkNotFound`. Catch → `OperationFailed`                      |
| `setColumnName(networkId, tableType, currentName, newName)`                  | `TableStore.setColumnName(networkId, tableType, currentName, newName)`                 | Pass directly                                                        | Void → `ok()`            | Table missing → `NetworkNotFound`. Catch → `OperationFailed`                      |
| `setValue(networkId, tableType, elementId, column, value)`                   | `TableStore.setValue(networkId, tableType, elementId, column, value)`                  | Pass directly                                                        | Void → `ok()`            | Table missing → `NetworkNotFound`. Catch → `OperationFailed`                      |
| `setValues(networkId, tableType, cellEdits)`                                 | `TableStore.setValues(networkId, tableType, cellEdits)`                                | Map facade `CellEdit` → store `CellEdit` (`{row→id, column, value}`) | Void → `ok()`            | Table missing → `NetworkNotFound`. Catch → `OperationFailed`                      |
| `editRows(networkId, tableType, rows)`                                       | `TableStore.editRows(networkId, tableType, rows)`                                      | Pass `Map<IdType, Record<AttributeName, ValueType>>` directly        | Void → `ok()`            | Table missing → `NetworkNotFound`. Catch → `OperationFailed`                      |
| `applyValueToElements(networkId, tableType, columnName, value, elementIds?)` | `TableStore.applyValueToElements(networkId, tableType, columnName, value, elementIds)` | Pass directly. `undefined` elementIds → apply to all                 | Void → `ok()`            | Table missing → `NetworkNotFound`. Catch → `OperationFailed`                      |

**Stores involved (1):** `TableStore` only.

**Facade validation pattern:** The facade checks `tables[networkId]` existence before every operation. The internal store methods have **inconsistent null-safety** (some fail silently, some throw on undefined) — the facade normalizes this into consistent `NetworkNotFound` errors.

**Internal inconsistency note:** The store uses both `'node' | 'edge'` string literals and `TableType` const enum for `tableType` parameters. Both resolve to the same values. The facade accepts `'node' | 'edge'` consistently and passes through directly.

**Undo behavior:** None of the `TableStore` methods record undo. If undo is needed for table edits in the future, it must be added at the facade or hook level.

---

### 3.5 Visual Style API — `useVisualStyleApi`

**Internal target:** `VisualStyleStore` methods directly (in `src/data/hooks/stores/VisualStyleStore.ts`)

| Facade Method                                                                                   | Internal Target                                                                                                  | Input Transformation | Output Transformation | Error → ApiErrorCode                                              |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------- | ----------------------------------------------------------------- |
| `setDefault(networkId, vpName, vpValue)`                                                        | `VisualStyleStore.setDefault(networkId, vpName, vpValue)`                                                        | Pass directly        | Void → `ok()`         | VS missing → `NetworkNotFound`. Catch → `OperationFailed`         |
| `setBypass(networkId, vpName, elementIds, vpValue)`                                             | `VisualStyleStore.setBypass(networkId, vpName, elementIds, vpValue)`                                             | Pass directly        | Void → `ok()`         | VS missing → `NetworkNotFound`. Empty elementIds → `InvalidInput` |
| `deleteBypass(networkId, vpName, elementIds)`                                                   | `VisualStyleStore.deleteBypass(networkId, vpName, elementIds)`                                                   | Pass directly        | Void → `ok()`         | VS missing → `NetworkNotFound`                                    |
| `createDiscreteMapping(networkId, vpName, attribute, attributeType)`                            | `VisualStyleStore.createDiscreteMapping(networkId, vpName, attribute, attributeType)`                            | Pass directly        | Void → `ok()`         | VS missing → `NetworkNotFound`                                    |
| `createContinuousMapping(networkId, vpName, vpType, attribute, attributeValues, attributeType)` | `VisualStyleStore.createContinuousMapping(networkId, vpName, vpType, attribute, attributeValues, attributeType)` | Pass directly        | Void → `ok()`         | VS missing → `NetworkNotFound`                                    |
| `createPassthroughMapping(networkId, vpName, attribute, attributeType)`                         | `VisualStyleStore.createPassthroughMapping(networkId, vpName, attribute, attributeType)`                         | Pass directly        | Void → `ok()`         | VS missing → `NetworkNotFound`                                    |
| `removeMapping(networkId, vpName)`                                                              | `VisualStyleStore.removeMapping(networkId, vpName)`                                                              | Pass directly        | Void → `ok()`         | VS missing → `NetworkNotFound`                                    |

**Stores involved (1):** `VisualStyleStore` only.

**Facade validation pattern:** The store performs **zero input validation** — if `visualStyles[networkId]` is `undefined`, the delegated `VisualStyleImpl` function receives `undefined` and may throw. The facade must check `visualStyles[networkId]` existence before every call and return `NetworkNotFound` on absence.

**Undo behavior:** None of the `VisualStyleStore` methods record undo. Visual style changes are currently not undoable.

**Store methods NOT exposed via facade:**
| Store Method | Reason |
|---|---|
| `setBypassMap` | Low-level bulk bypass — used internally by undo |
| `setDiscreteMappingValue` | Granular mapping edit — Phase 2 candidate |
| `deleteDiscreteMappingValue` | Same |
| `setContinuousMappingValues` | Same |
| `createMapping` | Generic dispatcher — facade uses typed create methods |
| `setMapping` | Low-level mapping overwrite — used internally |

---

### 3.6 Layout API — `useLayoutApi`

**Internal targets:** `LayoutStore` (engines/state), `NetworkStore` (topology), `ViewModelStore` (positions), `RendererFunctionStore` (fit)

| Facade Method                      | Internal Target                        | Input Transformation                                                                                    | Output Transformation                                        | Error → ApiErrorCode                                                                                                                                                 |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `applyLayout(networkId, options?)` | **New coordination** (see steps below) | `algorithmName` → find engine. Default: `LayoutStore.preferredLayout`. `fitAfterLayout` default: `true` | Promise resolves to `ok()` on layout complete                | Engine not found → `LayoutEngineNotFound`. Network missing → `NetworkNotFound`. Fit function missing → `FunctionNotAvailable` (warning only — layout still succeeds) |
| `getAvailableLayouts()`            | Read `LayoutStore.layoutEngines`       | None                                                                                                    | Map `LayoutEngine[]` → `LayoutAlgorithmInfo[]` → `ok(infos)` | Cannot fail — returns empty array if no engines                                                                                                                      |

**`applyLayout` execution steps (new coordination logic):**

```
1. Validate networkId → NetworkStore.networks[networkId] exists
2. Find engine:
   a. If options.algorithmName: find in LayoutStore.layoutEngines where
      engine.algorithms[algorithmName] exists
   b. Else: use LayoutStore.preferredLayout → find its engine
3. If no engine found → return fail(LayoutEngineNotFound, ...)
4. LayoutStore.setIsRunning(true)
5. Call engine.apply(network.nodes, network.edges, callback, algorithm)
6. In callback(positionMap):
   a. ViewModelStore.updateNodePositions(networkId, positionMap)
   b. If fitAfterLayout:
      - fn = RendererFunctionStore.getFunction('cyjs', 'fit', networkId)
      - If fn: fn()
      - Else: log warning (layout succeeds without fit)
   c. LayoutStore.setIsRunning(false)
   d. Resolve Promise with ok()
7. On error at any step: reject/resolve with fail(OperationFailed, ...)
```

**Stores involved (4):** `LayoutStore`, `NetworkStore`, `ViewModelStore`, `RendererFunctionStore`

**Reference implementation:** The pattern in [useRegisterNetwork.ts](src/data/hooks/useRegisterNetwork.ts) (lines 130–155) shows the existing layout execution flow and should be followed.

**Undo behavior:** Layout operations are not undoable (positions are overwritten without undo recording).

---

### 3.7 Viewport API — `useViewportApi`

**Internal targets:** `RendererFunctionStore` (fit), `ViewModelStore` (positions)

| Facade Method                               | Internal Target                                                                        | Input Transformation                                   | Output Transformation                                      | Error → ApiErrorCode                             |
| ------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------ |
| `fit(networkId)`                            | `RendererFunctionStore.getFunction('cyjs', 'fit', networkId)` → call returned function | None                                                   | Promise resolves to `ok()`                                 | Function not registered → `FunctionNotAvailable` |
| `getNodePositions(networkId, nodeIds)`      | `ViewModelStore.getViewModel(networkId)` → extract positions from `nodeViews`          | Filter to requested `nodeIds`                          | `Map<IdType, [number, number, number?]>` → `ok(positions)` | View model missing → `NetworkNotFound`           |
| `updateNodePositions(networkId, positions)` | `ViewModelStore.updateNodePositions(networkId, positions)`                             | Pass `Map<IdType, [number, number, number?]>` directly | Void → `ok()`                                              | View model missing → `NetworkNotFound`           |

**Stores involved (2):** `ViewModelStore`, `RendererFunctionStore`

**`RendererFunctionStore` lookup pattern:** Functions are registered at runtime by the CyjsRenderer component via `setFunction('cyjs', 'fit', fn, networkId)`. The store checks per-network functions first (`rendererFunctionsByNetworkId`), then global functions. If neither exists, `getFunction()` returns `undefined`.

**`fit()` returns `Promise<ApiResult>`** because `cy.fit()` may involve animation in future implementations. Currently synchronous but wrapped in Promise for API stability.

**Undo behavior:** `updateNodePositions` does not record undo. Position updates via the viewport API are not undoable (same as layout).

---

### 3.8 Export API — `useExportApi`

**Internal target:** `exportCyNetworkToCx2` (pure function in `src/models/CxModel/impl/exporter.ts`)

| Facade Method                      | Internal Target                                           | Input Transformation                                                           | Output Transformation | Error → ApiErrorCode                                                             |
| ---------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------- | -------------------------------------------------------------------------------- |
| `exportToCx2(networkId, options?)` | `exportCyNetworkToCx2(cyNetwork, summary?, networkName?)` | **Assemble `CyNetwork` from 5 stores** (see below). Pass `options.networkName` | CX2 data → `ok(cx2)`  | Any store entry missing → `NetworkNotFound`. Exporter throws → `OperationFailed` |

**CyNetwork assembly (6 store reads):**

| `CyNetwork` field         | Store                 | Access path                   |
| ------------------------- | --------------------- | ----------------------------- |
| `network`                 | `NetworkStore`        | `networks[networkId]`         |
| `nodeTable`               | `TableStore`          | `tables[networkId].nodeTable` |
| `edgeTable`               | `TableStore`          | `tables[networkId].edgeTable` |
| `visualStyle`             | `VisualStyleStore`    | `visualStyles[networkId]`     |
| `networkViews`            | `ViewModelStore`      | `[getViewModel(networkId)]`   |
| `otherAspects`            | `OpaqueAspectStore`   | `opaqueAspects[networkId]`    |
| **separately:** `summary` | `NetworkSummaryStore` | `summaries[networkId]`        |

**Stores involved (6):** `NetworkStore`, `TableStore`, `VisualStyleStore`, `ViewModelStore`, `OpaqueAspectStore`, `NetworkSummaryStore`

**Validation:** The facade checks each store entry individually and returns `NetworkNotFound` with a descriptive message on the first missing entry. This prevents the exporter from receiving `undefined` fields and throwing cryptic errors.

**Undo behavior:** Read-only — no undo concerns.

---

## 4. Facade Test Pattern Template

All facade hooks follow the same testing pattern using the project's existing conventions (Jest, `@testing-library/react`, `renderHook` + `act`).

### 4.1 Mock Strategy

```
jest.mock('../../data/hooks/stores/NetworkStore', () => ({ ... }))
jest.mock('../../data/hooks/stores/TableStore', () => ({ ... }))
jest.mock('../../data/hooks/stores/ViewModelStore', () => ({ ... }))
// etc. — mock only stores accessed by the facade hook under test
```

For facade hooks that wrap internal hooks (Element API, Network API):

```
jest.mock('../../data/hooks/useCreateNode', () => ({ ... }))
jest.mock('../../data/hooks/useDeleteNodes', () => ({ ... }))
// etc.
```

### 4.2 Test Structure Template

Each facade hook test file (`use<Domain>Api.test.ts`, co-located in `src/app-api/`) follows this structure:

```
describe('use<Domain>Api', () => {
  beforeEach(() => { /* reset mock store state */ })

  describe('<methodName>()', () => {
    it('returns ok() with correct data on success', ...)
    it('returns fail(NetworkNotFound) when network does not exist', ...)
    it('returns fail(InvalidInput) on invalid parameters', ...)
    it('returns fail(OperationFailed) when internal hook throws', ...)
    it('never exposes skipUndo to internal hooks', ...)       // Element API only
    it('calls validateCX2 before processing', ...)            // Network API CX2 only
  })
})
```

### 4.3 Test Categories Per Facade Hook

| Facade Hook         | Success Cases                                     | Error Cases                                                 | Special Cases                                                                       |
| ------------------- | ------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `useElementApi`     | CRUD operations return correct data               | NetworkNotFound, NodeNotFound, EdgeNotFound, InvalidInput   | `skipUndo` never forwarded, cascading edge deletion in deleteNodes                  |
| `useNetworkApi`     | Network creation returns `{networkId, cyNetwork}` | InvalidInput (empty name/edges), InvalidCx2                 | `validateCX2` called before `createNetworkFromCx2`, navigate/addToWorkspace options |
| `useSelectionApi`   | Selection state reads/writes                      | NetworkNotFound                                             | Silent no-op → explicit error conversion                                            |
| `useTableApi`       | Read/write operations on tables                   | NetworkNotFound, row not found                              | Inconsistent store null-safety → consistent facade errors                           |
| `useVisualStyleApi` | Mapping/bypass operations                         | NetworkNotFound                                             | Zero store validation → facade must validate                                        |
| `useLayoutApi`      | Layout completes, positions updated               | LayoutEngineNotFound, NetworkNotFound, FunctionNotAvailable | Async callback resolution, `fitAfterLayout` optional                                |
| `useViewportApi`    | Fit, position read/write                          | FunctionNotAvailable, NetworkNotFound                       | `fit()` returns Promise                                                             |
| `useExportApi`      | CX2 assembly from 6 stores                        | NetworkNotFound (any store entry)                           | Multi-store assembly validation                                                     |

---

## 5. Per-Phase File Lists

Concrete file creation/modification list for each implementation phase.

### Phase 1 (Step 0): Foundation Types

_Fully specified in [phase1a-shared-types-design.md](phase1a-shared-types-design.md)_

| Action | File                                           |
| ------ | ---------------------------------------------- |
| Create | `src/app-api/types/ApiResult.ts`               |
| Create | `src/app-api/types/ApiResult.test.ts`          |
| Create | `src/app-api/types/AppContext.ts`              |
| Create | `src/app-api/types/ElementTypes.ts`            |
| Create | `src/app-api/types/index.ts`                   |
| Create | `src/app-api/index.ts`                         |
| Create | `src/app-api/api_docs/Api.md`                  |
| Modify | `webpack.config.js` — add `'./ApiTypes'` entry |

### Phase 1a: Element API

| Action | File                                | Notes                                                                                                   |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Create | `src/app-api/useElementApi.ts`      | Wraps `useCreateNode`, `useCreateEdge`, `useDeleteNodes`, `useDeleteEdges`. New `moveEdge` coordination |
| Create | `src/app-api/useElementApi.test.ts` | Tests per § 4.3                                                                                         |
| Modify | `src/app-api/index.ts`              | Uncomment `useElementApi` export                                                                        |
| Modify | `src/app-api/types/AppContext.ts`   | Uncomment `element: ElementApi` in `AppContext.apis`                                                    |
| Modify | `webpack.config.js`                 | Add `'./ElementApi'` entry                                                                              |

### Phase 1b: Network API

| Action | File                                        | Notes                                                                     |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------- |
| Create | `src/app-api/useNetworkApi.ts`              | Wraps `useCreateNetwork`, `useCreateNetworkFromCx2`, `useDeleteCyNetwork` |
| Create | `src/app-api/useNetworkApi.test.ts`         | Tests per § 4.3                                                           |
| Modify | `src/data/task/useCreateNetworkFromCx2.tsx` | Add `navigate` and `addToWorkspace` options                               |
| Modify | `src/app-api/index.ts`                      | Uncomment `useNetworkApi` export                                          |
| Modify | `src/app-api/types/AppContext.ts`           | Uncomment `network: NetworkApi`                                           |
| Modify | `webpack.config.js`                         | Add `'./NetworkApi'` entry                                                |

### Phase 1c: Selection + Viewport

| Action | File                                  | Notes                                             |
| ------ | ------------------------------------- | ------------------------------------------------- |
| Create | `src/app-api/useSelectionApi.ts`      | Wraps `ViewModelStore` selection methods          |
| Create | `src/app-api/useSelectionApi.test.ts` |                                                   |
| Create | `src/app-api/useViewportApi.ts`       | Wraps `RendererFunctionStore` + `ViewModelStore`  |
| Create | `src/app-api/useViewportApi.test.ts`  |                                                   |
| Modify | `src/app-api/index.ts`                | Uncomment both exports                            |
| Modify | `src/app-api/types/AppContext.ts`     | Uncomment `selection`, `viewport`                 |
| Modify | `webpack.config.js`                   | Add `'./SelectionApi'`, `'./ViewportApi'` entries |

### Phase 1d: Table + Visual Style

| Action | File                                    | Notes                                            |
| ------ | --------------------------------------- | ------------------------------------------------ |
| Create | `src/app-api/useTableApi.ts`            | Wraps `TableStore` methods                       |
| Create | `src/app-api/useTableApi.test.ts`       |                                                  |
| Create | `src/app-api/useVisualStyleApi.ts`      | Wraps `VisualStyleStore` methods                 |
| Create | `src/app-api/useVisualStyleApi.test.ts` |                                                  |
| Modify | `src/app-api/index.ts`                  | Uncomment both exports                           |
| Modify | `src/app-api/types/AppContext.ts`       | Uncomment `table`, `visualStyle`                 |
| Modify | `webpack.config.js`                     | Add `'./TableApi'`, `'./VisualStyleApi'` entries |

### Phase 1e: Layout + Export

| Action | File                               | Notes                                                                          |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------ |
| Create | `src/app-api/useLayoutApi.ts`      | **New coordination logic** — see § 3.6 execution steps                         |
| Create | `src/app-api/useLayoutApi.test.ts` |                                                                                |
| Create | `src/app-api/useExportApi.ts`      | Multi-store CyNetwork assembly + exporter call                                 |
| Create | `src/app-api/useExportApi.test.ts` |                                                                                |
| Modify | `src/app-api/index.ts`             | Uncomment both exports                                                         |
| Modify | `src/app-api/types/AppContext.ts`  | Uncomment `layout`, `export`. All fields now required                          |
| Modify | `webpack.config.js`                | Add `'./LayoutApi'`, `'./ExportApi'` entries. Mark legacy stores `@deprecated` |
| Modify | `src/app-api/api_docs/Api.md`      | Complete facade hook documentation                                             |

---

## 6. Internal Store Validation Gap Summary

The following table summarizes the validation behavior of each internal store. The facade must compensate for these gaps by performing input validation before every store call.

| Store                   | Null-check on `networkId`                                                        | Input validation | Failure mode on missing data                                        |
| ----------------------- | -------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| `NetworkStore`          | ✅ (returns `undefined` from `networks.get()`)                                   | None             | Safe — returns `undefined`                                          |
| `TableStore`            | ⚠️ Inconsistent — `setValue`/`setValues` check, `createColumn`/`editRows` do not | None             | Throws on missing `networkId` (some methods), silent no-op (others) |
| `ViewModelStore`        | ✅ All selection/position methods guard                                          | None             | Silent no-op (returns unchanged state)                              |
| `VisualStyleStore`      | ❌ Zero null-checks                                                              | None             | Passes `undefined` to `VisualStyleImpl` → may throw                 |
| `RendererFunctionStore` | ✅ `getFunction` returns `undefined` safely                                      | None             | Safe — returns `undefined`                                          |
| `LayoutStore`           | N/A (no per-network state)                                                       | None             | Safe — state is global                                              |
| `OpaqueAspectStore`     | ✅ (simple record lookup)                                                        | None             | Returns `undefined`                                                 |
| `NetworkSummaryStore`   | ✅ (simple record lookup)                                                        | None             | Returns `undefined`                                                 |

**Facade rule:** Always check store state existence _before_ calling mutation methods. Never rely on store-level null-safety.
