# Facade API Specification

**Rev. 1 (2/12/2026): Keiichiro ONO and Claude Code w/ Opus 4.6**

Detailed design for the facade API layer. For priorities and roadmap, see [module-federation-design.md](module-federation-design.md). For the audit of the current system, see [module-federation-audit.md](module-federation-audit.md).

---

## 1. Facade Layer Design

### 1.1 Overview

The facade layer at `src/data/api/` is the **sole public API** for external apps. Rather than exposing internal stores or hooks directly, the facade defines a stable contract that external apps program against. This ensures that internal refactoring (store splits, hook reorganization, etc.) never breaks the external API.

Each facade hook wraps existing internal hooks or store actions, providing:

- Input validation at the boundary before any store mutation
- Consistent `ApiResult<T>` return types (no thrown exceptions cross the facade)
- Internal-only options (`skipUndo`) hidden from external callers
- Side-effect control via explicit options

The facade does **not** duplicate store coordination logic. It delegates to existing internal hooks (`src/data/hooks/`) and converts their results. Internal stores and hooks are created or modified as needed to support the facade, but are never independently exposed via Module Federation.

### 1.2 Directory Structure

```
src/data/api/
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
// src/data/api/types/ApiResult.ts

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

`src/data/api/types/ElementTypes.ts` re-exports key model types so external apps import from the API module rather than internal model paths:

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
// src/data/api/useElementApi.ts

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
// src/data/api/useNetworkApi.ts

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
// src/data/api/useSelectionApi.ts

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
// src/data/api/useTableApi.ts

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
// src/data/api/useVisualStyleApi.ts

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
// src/data/api/useLayoutApi.ts

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
// src/data/api/useViewportApi.ts

interface ViewportApi {
  fit(networkId: IdType): ApiResult

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

- **`fit()`**: Retrieves and calls `RendererFunctionStore.getFunction('cyjs', 'fit', networkId)`. Returns `FunctionNotAvailable` error if the renderer function is not registered.
- **`getNodePositions()`**: Reads positions from `ViewModelStore.getViewModel(networkId)`. Returns `NetworkNotFound` if the view model does not exist. Returns positions for only the requested node IDs.

#### 1.5.8 Export API

Wraps: `exportCyNetworkToCx2` from `src/models/CxModel/impl/exporter.ts`

```typescript
// src/data/api/useExportApi.ts

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
// src/data/api/types/AppContext.ts

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

### 1.6 Design Rules

| Rule                                      | Rationale                                                  |
| ----------------------------------------- | ---------------------------------------------------------- |
| `skipUndo` is never exposed externally    | Prevents external apps from corrupting the undo stack      |
| All exceptions caught → `ApiFailure`      | External apps never need try/catch around facade calls     |
| Validate inputs before any store mutation | Prevents partial state updates on invalid input            |
| Options with sensible defaults            | Minimize required parameters; opt-in for advanced behavior |
| Facade hooks wrap, never duplicate        | Single source of truth for store coordination logic        |

### 1.7 Wrapping Pattern

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
│  Facade Layer (src/data/api/useElementApi.ts)                │
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
  './ElementApi':     './src/data/api/useElementApi.ts',
  './NetworkApi':     './src/data/api/useNetworkApi.ts',
  './SelectionApi':   './src/data/api/useSelectionApi.ts',
  './TableApi':       './src/data/api/useTableApi.ts',
  './VisualStyleApi': './src/data/api/useVisualStyleApi.ts',
  './LayoutApi':      './src/data/api/useLayoutApi.ts',
  './ViewportApi':    './src/data/api/useViewportApi.ts',
  './ExportApi':      './src/data/api/useExportApi.ts',
  './ApiTypes':       './src/data/api/types/index.ts',

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

| Phase | Scope                       | Key Files                                                                                 |
| ----- | --------------------------- | ----------------------------------------------------------------------------------------- |
| 1     | Types + Element API         | `src/data/api/types/`, `src/data/api/useElementApi.ts`                                    |
| 2     | Network API                 | `src/data/api/useNetworkApi.ts`, refactor `src/data/task/useCreateNetworkFromCx2.tsx`     |
| 3     | Selection + Viewport        | `src/data/api/useSelectionApi.ts`, `src/data/api/useViewportApi.ts`                       |
| 4     | Table + Visual Style        | `src/data/api/useTableApi.ts`, `src/data/api/useVisualStyleApi.ts`                        |
| 5     | Layout + Export             | `src/data/api/useLayoutApi.ts`, `src/data/api/useExportApi.ts`                            |
| 6     | Documentation + deprecation | `src/data/api/api_docs/Api.md`, update `webpack.config.js`, mark legacy `@deprecated`     |
| 7     | App Lifecycle (Phase 3)     | `src/data/api/types/AppContext.ts`, extend `CyApp` interface, host-side lifecycle manager |
