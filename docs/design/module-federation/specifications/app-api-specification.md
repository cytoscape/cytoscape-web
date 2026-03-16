# App API Specification

**Rev. 2 (2/15/2026): Keiichiro ONO and Claude Code w/ Opus 4.6**

Detailed design for the app API (External App API) layer. For priorities and roadmap, see [module-federation-design.md](../module-federation-design.md). For the audit of the current system, see [module-federation-audit.md](../module-federation-audit.md).

---

## 1. App API Layer Design

### 1.1 Overview

The app API layer at `src/app-api/` is the **sole public API** for external apps. Rather than
exposing internal stores or hooks directly, the app API defines a stable contract that external apps
program against. This ensures that internal refactoring (store splits, hook reorganization, etc.)
never breaks the external API.

**Two-layer design (see [ADR 0003](../../../../docs/adr/0003-framework-agnostic-core-layer.md)):**

```
src/app-api/core/<domain>Api.ts    Framework-agnostic pure functions
                                   • Uses useXxxStore.getState() — no React context required
                                   • Implements validation, store coordination, ApiResult wrapping
                                   • Assembled into window.CyWebApi in src/init.tsx

src/app-api/use<Domain>Api.ts      React Hook wrapper (ultra-thin)
                                   • Returns the core object: () => domainApi
                                   • Exposed via Module Federation for React app consumers
```

This split enables two access paths with identical semantics:

| Consumer                         | Access path                                        |
| -------------------------------- | -------------------------------------------------- |
| React app via Module Federation  | `import { useElementApi } from 'cyweb/ElementApi'` |
| Browser extension content script | `window.CyWebApi.element.createNode(...)`          |
| LLM agent bridge (vanilla JS)    | `window.CyWebApi.element.createNode(...)`          |

Each app API domain provides:

- Input validation at the boundary before any store mutation
- Consistent `ApiResult<T>` return types (no thrown exceptions cross the app API boundary)
- Internal-only options (`skipUndo`) hidden from external callers
- Side-effect control via explicit options

The app API does **not** duplicate store coordination logic. Core functions in `src/app-api/core/`
coordinate stores directly via `useXxxStore.getState()`, replicating the coordination logic of
internal hooks without calling them as React hooks. Internal stores and hooks are created or
modified as needed to support the app API, but are never independently exposed via Module
Federation.

### 1.2 Directory Structure

```
src/app-api/
├── api_docs/
│   └── Api.md                     # Behavioral documentation
├── types/
│   ├── ApiResult.ts               # ApiResult<T>, ApiError, ApiErrorCode
│   ├── AppContext.ts              # AppContext, CyAppWithLifecycle
│   ├── ElementTypes.ts            # Curated re-exports of public model types
│   └── index.ts                   # Barrel export
├── core/                          # Framework-agnostic domain logic (no React)
│   ├── elementApi.ts              # Node/edge CRUD — plain functions
│   ├── networkApi.ts              # Network lifecycle — plain functions
│   ├── selectionApi.ts            # Selection operations — plain functions
│   ├── tableApi.ts                # Table data operations — plain functions
│   ├── visualStyleApi.ts          # Visual style operations — plain functions
│   ├── layoutApi.ts               # Layout execution — plain functions; dispatches layout:started / layout:completed events
│   ├── viewportApi.ts             # Viewport control — plain functions
│   ├── exportApi.ts               # CX2 export — plain functions
│   ├── workspaceApi.ts            # Workspace state reads + network switching — plain functions
│   └── index.ts                   # Assembles CyWebApi; assigned to window.CyWebApi in init.tsx
├── event-bus/                     # Event bus — Phase 1 Step 2 (see event-bus-specification.md)
│   ├── CyWebEvents.ts             # CyWebEvents interface + CyWebEventMap type
│   ├── dispatchCyWebEvent.ts      # Generic dispatchCyWebEvent<K> helper (used by initEventBus + layoutApi)
│   └── initEventBus.ts            # Zustand subscriptions — internal, NOT exposed via Module Federation
├── useElementApi.ts               # React Hook: returns elementApi (~1 line)
├── useNetworkApi.ts               # React Hook: returns networkApi (~1 line)
├── useSelectionApi.ts             # React Hook: returns selectionApi (~1 line)
├── useTableApi.ts                 # React Hook: returns tableApi (~1 line)
├── useVisualStyleApi.ts           # React Hook: returns visualStyleApi (~1 line)
├── useLayoutApi.ts                # React Hook: returns layoutApi (~1 line)
├── useViewportApi.ts              # React Hook: returns viewportApi (~1 line)
├── useExportApi.ts                # React Hook: returns exportApi (~1 line)
├── useWorkspaceApi.ts             # React Hook: returns workspaceApi (~1 line)
├── useCyWebEvent.ts               # React Hook: typed window.addEventListener wrapper — exposed as cyweb/EventBus
└── index.ts                       # Barrel export
```

### 1.3 Shared Result Types

All app API operations return `ApiResult<T>`, a discriminated union:

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

// Shared type alias used by ViewportApi and any consumer that serializes positions.
// Record (not Map) is used to guarantee JSON serializability across all access paths.
type PositionRecord = Record<IdType, [number, number, number?]>

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
  ContextMenuItemNotFound: 'CONTEXT_MENU_ITEM_NOT_FOUND',
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

### 1.5 App API Hook Specifications

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
  /** Visual property bypasses applied atomically at creation. @default undefined */
  bypass?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>
  autoSelect?: boolean // default: true
}

interface CreateEdgeOptions {
  attributes?: Record<AttributeName, ValueType>
  /** Visual property bypasses applied atomically at creation. @default undefined */
  bypass?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>
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

const useElementApi: () => ElementApi // React hook — returns elementApi from core/
```

**Implementation location:** `src/app-api/core/elementApi.ts`

**Implementation strategy (core functions — no React, uses `.getState()`):**

- **`getNode`**: Reads attributes from `TableStore.getState()` and position from `ViewModelStore.getState()`. Validates node existence in `NetworkStore.getState()`. Returns `NodeNotFound` if the node does not exist.
- **`getEdge`**: Reads source/target from `NetworkStore.getState()` and attributes from `TableStore.getState()`. Returns `EdgeNotFound` if the edge does not exist.
- **`createNode` / `createEdge`**: Coordinates `NetworkStore`, `TableStore`, `ViewModelStore`, `VisualStyleStore`, `NetworkSummaryStore`, `UndoStore` directly via `.getState()`, replicating the logic of `useCreateNode()` / `useCreateEdge()`. The `skipUndo` option is never passed — undo always records. If `options.bypass` is non-empty, `visualStyleApi.setBypass()` is called immediately after element creation so that bypass values are applied atomically in the same operation.
- **`moveEdge`**: Atomically updates an edge's source and/or target node using Cytoscape.js's native `edge.move()` on the headless core. This preserves the edge ID, so all data keyed by edge ID — table row attributes, visual style bypasses, and edge views — remains intact without any migration. Only the network topology store is mutated. A new `MOVE_EDGES` undo command records `(networkId, edgeId, oldSource, oldTarget)` for rollback. Returns `EdgeNotFound` or `NodeNotFound` on invalid IDs. See [§ 3.1.1](#311-moveedge--detailed-implementation-design) for the full implementation design.

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

const useNetworkApi: () => NetworkApi // React hook — returns networkApi from core/
```

**Implementation location:** `src/app-api/core/networkApi.ts`

**Implementation strategy (core functions — no React, uses `.getState()`):**

- `createNetworkFromEdgeList`: Coordinates stores directly via `.getState()`, replicating the logic of the `useCreateNetwork` task hook. Catches errors, returns `ApiResult`.
- `createNetworkFromCx2`: **Adds `validateCX2()` before processing** (fixes Audit Section 4.5 bug). Coordinates stores directly, replicating `useCreateNetworkFromCx2` with support for `navigate` and `addToWorkspace` options (fixes Audit Section 4.6).
- `deleteNetwork` / `deleteCurrentNetwork` / `deleteAllNetworks`: Coordinates stores directly, replicating the logic of `useDeleteCyNetwork`.

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

const useSelectionApi: () => SelectionApi // React hook — returns selectionApi from core/
```

**Implementation location:** `src/app-api/core/selectionApi.ts`

**Implementation strategy (core functions — no React, uses `.getState()`):** Validates networkId existence via `ViewModelStore.getState().getViewModel()`, then delegates to `ViewModelStore.getState()` actions.

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
    rows: Record<IdType, Record<AttributeName, ValueType>>,
  ): ApiResult

  applyValueToElements(
    networkId: IdType,
    tableType: TableType,
    columnName: string,
    value: ValueType,
    elementIds?: IdType[],
  ): ApiResult
}

const useTableApi: () => TableApi // React hook — returns tableApi from core/
```

**Implementation location:** `src/app-api/core/tableApi.ts`

**Implementation strategy (core functions — no React, uses `.getState()`):**

- **`getValue` / `getRow`**: Reads directly from `TableStore.getState().tables[networkId]`. Validates table and element existence. Returns `NetworkNotFound` if the table does not exist.
- **Write operations**: Validates `tables[networkId]` existence via `TableStore.getState()`, then calls `TableStore.getState()` actions directly. Adds column existence checks for operations on existing columns.

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

const useVisualStyleApi: () => VisualStyleApi // React hook — returns visualStyleApi from core/
```

**Implementation location:** `src/app-api/core/visualStyleApi.ts`

**Implementation strategy (core functions — no React, uses `.getState()`):** Validates `visualStyles[networkId]` existence via `VisualStyleStore.getState()`, then calls `VisualStyleStore.getState()` actions directly.

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

const useLayoutApi: () => LayoutApi // React hook — returns layoutApi from core/
```

**Implementation location:** `src/app-api/core/layoutApi.ts`

**Implementation strategy (core functions — no React, uses `.getState()`):** New coordination logic with no equivalent internal hook:

1. Read `LayoutStore.getState().layoutEngines` to find the engine
2. Read `NetworkStore.getState().networks` to get topology
3. Call `LayoutEngine.apply(nodes, edges, callback, algorithm)` asynchronously
4. In callback: `ViewModelStore.getState().updateNodePositions(networkId, positionMap)`
5. If `fitAfterLayout`: `RendererFunctionStore.getState().getFunction('cyjs', 'fit', networkId)()`
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
  ): ApiResult<{ positions: PositionRecord }>

  updateNodePositions(networkId: IdType, positions: PositionRecord): ApiResult
}

const useViewportApi: () => ViewportApi // React hook — returns viewportApi from core/
```

**Implementation location:** `src/app-api/core/viewportApi.ts`

**Implementation strategy (core functions — no React, uses `.getState()`):**

- **`fit()`**: Retrieves and calls `RendererFunctionStore.getState().getFunction('cyjs', 'fit', networkId)`. Returns `Promise<ApiResult>` because Cytoscape.js `cy.fit()` may involve animation; wrapping in a Promise future-proofs against animated transitions. Returns `FunctionNotAvailable` error if the renderer function is not registered.
- **`getNodePositions()`**: Reads positions from `ViewModelStore.getState().getViewModel(networkId)`. Returns `NetworkNotFound` if the view model does not exist. Returns positions for only the requested node IDs.

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

const useExportApi: () => ExportApi // React hook — returns exportApi from core/
```

**Implementation location:** `src/app-api/core/exportApi.ts`

**Implementation strategy (core functions — no React, uses `.getState()`):** Gathers `CyNetwork` data from `NetworkStore.getState()`, `TableStore.getState()`, `VisualStyleStore.getState()`, `ViewModelStore.getState()`, `OpaqueAspectStore.getState()`. Reads `NetworkSummary` from `NetworkSummaryStore.getState()`. Passes to the pure function `exportCyNetworkToCx2()`.

#### 1.5.9 App Lifecycle API

**New contract** — extends the `CyApp` interface with lifecycle callbacks.
**Phase: 1g** (moved from Phase 3; implemented after Phase 1f once all domain APIs are assembled).

```typescript
// src/app-api/types/AppContext.ts

interface AppContext {
  /** The unique ID of this app instance */
  appId: string

  /**
   * All app API instances — same singleton as window.CyWebApi at runtime.
   * Typed as CyWebApiType to make the relationship explicit.
   */
  apis: CyWebApiType  // imported from '../core'
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

**Implementation strategy (Phase 1g):**

- `AppContext.apis` is typed as `CyWebApiType` and set to `CyWebApi` (from `src/app-api/core`) — the same singleton as `window.CyWebApi`. No React context or separate instantiation is needed.
- The host (`src/data/hooks/stores/useAppManager.ts`) calls `mount({ appId: cyApp.id, apis: CyWebApi })` after `registerApp(cyApp)`, if the app implements `CyAppWithLifecycle.mount`.
- The host calls `unmount()` when the app is deactivated or the page is unloading (`beforeunload`). The host guarantees `unmount()` is always called for apps where `mount` was invoked.
- Both callbacks are optional — existing apps without lifecycle methods continue to work unchanged.
- If `mount()` returns a `Promise`, the host awaits it before marking the app as ready.
- `AppContext` and `CyAppWithLifecycle` types are exported via `cyweb/ApiTypes`.

#### 1.5.10 Workspace API

Reads: `WorkspaceStore.workspace` and `NetworkSummaryStore.summaries`

```typescript
// src/app-api/useWorkspaceApi.ts

interface WorkspaceInfo {
  workspaceId: IdType
  name: string
  currentNetworkId: IdType   // '' when no networks are open
  networkCount: number
}

interface WorkspaceNetworkInfo {
  networkId: IdType
  name: string
  description: string
  nodeCount: number
  edgeCount: number
  isModified: boolean        // true when the network has unsaved local changes
}

interface WorkspaceApi {
  // --- Read ---

  /** Returns workspace metadata (id, name, current network id, count). */
  getWorkspaceInfo(): ApiResult<WorkspaceInfo>

  /** Returns the ordered list of network IDs in the workspace. */
  getNetworkIds(): ApiResult<{ networkIds: IdType[] }>

  /**
   * Returns summary metadata for all networks in the workspace.
   * Networks whose summary is not found in NetworkSummaryStore are silently omitted.
   */
  getNetworkList(): ApiResult<WorkspaceNetworkInfo[]>

  /**
   * Returns summary metadata for a single network.
   * fail(NetworkNotFound) if networkId is not in the workspace.
   */
  getNetworkSummary(networkId: IdType): ApiResult<WorkspaceNetworkInfo>

  /**
   * Returns the currently active network ID.
   * fail(NoCurrentNetwork) if no networks are open.
   */
  getCurrentNetworkId(): ApiResult<{ networkId: IdType }>

  // --- Write ---

  /**
   * Switches the active network.
   * Fires the 'network:switched' event via the existing initEventBus subscription.
   * fail(NetworkNotFound) if networkId is not in the workspace.
   * fail(InvalidInput) if networkId is empty.
   */
  switchCurrentNetwork(networkId: IdType): ApiResult

  /**
   * Renames the workspace.
   * fail(InvalidInput) if name is empty or whitespace-only.
   */
  setWorkspaceName(name: string): ApiResult
}

const useWorkspaceApi: () => WorkspaceApi // React hook — returns workspaceApi from core/
```

**Implementation location:** `src/app-api/core/workspaceApi.ts`

**Implementation strategy (core functions — no React, uses `.getState()`):**

- **`getWorkspaceInfo`**: Reads `WorkspaceStore.getState().workspace`. Always succeeds.
- **`getNetworkIds`**: Returns `[...workspace.networkIds]` (shallow copy to prevent mutation).
- **`getNetworkList`**: Joins `workspace.networkIds` with `NetworkSummaryStore.getState().summaries`. Networks with no summary entry are silently omitted; callers should not assume all IDs in `getNetworkIds()` have summaries.
- **`getNetworkSummary`**: Validates `networkId ∈ workspace.networkIds` before reading the summary. Returns `NetworkNotFound` if either check fails.
- **`getCurrentNetworkId`**: Returns `NoCurrentNetwork` when `workspace.networkIds.length === 0 || workspace.currentNetworkId === ''`.
- **`switchCurrentNetwork`**: Validates `networkId ∈ workspace.networkIds`, then calls `WorkspaceStore.getState().setCurrentNetworkId(networkId)`. The `network:switched` event is dispatched automatically by the existing `initEventBus` Zustand subscription — no explicit dispatch is needed here.
- **`setWorkspaceName`**: Validates `name.trim() !== ''`, then calls `WorkspaceStore.getState().setName(name.trim())`.

#### 1.5.11 Context Menu API

Extends the host's context menu with app-registered items. Apps can add items to node, edge, or canvas background context menus and remove them when the app unmounts.

> **Phase 2 update:** `cyweb/ContextMenuApi` and `useContextMenuApi()` were deleted.
> Context menu access is now per-app via `AppContext.apis.contextMenu` in `mount()` or
> `useAppContext().apis.contextMenu` in plugin components. The anonymous singleton on
> `window.CyWebApi.contextMenu` remains for non-React consumers.

```typescript
// src/app-api/core/contextMenuApi.ts

interface ContextMenuTarget {
  type: 'node' | 'edge' | 'canvas'
  /** Present for node/edge; absent for canvas targets. */
  id?: IdType
  networkId: IdType
}

interface ContextMenuItemConfig {
  /** Display label shown in the context menu. Must be non-empty. */
  label: string
  /** Callback invoked when the user clicks the item. */
  handler: (target: ContextMenuTarget) => void
  /**
   * Which context menus this item appears in.
   * @default ['node', 'edge']
   */
  targetTypes?: Array<'node' | 'edge' | 'canvas'>
}

interface ContextMenuApi {
  addContextMenuItem(config: ContextMenuItemConfig): ApiResult<{ itemId: string }>
  removeContextMenuItem(itemId: string): ApiResult
}

// Per-app factory — items carry bound appId, auto-cleaned on app disable
function createContextMenuApi(appId: string): ContextMenuApi

// Anonymous singleton — for window.CyWebApi only (no auto-cleanup)
const contextMenuApi: ContextMenuApi
```

**Two access paths:**

| Path | Factory | Auto-cleanup | Use case |
|------|---------|-------------|----------|
| `context.apis.contextMenu` | `createContextMenuApi(appId)` | Yes — `removeAllByAppId` on disable | Plugin apps in `mount()` or components |
| `window.CyWebApi.contextMenu` | anonymous singleton | No — items persist until explicit removal | Browser console, extensions |

Items registered via the per-app factory carry `appId` and are automatically
removed when the app is disabled (via `AppCleanupRegistry`). Explicit removal
in `unmount()` is redundant but harmless.

**Host store:** `ContextMenuItemStore` has `removeAllByAppId(appId)` which skips
items with `appId === undefined` (anonymous singleton items).

### 1.6 Sync/Async Policy

App API operations use a **mixed sync/async** return type strategy based on the nature of the underlying implementation. The decision criteria are:

| Criterion                                                                                     | Return Type             | Rationale                                                                        |
| --------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| Pure store reads/writes (state update is immediate; IndexedDB persistence is fire-and-forget) | `ApiResult<T>`          | No reason to force `await` on callers when the operation completes synchronously |
| Callback-based async processing (layout engines, renderer operations)                         | `Promise<ApiResult<T>>` | The operation genuinely completes later; callers must `await`                    |
| External I/O (network requests, file operations)                                              | `Promise<ApiResult<T>>` | Inherently async                                                                 |
| Operations likely to be moved to Web Workers in the future                                    | `Promise<ApiResult<T>>` | Avoids a breaking change when the implementation becomes async                   |

**Classification of all app API operations:**

| Return Type                  | Operations                                                                                                                                                                                                                                                                                                                                                                                                                | Internal Mechanism                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ApiResult<T>` (sync)        | `createNode`, `createEdge`, `deleteNodes`, `deleteEdges`, `getNode`, `getEdge`, `moveEdge`, `createNetworkFromEdgeList`, `createNetworkFromCx2`, `deleteNetwork`, `exclusiveSelect`, `additiveSelect`, `getSelection`, `getValue`, `getRow`, `createColumn`, `setValue`, `setValues`, `setDefault`, `setBypass`, `createDiscreteMapping`, `getNodePositions`, `updateNodePositions`, `getAvailableLayouts`, `exportToCx2`, `getWorkspaceInfo`, `getNetworkIds`, `getNetworkList`, `getNetworkSummary`, `getCurrentNetworkId`, `switchCurrentNetwork`, `setWorkspaceName`, `addContextMenuItem`, `removeContextMenuItem` | Zustand store read/write — state mutation is synchronous; IndexedDB persistence runs asynchronously but is not awaited                                      |
| `Promise<ApiResult>` (async) | `applyLayout`                                                                                                                                                                                                                                                                                                                                                                                                             | `LayoutEngine.apply()` is callback-based (CyjsLayout listens for `layoutstop` event; CosmosLayout uses a timer)                                             |
| `Promise<ApiResult>` (async) | `fit`                                                                                                                                                                                                                                                                                                                                                                                                                     | `RendererFunctionStore` delegates to Cytoscape.js `cy.fit()`, which may involve animation; wrapping in a Promise future-proofs against animated transitions |

**Stability guarantee:** Changing a synchronous operation to `Promise<ApiResult<T>>` is a **breaking change** for callers (they must add `await`). App API operations are classified conservatively — if there is a reasonable expectation that the underlying implementation will become asynchronous, the operation returns `Promise` from the start.

### 1.7 Design Rules

| Rule                                             | Rationale                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `skipUndo` is never exposed externally           | Prevents external apps from corrupting the undo stack                                                                                                                                                                                                                                                 |
| All exceptions caught → `ApiFailure`             | External apps never need try/catch around app API calls                                                                                                                                                                                                                                               |
| Validate inputs before any store mutation        | Prevents partial state updates on invalid input                                                                                                                                                                                                                                                       |
| Options with sensible defaults                   | Minimize required parameters; opt-in for advanced behavior                                                                                                                                                                                                                                            |
| Core functions do not call internal React hooks  | Ensures `core/` is usable outside React context (browser extensions, LLM bridges)                                                                                                                                                                                                                     |
| `core/` has zero React imports                   | Enforced by linting or code review; violation breaks non-React consumers                                                                                                                                                                                                                              |
| Hook wrappers contain no domain logic            | All logic lives in `core/`; hooks are identity wrappers                                                                                                                                                                                                                                               |
| All API inputs and outputs are JSON-serializable | `Map`, `Set`, class instances, and functions must not appear in the public API surface. Use `Record<K, V>` for key-value structures (`PositionRecord`, `editRows` rows). This guarantees that `window.CyWebApi` responses can be relayed through WebSocket, `postMessage`, or MCP without conversion. |
| Sync/async return types match implementation     | See § 1.6 — do not force `await` on inherently synchronous operations                                                                                                                                                                                                                                 |

### 1.8 Wrapping Pattern

Two access paths, one implementation:

```
┌─────────────────────────────────┐   ┌──────────────────────────────────┐
│  React App (Module Federation)  │   │  Vanilla JS / Browser Extension  │
│  import { useElementApi }       │   │  window.CyWebApi.element         │
│    from 'cyweb/ElementApi'      │   │    .createNode(networkId, ...)    │
│  const { createNode } =         │   └──────────────┬───────────────────┘
│    useElementApi()              │                  │
│  const result =                 │                  │  same object
│    createNode(networkId, ...)   │                  │
└─────────────┬───────────────────┘                  │
              │ (~1 line wrapper)                    │
              ▼                                      │
┌─────────────────────────────────┐                  │
│  React Hook Wrapper             │                  │
│  src/app-api/useElementApi.ts   │                  │
│  export const useElementApi =   │                  │
│    (): ElementApi => elementApi ├──────────────────┘
└─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Core Functions (src/app-api/core/elementApi.ts)             │
│  No React imports. Uses useXxxStore.getState().              │
│                                                              │
│  createNode(networkId, position, options):                   │
│    1. Validate inputs via .getState()                        │
│    2. Coordinate stores directly via .getState()             │
│    3. Return ApiResult<T>                                    │
│    4. Catch exceptions → ApiFailure                          │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Zustand Stores (via .getState(), no React subscription)     │
│  NetworkStore, TableStore, ViewModelStore,                   │
│  VisualStyleStore, NetworkSummaryStore, UndoStore            │
└──────────────────────────────────────────────────────────────┘
```

### 1.9 Versioning Strategy

The App API employs an **Evergreen (Backward Compatible)** versioning strategy. This approach ensures that external apps continue to function without modification as Cytoscape Web evolves, while avoiding the complexity of maintaining multiple parallel API versions.

**Key Principles:**

1. **No Version Numbers in Paths:** Module Federation import paths (`cyweb/ElementApi`) and the global object (`window.CyWebApi.element`) do not contain version numbers (e.g., no `v1`).
2. **Additive Changes Only:** The API evolves exclusively through additive changes:
   - Adding new functions to existing domain APIs.
   - Adding new _optional_ arguments to existing functions. Optional arguments must always be added as properties of a trailing options object (never as positional arguments), so that existing call sites remain valid without modification.
3. **Deprecation over Deletion:** Existing functions and required arguments are never removed or changed in a breaking way. If a function must be replaced, it is marked with the `@deprecated` JSDoc tag (with a migration path) and kept functional internally, while a new function is introduced.
4. **Feature Detection:** External apps should use feature detection rather than version checking to determine if a specific API capability is available in the host environment:
   ```javascript
   const elementApi = useElementApi()
   if (typeof elementApi.newFeature === 'function') {
     elementApi.newFeature()
   }
   ```
5. **API Version Property:** For debugging and logging purposes only, the `CyWebApi` global object exposes a `version` property. This version is always identical to the published `@cytoscape-web/api-types` npm package version (e.g., `window.CyWebApi.version === '0.1.0-alpha.0'` during the alpha phase, `'1.0.0'` at stable release). It is intended for debugging and logging purposes only — external apps must use feature detection (see principle 4) rather than version comparisons for conditional logic. This version follows Semantic Versioning (SemVer). The version progression and digit meanings are defined as follows:

   | Phase | Version range | Meaning |
   | ----- | ------------- | ------- |
   | Alpha (Phase 0 → Phase 5) | `0.1.0-alpha.0` … `0.x.y-alpha.z` | Pre-stable; API surface is still growing |
   | Stable release (Phase 6 complete) | `1.0.0` | Full API surface finalized, evergreen guarantees apply |

   Once stable (`1.0.0`+), the digit semantics are:

   | Digit | Meaning | Example |
   | ----- | ------- | ------- |
   | Patch | Bug fixes or internal changes with no API surface change | `1.0.1` |
   | Minor | New function added to an existing domain API, or new domain API added | `1.1.0` |
   | Major | Removal of previously deprecated symbols (rare, after minimum 2 release cycles) | `2.0.0` |

---

## 2. Public API via Module Federation

### 2.1 New Expose Entries

Add 10 app API entries to `webpack.config.js` `exposes`. These are the **only recommended public API** for new external apps:

```javascript
exposes: {
  // === Public App API (the only supported public API) ===
  './ElementApi':     './src/app-api/useElementApi.ts',
  './NetworkApi':     './src/app-api/useNetworkApi.ts',
  './SelectionApi':   './src/app-api/useSelectionApi.ts',
  './TableApi':       './src/app-api/useTableApi.ts',
  './VisualStyleApi': './src/app-api/useVisualStyleApi.ts',
  './LayoutApi':      './src/app-api/useLayoutApi.ts',
  './ViewportApi':    './src/app-api/useViewportApi.ts',
  './ExportApi':      './src/app-api/useExportApi.ts',
  './WorkspaceApi':   './src/app-api/useWorkspaceApi.ts',
  './ApiTypes':       './src/app-api/types/index.ts',

  // === @deprecated — Raw stores (backward compatibility only) ===
  // These will be removed after 2 release cycles once the app API is stable.
  // Do NOT use in new apps. Use the app API above instead.
  './CredentialStore':      './src/data/hooks/stores/CredentialStore.ts',
  './LayoutStore':          './src/data/hooks/stores/LayoutStore.ts',
  // ... (12 stores unchanged)

  // === @deprecated — Legacy task hooks (use NetworkApi instead) ===
  './CreateNetwork':        './src/data/task/useCreateNetwork.tsx',
  './CreateNetworkFromCx2': './src/data/task/useCreateNetworkFromCx2.tsx',
},
```

### 2.2 External App Usage

**React app via Module Federation (recommended for React consumers):**

```typescript
import { useElementApi } from 'cyweb/ElementApi'
import { useNetworkApi } from 'cyweb/NetworkApi'
import { useSelectionApi } from 'cyweb/SelectionApi'
import { useTableApi } from 'cyweb/TableApi'
import { useVisualStyleApi } from 'cyweb/VisualStyleApi'
import { useLayoutApi } from 'cyweb/LayoutApi'
import { useViewportApi } from 'cyweb/ViewportApi'
import { useExportApi } from 'cyweb/ExportApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import type { ApiResult, IdType, VisualPropertyName } from 'cyweb/ApiTypes'

// Usage inside a React component or hook:
const MyComponent = () => {
  const { createNode } = useElementApi()
  const result = createNode(networkId, [100, 200])
  if (result.success) console.log(result.data.nodeId)
}
```

**Vanilla JS / browser extension content script (no React, no Module Federation):**

```typescript
// window.CyWebApi is available after Cytoscape Web initializes
const api = window.CyWebApi

const result = api.element.createNode(networkId, [100, 200])
if (result.success) console.log(result.data.nodeId)

const layoutResult = await api.layout.applyLayout(networkId, {
  algorithmName: 'force-directed',
})
if (!layoutResult.success) console.error(layoutResult.error.code)
```

**Legacy (deprecated):**

```typescript
import { useNetworkStore } from 'cyweb/NetworkStore'
```

### 2.3 API Surface Summary

| Access path         | Module / Property         | Hook / Object         | Operations                                                                                                              |
| ------------------- | ------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Module Federation   | `cyweb/ElementApi`        | `useElementApi()`     | getNode, getEdge, createNode, createEdge, moveEdge, deleteNodes, deleteEdges                                            |
| Module Federation   | `cyweb/NetworkApi`        | `useNetworkApi()`     | createNetworkFromEdgeList, createNetworkFromCx2, deleteNetwork                                                          |
| Module Federation   | `cyweb/SelectionApi`      | `useSelectionApi()`   | exclusiveSelect, additiveSelect, additiveUnselect, toggleSelected, getSelection                                         |
| Module Federation   | `cyweb/TableApi`          | `useTableApi()`       | getValue, getRow, createColumn, deleteColumn, setValue, setValues, editRows                                             |
| Module Federation   | `cyweb/VisualStyleApi`    | `useVisualStyleApi()` | setDefault, setBypass, createDiscreteMapping, createContinuousMapping, createPassthroughMapping                         |
| Module Federation   | `cyweb/LayoutApi`         | `useLayoutApi()`      | applyLayout, getAvailableLayouts                                                                                        |
| Module Federation   | `cyweb/ViewportApi`       | `useViewportApi()`    | fit, getNodePositions, updateNodePositions                                                                              |
| Module Federation   | `cyweb/ExportApi`         | `useExportApi()`      | exportToCx2                                                                                                             |
| Module Federation   | `cyweb/WorkspaceApi`      | `useWorkspaceApi()`   | getWorkspaceInfo, getNetworkIds, getNetworkList, getNetworkSummary, getCurrentNetworkId, switchCurrentNetwork, setWorkspaceName |
| Module Federation   | `cyweb/EventBus`          | `useCyWebEvent()`     | Subscribe to typed window events (network, selection, layout, style, data)                                              |
| Module Federation   | `cyweb/ApiTypes`          | —                     | IdType, ApiResult, ApiErrorCode, VisualPropertyName, ValueTypeName, CyNetwork, Cx2, WorkspaceInfo, WorkspaceNetworkInfo, AppContext, CyAppWithLifecycle, ... |
| Global (vanilla JS) | `window.CyWebApi.element` | plain object          | Same as ElementApi operations                                                                                           |
| Global (vanilla JS) | `window.CyWebApi.network` | plain object          | Same as NetworkApi operations                                                                                           |
| Global (vanilla JS) | `window.CyWebApi.layout`  | plain object          | Same as LayoutApi operations                                                                                            |
| Global (vanilla JS) | `window.CyWebApi.workspace` | plain object        | Same as WorkspaceApi operations                                                                                         |
| Global (vanilla JS) | `window.CyWebApi.*`       | plain object          | All 9 domain APIs — same operations, same `ApiResult<T>` returns                                                        |

### 2.4 Backward Compatibility Strategy

| Aspect                      | Approach                                         |
| --------------------------- | ------------------------------------------------ |
| Existing 12 store exposures | Kept as-is, marked `@deprecated` in JSDoc        |
| Existing 2 task hooks       | Kept as-is, marked `@deprecated` in JSDoc        |
| Runtime behavior            | No change for existing consumers                 |
| Migration path              | Incremental — replace one import at a time       |
| Removal timeline            | Minimum 2 release cycles after Phase 6 is complete (documentation + deprecation markers in place) |

### 2.5 Revised Use Case Gap Matrix

With the app API in place, the use case coverage from Audit Section 5 changes:

| Use Case                                                                | Before             | After                                                                |
| ----------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------- |
| **A: Network Generator** — create + layout + style + fit                | Partial            | Full (`NetworkApi` + `LayoutApi` + `VisualStyleApi` + `ViewportApi`) |
| **B: Custom Layout** — read topology + compute + update positions + fit | Partial: No fit    | Full (`NetworkApi` read + `ViewportApi` + `LayoutApi`)               |
| **C: Style Modification** — mappings + bypasses                         | Partial: No types  | Full (`VisualStyleApi` + `ApiTypes` for VP names)                    |
| **D: Analysis / Annotation** — read + write attributes + select + style | Partial: No types  | Full (`TableApi` + `SelectionApi` + `VisualStyleApi`)                |
| **E: Data Import/Export** — import CX2 + export CX2                     | Partial: No export | Full (`NetworkApi` + `ExportApi`)                                    |
| **F: Graph Structure Modification** — add/remove nodes and edges        | [No]               | Full (`ElementApi` + `TableApi` + `VisualStyleApi` + `ViewportApi`)  |
| **G: LLM Agent-Driven Generation** — agent creates networks via relay   | [No]               | Full (`NetworkApi` + `ElementApi` + `LayoutApi` + `ApiTypes`)        |
| **H: Workspace Browsing** — list open networks, display names/counts, switch active network | [No] | Full (`WorkspaceApi`) |

### 2.6 Implementation Phases

Each phase produces **two** files per domain: `src/app-api/core/<domain>Api.ts` (core functions,
plain Jest tests) and `src/app-api/use<Domain>Api.ts` (thin hook wrapper).

| Phase | Scope                       | Key Files                                                                                                                  |
| ----- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1     | Types + Element API         | `src/app-api/types/`, `src/app-api/core/elementApi.ts`, `src/app-api/useElementApi.ts`                                     |
| 2     | Network API                 | `src/app-api/core/networkApi.ts`, `src/app-api/useNetworkApi.ts`, refactor `src/data/task/useCreateNetworkFromCx2.tsx`     |
| 3     | Selection + Viewport        | `src/app-api/core/selectionApi.ts`, `src/app-api/core/viewportApi.ts`, hook wrappers                                       |
| 4     | Table + Visual Style        | `src/app-api/core/tableApi.ts`, `src/app-api/core/visualStyleApi.ts`, hook wrappers                                        |
| 5     | Layout + Export             | `src/app-api/core/layoutApi.ts`, `src/app-api/core/exportApi.ts`, hook wrappers                                            |
| 5.5   | Global assembly             | `src/app-api/core/index.ts` (CyWebApi object), `window.CyWebApi` assignment in `src/init.tsx`                              |
| 6     | Workspace API               | `src/app-api/core/workspaceApi.ts`, `src/app-api/useWorkspaceApi.ts`, add `workspace` to `CyWebApi`                        |
| 1g    | App Lifecycle (Phase 1g)    | `src/data/hooks/stores/useAppManager.ts` wiring; `AppContext.apis` typed as `CyWebApiType`; `mount`/`unmount` tests        |
| 1a+   | Element bypass              | `bypass` field on `CreateNodeOptions` + `CreateEdgeOptions`; atomic create+bypass in `core/elementApi.ts`                  |
| 1h    | Context Menu API (Phase 1h) | `src/data/hooks/stores/ContextMenuItemStore.ts`; `core/contextMenuApi.ts` (factory + singleton); host UI wiring. `useContextMenuApi.ts` deleted in Phase 2. |
| 7     | Documentation + deprecation | `src/app-api/api_docs/Api.md`, update `webpack.config.js`, mark legacy `@deprecated`                                       |

### 2.7 `window.CyWebApi` Global API

`window.CyWebApi` is a singleton object assembled from the 9 core domain objects. It is assigned in
`src/init.tsx` after all Zustand stores are initialized.

```typescript
// src/app-api/core/index.ts
import { contextMenuApi } from './contextMenuApi'
import { elementApi } from './elementApi'
import { exportApi } from './exportApi'
import { layoutApi } from './layoutApi'
import { networkApi } from './networkApi'
import { selectionApi } from './selectionApi'
import { tableApi } from './tableApi'
import { viewportApi } from './viewportApi'
import { visualStyleApi } from './visualStyleApi'
import { workspaceApi } from './workspaceApi'

export const CyWebApi = {
  version: '0.1.0-alpha.0' as string, // Synced with @cytoscape-web/api-types; cast to string so `as const` does not widen to a literal type. Reaches '1.0.0' at stable release (Phase 6 complete).
  element: elementApi,
  network: networkApi,
  selection: selectionApi,
  table: tableApi,
  visualStyle: visualStyleApi,
  layout: layoutApi,
  viewport: viewportApi,
  export: exportApi,
  workspace: workspaceApi,
  contextMenu: contextMenuApi,
} as const

export type CyWebApiType = typeof CyWebApi
```

```typescript
// src/init.tsx (add after enableMapSet() and store initialization)
import { CyWebApi } from './app-api/core'

declare global {
  interface Window {
    CyWebApi: CyWebApiType
  }
}

window.CyWebApi = CyWebApi
// Optional: signal readiness for consumers that wait for initialization
window.dispatchEvent(new CustomEvent('cywebapi:ready'))
```

#### Two-phase readiness

`window.CyWebApi` is assigned in `src/init.tsx`, but not all operations are immediately usable:

| Phase            | Event                     | Available operations                                            | Not yet available |
| ---------------- | ------------------------- | --------------------------------------------------------------- | ----------------- |
| App initialized  | `cywebapi:ready`          | element, network, selection, table, visualStyle, layout, export, workspace, contextMenu | `viewport.fit()`  |
| Renderer mounted | `cywebapi:renderer-ready` | All operations                                                  | —                 |

`viewport.fit()` requires the Cytoscape.js renderer to be registered in `RendererFunctionStore`.
This happens after React renders the first network view, which is later than `cywebapi:ready`. If
called before the renderer is ready, `fit()` returns `fail(ApiErrorCode.FunctionNotAvailable, ...)`.

```typescript
// src/init.tsx
window.CyWebApi = CyWebApi
window.dispatchEvent(
  new CustomEvent('cywebapi:ready', {
    detail: {
      version: '1.0',
      capabilities: [
        'element',
        'network',
        'selection',
        'table',
        'visualStyle',
        'layout',
        'export',
        'workspace',
        'contextMenu',
      ],
    },
  }),
)

// src/features/NetworkPanel/CyjsRenderer/ — add after renderer registers its functions:
window.dispatchEvent(
  new CustomEvent('cywebapi:renderer-ready', {
    detail: { networkId },
  }),
)
```

**Consumer readiness guard:**

```javascript
function onApiReady(callback) {
  if (window.CyWebApi) {
    callback(window.CyWebApi)
  } else {
    window.addEventListener('cywebapi:ready', () => callback(window.CyWebApi), {
      once: true,
    })
  }
}
```

#### JSON serialization guarantee

All `window.CyWebApi` inputs and outputs are JSON-serializable. The public API surface contains no
`Map`, `Set`, class instances, or functions. Key choices driven by this rule:

| Operation                 | Type used                                          | Why not `Map`                                   |
| ------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| `getNodePositions` return | `Record<IdType, [number, number, number?]>`        | `Map` serializes to `"{}"` via `JSON.stringify` |
| `updateNodePositions` arg | `Record<IdType, [number, number, number?]>`        | Same; bridge would need manual conversion       |
| `editRows` arg            | `Record<IdType, Record<AttributeName, ValueType>>` | Same                                            |

Bridge implementations (MCP server, browser extension relay) can send `ApiResult<T>` objects
directly to `JSON.stringify` without preprocessing.

#### Type distribution for non-Module-Federation consumers

Browser extensions and other vanilla JS consumers need TypeScript types for `window.CyWebApi`.
The `@cytoscape-web/api-types` npm package (see module-federation-design.md § 1.3+) will
provide these. The package is not yet published; `0.1.0-alpha.0` will be released at the end of
Phase 0, once the public type surface in `src/app-api/types/` is finalized. Until then,
consumers can declare a minimal ambient declaration:

```typescript
// In the consuming project (e.g., browser extension): global.d.ts
import type { CyWebApiType } from '@cytoscape-web/api-types'
declare global {
  interface Window {
    CyWebApi: CyWebApiType
  }
}
```

#### `AppContext` relationship (Phase 1g)

`AppContext.apis` is a direct reference to `window.CyWebApi` — not a new set of instances
created inside React context. The host (`useAppManager.ts`) passes `CyWebApi` directly:

```typescript
// Phase 1g host-side lifecycle wiring (useAppManager.ts)
mount({ appId: app.id, apis: CyWebApi })  // CyWebApi imported from src/app-api/core
```

`AppContext.apis` is typed as `CyWebApiType` (the same interface as `window.CyWebApi`) to make
this relationship explicit. Both refer to the same singleton object at runtime.

#### Security model

`window.CyWebApi` is intentionally accessible to any JavaScript running on the page, including
third-party scripts and browser extensions. This is by design:

- Operations available via `window.CyWebApi` are equivalent to what a user can do via the UI
- No authentication or token is required — access model matches the UI
- External I/O (NDEx upload, file download) is NOT exposed via the app API; those operations remain
  inside Cytoscape Web's own UI layer
- The undo stack protection (`skipUndo: false` is hardcoded) prevents silent history corruption
- Maximum blast radius: local session state within the current browser tab

**TypeScript declarations for external consumers (e.g., browser extension):**

```typescript
// remotes.d.ts in the extension project
declare global {
  interface Window {
    CyWebApi: {
      element: import('cyweb/ElementApi').ElementApi
      network: import('cyweb/NetworkApi').NetworkApi
      layout: import('cyweb/LayoutApi').LayoutApi
      // ... other domains
    }
  }
}
```

---

## 3. Wrap Target Mapping Tables

**Rev. 2 addition (2/15/2026): Wrap target mappings for all 8 app API hooks**
**Rev. 3 note (2/19/2026): Core functions do not call internal hooks**

Core functions in `src/app-api/core/` coordinate stores directly via `useXxxStore.getState()`.
The "Wraps:" annotations in each section header indicate the equivalent internal hook whose logic
is replicated — core functions do **not** call these hooks directly (they require React context).

This section provides the store coordination mapping that implementers need to build each core
function file. For each app API method, the table specifies:

- Which internal hook or store method is called
- How inputs are transformed at the app API boundary
- How outputs are converted to `ApiResult<T>`
- Which error conditions map to which `ApiErrorCode`

### 3.1 Element API — `useElementApi`

**Internal targets:** `useCreateNode`, `useCreateEdge`, `useDeleteNodes`, `useDeleteEdges` (all in `src/data/hooks/`)

| App API Method                                          | Internal Target                                                                                                                                                 | Input Transformation                                                             | Output Transformation                                                    | Error → ApiErrorCode                                                                                                                                                     |
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

**Undo behavior:** `createNode`, `createEdge`, `deleteNodes`, `deleteEdges` — all record undo via internal hooks. `moveEdge` — app API must call `postEdit` directly. `getNode`, `getEdge` — read-only, no undo.

**Key implementation notes:**

- Internal hooks already return `{success, error?, ...}` objects — the app API converts these to `ApiResult` without duplicating store coordination logic.
- `skipUndo` is never exposed to external apps — the app API hardcodes it to `false`.
- `moveEdge` requires new coordination logic since no internal hook exists. Must be atomic: validate all IDs, mutate edge source/target, record undo with before/after state.

#### 3.1.1 `moveEdge` — Detailed Implementation Design

`moveEdge` is the only Element API operation that requires new internal infrastructure (no existing hook wraps this operation). This section specifies every file change, the execution steps, the undo/redo integration, and the data preservation guarantees.

##### Why Core API (Not User-Side Utility)

A user-side `deleteEdge` + `createEdge` approach **cannot preserve data**:

| Aspect                 | delete + create                                   | Core `moveEdge`                                      |
| ---------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Edge ID                | Changes (old ID lost, new sequential ID assigned) | Preserved                                            |
| Table attributes       | Lost (old row deleted, new row gets defaults)     | Preserved (row keyed by edge ID)                     |
| Visual style bypasses  | Lost (deleted with old edge, no read API to copy) | Preserved (bypass `Map<IdType, T>` keyed by edge ID) |
| Edge view state        | Lost (old view removed, new default view created) | Preserved (keyed by edge ID)                         |
| Undo history           | Two separate entries (delete + create)            | Single atomic entry                                  |
| External ID references | Dangling (apps holding old ID break)              | Stable                                               |

The bypass loss is structurally unrecoverable: the current app API has no `getBypass` read method, so external apps cannot extract bypasses before deletion.

##### Internal Mechanism: Cytoscape.js `edge.move()`

The internal graph storage is a headless Cytoscape.js `Core` instance inside `NetworkImpl` (`src/models/NetworkModel/impl/networkImpl.ts`). Cytoscape.js natively supports `edge.move({ source?, target? })`, which atomically changes an edge's endpoints while preserving its identity (ID, data, classes). This is the correct primitive to use.

**The `Edge` interface is `readonly`:**

```typescript
interface Edge extends GraphObject {
  readonly s: IdType // source
  readonly t: IdType // target
}
```

This is a read-only projection extracted dynamically from the Cytoscape.js core via `edge.source().id()` / `edge.target().id()`. Mutating the Cytoscape.js edge via `edge.move()` causes subsequent reads of the `Network.edges` getter to reflect the new source/target — no interface change is needed.

##### Files to Create or Modify

| Action | File                                          | Change                                                                 |
| ------ | --------------------------------------------- | ---------------------------------------------------------------------- |
| Modify | `src/models/NetworkModel/impl/networkImpl.ts` | Add `moveEdge(network, edgeId, newSourceId, newTargetId)` function     |
| Modify | `src/models/NetworkModel/index.ts`            | Re-export `moveEdge` in the `NetworkFn` barrel                         |
| Modify | `src/models/StoreModel/NetworkStoreModel.ts`  | Add `moveEdge` to `NetworkUpdateActions` interface                     |
| Modify | `src/data/hooks/stores/NetworkStore.ts`       | Add `moveEdge` action implementation                                   |
| Modify | `src/models/StoreModel/UndoStoreModel.ts`     | Add `MOVE_EDGES` to `UndoCommandType`                                  |
| Modify | `src/data/hooks/useUndoStack.tsx`             | Add undo/redo handlers for `MOVE_EDGES`                                |
| Create | `src/app-api/core/elementApi.ts` (Phase 1a)   | All element operations; `moveEdge` using the above coordination logic  |
| Create | `src/app-api/useElementApi.ts` (Phase 1a)     | Thin hook: `export const useElementApi = (): ElementApi => elementApi` |

##### 1. Model Layer: `networkImpl.ts`

Add a new exported function:

```typescript
// src/models/NetworkModel/impl/networkImpl.ts

/**
 * Move an edge to new source and/or target nodes.
 * Uses Cytoscape.js edge.move() to preserve the edge ID and all
 * associated data (table rows, bypasses, views are keyed by edge ID).
 *
 * @param network - Network containing the edge
 * @param edgeId - ID of the edge to move
 * @param newSourceId - New source node ID
 * @param newTargetId - New target node ID
 * @returns The previous source and target IDs (for undo recording)
 * @throws Error if edge or nodes do not exist in the network
 */
export const moveEdge = (
  network: Network,
  edgeId: IdType,
  newSourceId: IdType,
  newTargetId: IdType,
): { oldSourceId: IdType; oldTargetId: IdType } => {
  const networkImpl = network as NetworkImpl
  const store = networkImpl.store
  const edge = store.$id(edgeId)

  if (edge.empty()) {
    throw new Error(`Edge ${edgeId} not found in network ${network.id}`)
  }

  const oldSourceId = edge.source().id()
  const oldTargetId = edge.target().id()

  // Validate new endpoints exist
  if (store.$id(newSourceId).empty()) {
    throw new Error(
      `Source node ${newSourceId} not found in network ${network.id}`,
    )
  }
  if (store.$id(newTargetId).empty()) {
    throw new Error(
      `Target node ${newTargetId} not found in network ${network.id}`,
    )
  }

  // Cytoscape.js edge.move() atomically updates source/target
  edge.move({ source: newSourceId, target: newTargetId })

  return { oldSourceId, oldTargetId }
}
```

**Key properties of `edge.move()`:**

- Preserves the edge's ID — `edge.id()` remains the same after the call
- Synchronous — no callback or promise
- The edge remains in the same Cytoscape.js core instance
- Subsequent reads of `Network.edges` (which maps from `edge.source().id()` / `edge.target().id()`) reflect the new endpoints immediately

##### 2. Model Barrel Export: `NetworkModel/index.ts`

Add `moveEdge` to the re-exports. The barrel export uses `import * as NetworkFn` pattern, so the new function is automatically included.

##### 3. Store Model: `NetworkStoreModel.ts`

Add to the `NetworkUpdateActions` interface:

```typescript
export interface NetworkUpdateActions {
  // ... existing actions ...

  /**
   * Move an edge to new source and/or target nodes.
   * Preserves edge ID, table rows, bypasses, and views.
   *
   * @returns The previous source and target IDs (for undo recording)
   */
  moveEdge: (
    networkId: IdType,
    edgeId: IdType,
    newSourceId: IdType,
    newTargetId: IdType,
  ) => { oldSourceId: IdType; oldTargetId: IdType }
}
```

##### 4. Store Implementation: `NetworkStore.ts`

Add the `moveEdge` action:

```typescript
moveEdge: (networkId, edgeId, newSourceId, newTargetId) => {
  const network = get().networks.get(networkId)
  if (network === undefined) {
    throw new Error(`Network ${networkId} not found`)
  }
  const result = NetworkFn.moveEdge(
    network,
    edgeId,
    newSourceId,
    newTargetId,
  )

  // Trigger reactivity — the network reference is the same (mutation),
  // but lastUpdated signals the change to subscribers
  set((state) => {
    state.lastUpdated = {
      networkId,
      type: UpdateEventType.ADD, // Topology changed
      payload: [edgeId],
    }
  })

  return result
},
```

##### 5. Undo Integration: `UndoStoreModel.ts` + `useUndoStack.tsx`

**Add to `UndoCommandType`:**

```typescript
export const UndoCommandType = {
  // ... existing commands ...
  MOVE_EDGES: 'MOVE_EDGES',
} as const
```

**Undo handler** (reverse the move — restore old source/target):

```typescript
[UndoCommandType.MOVE_EDGES]: (params: any[]) => {
  const networkId: IdType = params[0]
  const edgeId: IdType = params[1]
  const oldSourceId: IdType = params[2]
  const oldTargetId: IdType = params[3]

  useNetworkStore
    .getState()
    .moveEdge(networkId, edgeId, oldSourceId, oldTargetId)
},
```

**Redo handler** (re-apply the move):

```typescript
[UndoCommandType.MOVE_EDGES]: (params: any[]) => {
  const networkId: IdType = params[0]
  const edgeId: IdType = params[1]
  const newSourceId: IdType = params[2]
  const newTargetId: IdType = params[3]

  useNetworkStore
    .getState()
    .moveEdge(networkId, edgeId, newSourceId, newTargetId)
},
```

**Undo/redo params:**

|          | Params                                          |
| -------- | ----------------------------------------------- |
| **Undo** | `[networkId, edgeId, oldSourceId, oldTargetId]` |
| **Redo** | `[networkId, edgeId, newSourceId, newTargetId]` |

##### 6. Core Implementation: `src/app-api/core/elementApi.ts`

```typescript
moveEdge(
  networkId: IdType,
  edgeId: IdType,
  newSourceId: IdType,
  newTargetId: IdType,
): ApiResult {
  try {
    // 1. Validate network exists
    const network = useNetworkStore.getState().networks.get(networkId)
    if (network === undefined) {
      return fail(
        ApiErrorCode.NetworkNotFound,
        `Network ${networkId} not found`,
      )
    }

    // 2. Validate edge exists
    const edgeExists = network.edges.some((e) => e.id === edgeId)
    if (!edgeExists) {
      return fail(
        ApiErrorCode.EdgeNotFound,
        `Edge ${edgeId} not found in network ${networkId}`,
      )
    }

    // 3. Validate new source node exists
    const sourceExists = network.nodes.some((n) => n.id === newSourceId)
    if (!sourceExists) {
      return fail(
        ApiErrorCode.NodeNotFound,
        `Source node ${newSourceId} not found in network ${networkId}`,
      )
    }

    // 4. Validate new target node exists
    const targetExists = network.nodes.some((n) => n.id === newTargetId)
    if (!targetExists) {
      return fail(
        ApiErrorCode.NodeNotFound,
        `Target node ${newTargetId} not found in network ${networkId}`,
      )
    }

    // 5. Execute move (preserves edge ID — table rows, bypasses,
    //    views unaffected)
    const { oldSourceId, oldTargetId } = useNetworkStore
      .getState()
      .moveEdge(networkId, edgeId, newSourceId, newTargetId)

    // 6. Update table: source/target columns in edge table
    //    if they exist
    const tables = useTableStore.getState().tables.get(networkId)
    if (tables !== undefined) {
      const edgeTable = tables.edgeTable
      const row = edgeTable.rows.get(edgeId)
      if (row !== undefined) {
        const updatedRow = new Map<
          IdType,
          Record<AttributeName, ValueType>
        >()
        updatedRow.set(edgeId, {
          ...row,
          source: newSourceId,
          target: newTargetId,
        })
        useTableStore
          .getState()
          .editRows(networkId, 'edge', updatedRow)
      }
    }

    // 7. Record undo
    postEdit(
      UndoCommandType.MOVE_EDGES,
      `Move edge ${edgeId}`,
      [networkId, edgeId, oldSourceId, oldTargetId], // undo params
      [networkId, edgeId, newSourceId, newTargetId], // redo params
    )

    return ok()
  } catch (e) {
    return fail(
      ApiErrorCode.OperationFailed,
      `Failed to move edge: ${String(e)}`,
    )
  }
},
```

**Thin hook wrapper** — `src/app-api/useElementApi.ts` is a single line that returns the core object:

```typescript
// src/app-api/useElementApi.ts
import { elementApi } from './core/elementApi'
import type { ElementApi } from './types'

export const useElementApi = (): ElementApi => elementApi
```

##### Stores Involved

| Store                 | Role                                               | Mutated?                                      |
| --------------------- | -------------------------------------------------- | --------------------------------------------- |
| `NetworkStore`        | Edge topology (`edge.move()` on Cytoscape.js core) | **Yes**                                       |
| `TableStore`          | Update `source`/`target` columns in edge table row | **Yes** (conditional — only if columns exist) |
| `ViewModelStore`      | Edge view keyed by edge ID                         | No — preserved automatically                  |
| `VisualStyleStore`    | Bypass map (`Map<IdType, T>`) keyed by edge ID     | No — preserved automatically                  |
| `NetworkSummaryStore` | Edge count unchanged                               | No                                            |
| `UndoStore`           | Record `MOVE_EDGES` undo entry via `postEdit`      | **Yes**                                       |

##### Data Preservation Guarantees

| Data                            | Key                              | Preserved? | Reason                                   |
| ------------------------------- | -------------------------------- | ---------- | ---------------------------------------- |
| Edge ID                         | —                                | Yes        | `edge.move()` preserves identity         |
| Table row (all attributes)      | `edgeTable.rows.get(edgeId)`     | Yes        | Edge ID unchanged; row remains in Map    |
| `source`/`target` table columns | `row['source']`, `row['target']` | Updated    | App API explicitly updates these columns |
| Visual style bypasses           | `bypassMap.get(edgeId)` per VP   | Yes        | Edge ID unchanged; Map entries remain    |
| Edge view                       | `edgeViews[edgeId]`              | Yes        | Edge ID unchanged                        |
| Undo history                    | `MOVE_EDGES` command             | Yes        | Single atomic undo entry                 |

##### Edge Cases

| Case                                | Behavior                                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| Move to same source/target (no-op)  | Succeeds — `edge.move()` is idempotent. Still records undo.                             |
| Move only source (target unchanged) | Pass current target as `newTargetId`. No partial-move API to keep the interface simple. |
| Self-loop (source === target)       | Allowed — Cytoscape.js supports self-loops.                                             |
| Edge ID not in edge table           | `moveEdge` still succeeds at the topology level. Table update is conditional.           |
| Concurrent modifications            | Same as all store operations — last-write-wins within the synchronous Zustand dispatch. |

##### Test Outline

```
describe('moveEdge', () => {
  it('returns ok() and updates edge endpoints', ...)
  it('preserves table row attributes after move', ...)
  it('preserves visual style bypasses after move', ...)
  it('updates source/target columns in edge table', ...)
  it('records MOVE_EDGES undo entry', ...)
  it('undo restores original source/target', ...)
  it('returns EdgeNotFound when edge does not exist', ...)
  it('returns NodeNotFound when new source does not exist', ...)
  it('returns NodeNotFound when new target does not exist', ...)
  it('returns NetworkNotFound when network does not exist', ...)
  it('handles self-loop (source === target)', ...)
  it('handles no-op move (same endpoints)', ...)
})
```

##### Estimated Scope

| Layer                                           | Files Modified | Lines Added (approx.) |
| ----------------------------------------------- | -------------- | --------------------- |
| Model (`networkImpl.ts` + barrel)               | 2              | ~30                   |
| Store model (`NetworkStoreModel.ts`)            | 1              | ~8                    |
| Store impl (`NetworkStore.ts`)                  | 1              | ~15                   |
| Undo (`UndoStoreModel.ts` + `useUndoStack.tsx`) | 2              | ~20                   |
| Core app API (`core/elementApi.ts`)             | 1              | ~50                   |
| Hook wrapper (`useElementApi.ts`)               | 1              | ~5                    |
| Tests (`core/elementApi.test.ts`)               | 1              | ~80                   |
| **Total**                                       | **9**          | **~205**              |

---

### 3.2 Network API — `useNetworkApi`

**Internal targets:** `useCreateNetwork` (`src/data/task/`), `useCreateNetworkFromCx2` (`src/data/task/`), `useDeleteCyNetwork` (`src/data/hooks/`)

| App API Method                       | Internal Target                                         | Input Transformation                                                                                                                                     | Output Transformation                                            | Error → ApiErrorCode                                                                                |
| ------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `createNetworkFromEdgeList(props)`   | `useCreateNetwork()(props)`                             | Pass `{name, description?, edgeList}` directly                                                                                                           | `CyNetwork` → `ok({networkId: cyNetwork.network.id, cyNetwork})` | Missing name → `InvalidInput`. Empty edge list → `InvalidInput`. Internal throw → `OperationFailed` |
| `createNetworkFromCx2(props)`        | `useCreateNetworkFromCx2()({cxData})`                   | **Add `validateCX2(cxData)` before calling internal hook.** Pass `navigate` and `addToWorkspace` options (requires refactoring internal hook — see note) | `CyNetwork` → `ok({networkId, cyNetwork})`                       | `validateCX2` fails → `InvalidCx2`. Internal throw → `OperationFailed`                              |
| `deleteNetwork(networkId, options?)` | `useDeleteCyNetwork().deleteNetwork(id, {navigate})`    | Pass `navigate` option (default: `true`)                                                                                                                 | Void → `ok()`                                                    | Network missing → `NetworkNotFound`. Catch → `OperationFailed`                                      |
| `deleteCurrentNetwork(options?)`     | `useDeleteCyNetwork().deleteCurrentNetwork({navigate})` | Pass `navigate` option                                                                                                                                   | Void → `ok()`. No-op if currentNetworkId is empty                | No current network → `NoCurrentNetwork`                                                             |
| `deleteAllNetworks()`                | `useDeleteCyNetwork().deleteAllNetworks()`              | None                                                                                                                                                     | Void → `ok()`                                                    | Catch → `OperationFailed`                                                                           |

**Stores involved:** `createNetworkFromEdgeList` → 5 stores. `createNetworkFromCx2` → 7 stores (adds `WorkspaceStore`). `deleteNetwork` → 10 stores (full cleanup).

**Internal hook refactoring required:**

- `useCreateNetworkFromCx2` currently always adds to workspace and navigates. The app API needs `navigate` and `addToWorkspace` options. Two approaches:
  1. **Preferred:** Add optional parameters to the internal hook.
  2. **Alternative:** The app API duplicates the workspace/navigation logic conditionally after calling the core hook.

**Undo behavior:** None of the network lifecycle operations record undo. Network creation and deletion are not undoable.

**Validation added by app API:**

- `createNetworkFromCx2`: Calls `validateCX2(cxData)` (from `src/models/CxModel/`) before passing to internal hook. This fixes Audit Section 4.5 (missing CX2 validation on CX2 import).
- `createNetworkFromEdgeList`: Validates `name` is non-empty and `edgeList` is non-empty.

---

### 3.3 Selection API — `useSelectionApi`

**Internal target:** `ViewModelStore` selection methods directly (no wrapper hook exists)

| App API Method                                 | Internal Target                                                                  | Input Transformation       | Output Transformation                                   | Error → ApiErrorCode                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| `exclusiveSelect(networkId, nodeIds, edgeIds)` | `ViewModelStore.exclusiveSelect(networkId, nodeIds, edgeIds)`                    | None                       | Void → `ok()`                                           | `viewModels[networkId]` undefined → `NetworkNotFound` |
| `additiveSelect(networkId, ids)`               | `ViewModelStore.additiveSelect(networkId, ids)`                                  | None (node/edge IDs mixed) | Void → `ok()`                                           | `viewModels[networkId]` undefined → `NetworkNotFound` |
| `additiveUnselect(networkId, ids)`             | `ViewModelStore.additiveUnselect(networkId, ids)`                                | None                       | Void → `ok()`                                           | `viewModels[networkId]` undefined → `NetworkNotFound` |
| `toggleSelected(networkId, ids)`               | `ViewModelStore.toggleSelected(networkId, ids)`                                  | None                       | Void → `ok()`                                           | `viewModels[networkId]` undefined → `NetworkNotFound` |
| `getSelection(networkId)`                      | `ViewModelStore.getViewModel(networkId)` → read `selectedNodes`, `selectedEdges` | None                       | `{selectedNodes, selectedEdges}` → `ok(SelectionState)` | View model undefined → `NetworkNotFound`              |

**Stores involved (1):** `ViewModelStore` only.

**App API validation pattern:** The app API calls `useViewModelStore.getState().getViewModel(networkId)` before each mutation. If it returns `undefined`, the app API returns `fail(ApiErrorCode.NetworkNotFound, ...)` instead of letting the store method silently no-op. This converts the store's silent-failure behavior into explicit `ApiResult` errors.

**Undo behavior:** None — selection changes are not undoable.

---

### 3.4 Table API — `useTableApi`

**Internal target:** `TableStore` methods directly (in `src/data/hooks/stores/TableStore.ts`)

| App API Method                                                               | Internal Target                                                                        | Input Transformation                                                                        | Output Transformation    | Error → ApiErrorCode                                                              |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| `getValue(networkId, tableType, elementId, column)`                          | Read `TableStore.tables[networkId].[nodeTable\|edgeTable].rows.get(elementId)[column]` | Map `tableType` → `'nodeTable'` / `'edgeTable'`                                             | Value → `ok({value})`    | Table missing → `NetworkNotFound`. Row missing → `NodeNotFound` or `EdgeNotFound` |
| `getRow(networkId, tableType, elementId)`                                    | Read `TableStore.tables[networkId].[nodeTable\|edgeTable].rows.get(elementId)`         | Same                                                                                        | Row record → `ok({row})` | Same                                                                              |
| `createColumn(networkId, tableType, columnName, dataType, defaultValue)`     | `TableStore.createColumn(networkId, tableType, columnName, dataType, defaultValue)`    | Pass directly                                                                               | Void → `ok()`            | Table missing → `NetworkNotFound`. Catch → `OperationFailed`                      |
| `deleteColumn(networkId, tableType, columnName)`                             | `TableStore.deleteColumn(networkId, tableType, columnName)`                            | Pass directly                                                                               | Void → `ok()`            | Table missing → `NetworkNotFound`. Catch → `OperationFailed`                      |
| `setColumnName(networkId, tableType, currentName, newName)`                  | `TableStore.setColumnName(networkId, tableType, currentName, newName)`                 | Pass directly                                                                               | Void → `ok()`            | Table missing → `NetworkNotFound`. Catch → `OperationFailed`                      |
| `setValue(networkId, tableType, elementId, column, value)`                   | `TableStore.setValue(networkId, tableType, elementId, column, value)`                  | Pass directly                                                                               | Void → `ok()`            | Table missing → `NetworkNotFound`. Catch → `OperationFailed`                      |
| `setValues(networkId, tableType, cellEdits)`                                 | `TableStore.setValues(networkId, tableType, cellEdits)`                                | Map app API `CellEdit` → store `CellEdit` (`{row→id, column, value}`)                       | Void → `ok()`            | Table missing → `NetworkNotFound`. Catch → `OperationFailed`                      |
| `editRows(networkId, tableType, rows)`                                       | `TableStore.editRows(networkId, tableType, rows)`                                      | Convert app API `Record<IdType, Record<...>>` → store `Map<IdType, Record<...>>` internally | Void → `ok()`            | Table missing → `NetworkNotFound`. Catch → `OperationFailed`                      |
| `applyValueToElements(networkId, tableType, columnName, value, elementIds?)` | `TableStore.applyValueToElements(networkId, tableType, columnName, value, elementIds)` | Pass directly. `undefined` elementIds → apply to all                                        | Void → `ok()`            | Table missing → `NetworkNotFound`. Catch → `OperationFailed`                      |

**Stores involved (1):** `TableStore` only.

**App API validation pattern:** The app API checks `tables[networkId]` existence before every operation. The internal store methods have **inconsistent null-safety** (some fail silently, some throw on undefined) — the app API normalizes this into consistent `NetworkNotFound` errors.

**Internal inconsistency note:** The store uses both `'node' | 'edge'` string literals and `TableType` const enum for `tableType` parameters. Both resolve to the same values. The app API accepts `'node' | 'edge'` consistently and passes through directly.

**Undo behavior:** None of the `TableStore` methods record undo. If undo is needed for table edits in the future, it must be added at the app API or hook level.

---

### 3.5 Visual Style API — `useVisualStyleApi`

**Internal target:** `VisualStyleStore` methods directly (in `src/data/hooks/stores/VisualStyleStore.ts`)

| App API Method                                                                                  | Internal Target                                                                                                  | Input Transformation | Output Transformation | Error → ApiErrorCode                                              |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------- | ----------------------------------------------------------------- |
| `setDefault(networkId, vpName, vpValue)`                                                        | `VisualStyleStore.setDefault(networkId, vpName, vpValue)`                                                        | Pass directly        | Void → `ok()`         | VS missing → `NetworkNotFound`. Catch → `OperationFailed`         |
| `setBypass(networkId, vpName, elementIds, vpValue)`                                             | `VisualStyleStore.setBypass(networkId, vpName, elementIds, vpValue)`                                             | Pass directly        | Void → `ok()`         | VS missing → `NetworkNotFound`. Empty elementIds → `InvalidInput` |
| `deleteBypass(networkId, vpName, elementIds)`                                                   | `VisualStyleStore.deleteBypass(networkId, vpName, elementIds)`                                                   | Pass directly        | Void → `ok()`         | VS missing → `NetworkNotFound`                                    |
| `createDiscreteMapping(networkId, vpName, attribute, attributeType)`                            | `VisualStyleStore.createDiscreteMapping(networkId, vpName, attribute, attributeType)`                            | Pass directly        | Void → `ok()`         | VS missing → `NetworkNotFound`                                    |
| `createContinuousMapping(networkId, vpName, vpType, attribute, attributeValues, attributeType)` | `VisualStyleStore.createContinuousMapping(networkId, vpName, vpType, attribute, attributeValues, attributeType)` | Pass directly        | Void → `ok()`         | VS missing → `NetworkNotFound`                                    |
| `createPassthroughMapping(networkId, vpName, attribute, attributeType)`                         | `VisualStyleStore.createPassthroughMapping(networkId, vpName, attribute, attributeType)`                         | Pass directly        | Void → `ok()`         | VS missing → `NetworkNotFound`                                    |
| `removeMapping(networkId, vpName)`                                                              | `VisualStyleStore.removeMapping(networkId, vpName)`                                                              | Pass directly        | Void → `ok()`         | VS missing → `NetworkNotFound`                                    |

**Stores involved (1):** `VisualStyleStore` only.

**App API validation pattern:** The store performs **zero input validation** — if `visualStyles[networkId]` is `undefined`, the delegated `VisualStyleImpl` function receives `undefined` and may throw. The app API must check `visualStyles[networkId]` existence before every call and return `NetworkNotFound` on absence.

**Undo behavior:** None of the `VisualStyleStore` methods record undo. Visual style changes are currently not undoable.

**Store methods NOT exposed via app API:**
| Store Method | Reason |
|---|---|
| `setBypassMap` | Low-level bulk bypass — used internally by undo |
| `setDiscreteMappingValue` | Granular mapping edit — Phase 2 candidate |
| `deleteDiscreteMappingValue` | Same |
| `setContinuousMappingValues` | Same |
| `createMapping` | Generic dispatcher — app API uses typed create methods |
| `setMapping` | Low-level mapping overwrite — used internally |

---

### 3.6 Layout API — `useLayoutApi`

**Internal targets:** `LayoutStore` (engines/state), `NetworkStore` (topology), `ViewModelStore` (positions), `RendererFunctionStore` (fit)

| App API Method                     | Internal Target                        | Input Transformation                                                                                    | Output Transformation                                        | Error → ApiErrorCode                                                                                                                                                 |
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
4. Snapshot pre-layout positions from ViewModelStore (for undo)
5. dispatchCyWebEvent('layout:started', { networkId, algorithm: algorithmName })
6. LayoutStore.setIsRunning(true)
7. Call engine.apply(network.nodes, network.edges, callback, algorithm)
8. In callback(positionMap):
   a. ViewModelStore.updateNodePositions(networkId, positionMap)
   b. postEdit(UndoCommandType.APPLY_LAYOUT, description, [networkId, prevPositions], [networkId, positionMap])
   c. If fitAfterLayout:
      - fn = RendererFunctionStore.getFunction('cyjs', 'fit', networkId)
      - If fn: fn()
      - Else: log warning (layout succeeds without fit)
   d. LayoutStore.setIsRunning(false)
   e. dispatchCyWebEvent('layout:completed', { networkId, algorithm: algorithmName })
   f. Resolve Promise with ok()
9. On error at any step: reject/resolve with fail(OperationFailed, ...)
   NOTE: if error occurs after step 5, layout:completed is NOT dispatched (intentional —
   see event-bus-specification.md § 1.4.6 and § 2.2)
```

**Stores involved (4):** `LayoutStore`, `NetworkStore`, `ViewModelStore`, `RendererFunctionStore`

**Event bus side effects:** `applyLayout` is the dispatch origin for `layout:started` and
`layout:completed` events. It imports `dispatchCyWebEvent` from
`./event-bus/dispatchCyWebEvent`. This is the only app API core function that dispatches events
directly (all other events come from `initEventBus` Zustand subscriptions). See
[event-bus-specification.md § 1.4.5–1.4.6](event-bus-specification.md).

**Reference implementation:** The pattern in [useRegisterNetwork.ts](src/data/hooks/useRegisterNetwork.ts) (lines 130–155) shows the existing layout execution flow and should be followed.

**Undo behavior:** Undoable. `applyLayout` records one `UndoCommandType.APPLY_LAYOUT`
entry with pre-layout and post-layout position maps:

- Undo params: `[networkId, prevPositions]`
- Redo params: `[networkId, positionMap]`

---

### 3.7 Viewport API — `useViewportApi`

**Internal targets:** `RendererFunctionStore` (fit), `ViewModelStore` (positions)

| App API Method                              | Internal Target                                                                        | Input Transformation                                                   | Output Transformation                                          | Error → ApiErrorCode                             |
| ------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| `fit(networkId)`                            | `RendererFunctionStore.getFunction('cyjs', 'fit', networkId)` → call returned function | None                                                                   | Promise resolves to `ok()`                                     | Function not registered → `FunctionNotAvailable` |
| `getNodePositions(networkId, nodeIds)`      | `ViewModelStore.getViewModel(networkId)` → extract positions from `nodeViews`          | Filter to requested `nodeIds`                                          | Build `PositionRecord` (Record, not Map) → `ok({ positions })` | View model missing → `NetworkNotFound`           |
| `updateNodePositions(networkId, positions)` | `ViewModelStore.updateNodePositions(networkId, positions)`                             | Convert app API `PositionRecord` → store `Map<IdType, ...>` internally | Void → `ok()`                                                  | View model missing → `NetworkNotFound`           |

**Stores involved (2):** `ViewModelStore`, `RendererFunctionStore`

**`RendererFunctionStore` lookup pattern:** Functions are registered at runtime by the CyjsRenderer component via `setFunction('cyjs', 'fit', fn, networkId)`. The store checks per-network functions first (`rendererFunctionsByNetworkId`), then global functions. If neither exists, `getFunction()` returns `undefined`.

**`fit()` returns `Promise<ApiResult>`** because `cy.fit()` may involve animation in future implementations. Currently synchronous but wrapped in Promise for API stability.

**Undo behavior:** `updateNodePositions` does not record undo. Position updates via the
viewport API are not undoable (unlike `applyLayout`).

---

### 3.8 Export API — `useExportApi`

**Internal target:** `exportCyNetworkToCx2` (pure function in `src/models/CxModel/impl/exporter.ts`)

| App API Method                     | Internal Target                                           | Input Transformation                                                           | Output Transformation | Error → ApiErrorCode                                                             |
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

**Validation:** The app API checks each store entry individually and returns `NetworkNotFound` with a descriptive message on the first missing entry. This prevents the exporter from receiving `undefined` fields and throwing cryptic errors.

**Undo behavior:** Read-only — no undo concerns.

---

### 3.9 Workspace API — `useWorkspaceApi`

**Internal targets:** `WorkspaceStore.workspace`, `NetworkSummaryStore.summaries` (direct reads and `setCurrentNetworkId`, `setName`)

| App API Method | Internal Target | Input Transformation | Output Transformation | Error → ApiErrorCode |
| --- | --- | --- | --- | --- |
| `getWorkspaceInfo()` | Direct read: `WorkspaceStore.getState().workspace` | None | Assemble `{workspaceId, name, currentNetworkId, networkCount}` → `ok(WorkspaceInfo)` | Catch → `OperationFailed` |
| `getNetworkIds()` | Direct read: `WorkspaceStore.getState().workspace.networkIds` | None | `[...networkIds]` → `ok({networkIds})` | Catch → `OperationFailed` |
| `getNetworkList()` | Direct reads: `WorkspaceStore.getState().workspace`, `NetworkSummaryStore.getState().summaries` | None | Join ids with summaries; omit missing summaries → `ok(WorkspaceNetworkInfo[])` | Catch → `OperationFailed` |
| `getNetworkSummary(networkId)` | Direct reads: `WorkspaceStore.getState().workspace`, `NetworkSummaryStore.getState().summaries` | Validate `networkId ∈ workspace.networkIds` | Assemble `WorkspaceNetworkInfo` → `ok(...)` | `networkId ∉ workspace.networkIds` → `NetworkNotFound`. Summary missing → `NetworkNotFound`. Catch → `OperationFailed` |
| `getCurrentNetworkId()` | Direct read: `WorkspaceStore.getState().workspace.currentNetworkId` | None | `ok({networkId: workspace.currentNetworkId})` | `networkIds.length === 0 \|\| currentNetworkId === ''` → `NoCurrentNetwork`. Catch → `OperationFailed` |
| `switchCurrentNetwork(networkId)` | `WorkspaceStore.getState().setCurrentNetworkId(networkId)` | Validate non-empty; validate `networkId ∈ workspace.networkIds` | `ok()` | Empty string → `InvalidInput`. `networkId ∉ workspace.networkIds` → `NetworkNotFound`. Catch → `OperationFailed` |
| `setWorkspaceName(name)` | `WorkspaceStore.getState().setName(name.trim())` | Validate non-empty after trim | `ok()` | Empty/whitespace-only → `InvalidInput`. Catch → `OperationFailed` |

**Stores involved (2):** `WorkspaceStore`, `NetworkSummaryStore`

**Undo behavior:** None — workspace state changes (renaming, switching active network) are not undoable operations in Cytoscape Web's undo stack.

**Event side-effects:** `switchCurrentNetwork` calls `WorkspaceStore.setCurrentNetworkId()`, which triggers the `network:switched` event via the existing `initEventBus` Zustand subscription. No direct `dispatchCyWebEvent` call is needed in `workspaceApi.ts`. `setWorkspaceName` has no associated public event.

---

### 3.10 Internal Hook / Store Return Type Reference

This subsection documents the return type interfaces of every internal hook and store method that the app API wraps. Implementers need these to build the `ApiResult<T>` conversion layer correctly.

#### 3.10.1 Element Hooks (`src/data/hooks/`)

**`useCreateNode` → `createNode()`**

Returns `CreateNodeResult` (defined in `src/data/hooks/useCreateNode.ts`):

```typescript
export interface CreateNodeResult {
  nodeId: IdType // ID of the newly created node (empty string on failure)
  success: boolean // true if the operation succeeded
  error?: string // error message on failure
}
```

Options accepted:

```typescript
export interface CreateNodeOptions {
  attributes?: Record<AttributeName, ValueType> // custom attributes for the new node's table row
  autoSelect?: boolean // whether to select the new node (default: true)
  skipUndo?: boolean // @internal — app API hardcodes to false
}
```

`generateNextNodeId(networkId)` returns `IdType` directly (a sequential numeric string, e.g. `"0"`, `"1"`).

---

**`useCreateEdge` → `createEdge()`**

Returns `CreateEdgeResult` (defined in `src/data/hooks/useCreateEdge.ts`):

```typescript
export interface CreateEdgeResult {
  edgeId: IdType // ID of the newly created edge (empty string on failure)
  success: boolean // true if the operation succeeded
  error?: string // error message on failure
}
```

Options accepted:

```typescript
export interface CreateEdgeOptions {
  attributes?: Record<AttributeName, ValueType> // custom attributes for the new edge's table row
  autoSelect?: boolean // whether to select the new edge (default: true)
  skipUndo?: boolean // @internal — app API hardcodes to false
}
```

`generateNextEdgeId(networkId)` returns `IdType` directly (prefixed sequential string, e.g. `"e0"`, `"e1"`).

---

**`useDeleteNodes` → `deleteNodes()`**

Returns `DeleteNodesResult` (defined in `src/data/hooks/useDeleteNodes.ts`):

```typescript
export interface DeleteNodesResult {
  success: boolean // true if the operation succeeded
  deletedNodeCount: number // number of nodes actually deleted
  deletedEdgeCount: number // number of edges cascade-deleted (connected to deleted nodes)
  error?: string // error message on failure
}
```

Options accepted:

```typescript
export interface DeleteNodesOptions {
  skipUndo?: boolean // @internal — app API hardcodes to false
}
```

Note: The internal model-layer function (`nodeOperations.ts`) returns a richer result for undo recording:

```typescript
// src/models/CyNetworkModel/impl/nodeOperations.ts — internal only
interface DeleteNodesResult {
  deletedNodeIds: IdType[]
  deletedEdges: Edge[]
  deletedNodeViews: NodeView[]
  deletedEdgeViews: EdgeView[]
  deletedNodeRows: Map<IdType, Record<string, ValueType>>
  deletedEdgeRows: Map<IdType, Record<string, ValueType>>
}
```

The hook converts this into the simplified `{success, deletedNodeCount, deletedEdgeCount}` shape.

---

**`useDeleteEdges` → `deleteEdges()`**

Returns `DeleteEdgesResult` (defined in `src/data/hooks/useDeleteEdges.ts`):

```typescript
export interface DeleteEdgesResult {
  success: boolean // true if the operation succeeded
  deletedEdgeCount: number // number of edges actually deleted
  error?: string // error message on failure
}
```

Options accepted:

```typescript
export interface DeleteEdgesOptions {
  skipUndo?: boolean // @internal — app API hardcodes to false
}
```

Internal model-layer counterpart (for undo recording):

```typescript
// src/models/CyNetworkModel/impl/edgeOperations.ts — internal only
interface DeleteEdgesResult {
  deletedEdgeIds: IdType[]
  deletedEdgeViews: EdgeView[]
  deletedEdgeRows: Map<IdType, Record<string, ValueType>>
}
```

---

**Common pattern:** All four CRUD hooks use a `{ success: boolean, error?: string }` result pattern. The app API converts:

- `result.success === true` → `ok({ nodeId })` / `ok({ edgeId })` / `ok({ deletedNodeCount, deletedEdgeCount })` / `ok({ deletedEdgeCount })`
- `result.success === false` → `fail(...)` with `ApiErrorCode` inferred from `result.error` string

#### 3.10.2 Network API Hook (`src/data/task/`)

**`useCreateNetworkFromCx2`**

The hook returns a **single callback function** (not a `{ method1, method2 }` object):

```typescript
export const useCreateNetworkFromCx2 = (): ((
  props: CreateNetworkFromCx2Props,
) => CyNetwork) => { ... }
```

Input:

```typescript
interface CreateNetworkFromCx2Props {
  cxData: Cx2 // CX2 data to convert into a full network with view
}
```

Returns `CyNetwork` (defined in `src/models/CyNetworkModel/CyNetwork.ts`):

```typescript
export interface CyNetwork {
  network: Network
  networkAttributes?: NetworkAttributes
  nodeTable: Table
  edgeTable: Table
  visualStyle: VisualStyle
  networkViews: NetworkView[]
  visualStyleOptions?: VisualStyleOptions
  otherAspects?: OpaqueAspects[]
  undoRedoStack: UndoRedoStack
}
```

**Error behavior:** Throws on failure (no `success`/`error` pattern). The app API must catch and convert to `fail(OperationFailed, ...)`.

**Side effects:** The internal hook always adds the network to the workspace and navigates to it. The app API needs either optional parameters added to the internal hook, or must conditionally skip navigation after calling it (see §3.2).

#### 3.10.3 Selection — `ViewModelStore` Methods

Selection is handled directly by `ViewModelStore` (defined in `src/models/StoreModel/ViewModelStoreModel.ts`). There is no standalone `useSelection` hook.

**All return `void`:**

```typescript
exclusiveSelect(networkId: IdType, selectedNodes: IdType[], selectedEdges: IdType[]): void
additiveSelect(networkId: IdType, ids: IdType[]): void
additiveUnselect(networkId: IdType, ids: IdType[]): void
toggleSelected(networkId: IdType, ids: IdType[]): void
```

**Read path:** `getViewModel(networkId, viewModelName?): NetworkView | undefined`

Selection state is embedded in the `NetworkView` object:

```typescript
interface NetworkView {
  // ... other fields ...
  selectedNodes: IdType[]
  selectedEdges: IdType[]
}
```

**Error behavior:** Silent no-op if `networkId` not found. The app API must check `getViewModel(networkId)` before calling mutations and return `NetworkNotFound` explicitly.

#### 3.10.4 Table — `TableStore` Methods

All `TableStore` mutation methods return `void` (defined in `src/models/StoreModel/TableStoreModel.ts`):

```typescript
setValue(networkId, tableType: 'node' | 'edge', row: IdType, column: string, value: ValueType): void
setValues(networkId, tableType: 'node' | 'edge', cellEdit: CellEdit[]): void
createColumn(networkId, tableType, columnName: string, dataType: ValueTypeName, value: ValueType): void
deleteColumn(networkId, tableType, columnName: string): void
setColumnName(networkId, tableType, currentColumnName: string, newColumnName: string): void
editRows(networkId, tableType, rows: Map<IdType, Record<AttributeName, ValueType>>): void
applyValueToElements(networkId, tableType, columnName, value, elementIds?): void
```

Supporting types:

```typescript
export type CellEdit = {
  row: IdType
  column: string
  value: ValueType
}

export const TableType = { NODE: 'node', EDGE: 'edge' } as const
export type TableType = 'node' | 'edge'
```

**Read path:** `tables: Record<IdType, TableRecord>` where:

```typescript
export interface TableRecord {
  nodeTable: Table
  edgeTable: Table
}
```

**Error behavior:** Inconsistent — some methods throw on missing `networkId`, others silently no-op. The app API must normalize by checking `tables[networkId]` before every call.

#### 3.10.5 Visual Style — `VisualStyleStore` Methods

All methods return `void` (defined in `src/models/StoreModel/VisualStyleStoreModel.ts`):

```typescript
setDefault(networkId, vpName: VisualPropertyName, vpValue: VisualPropertyValueType): void
setBypass(networkId, vpName, elementIds: IdType[], vpValue: VisualPropertyValueType): void
deleteBypass(networkId, vpName, elementIds: IdType[]): void
createDiscreteMapping(networkId, vpName, attribute: AttributeName, attributeType: ValueTypeName): void
createContinuousMapping(networkId, vpName, vpType, attribute, attributeValues, attributeType): void
createPassthroughMapping(networkId, vpName, attribute, attributeType): void
removeMapping(networkId, vpName: VisualPropertyName): void
```

**Read path:** `visualStyles: Record<IdType, VisualStyle>` — direct record lookup.

**Error behavior:** Zero null-checks. If `visualStyles[networkId]` is `undefined`, the delegated `VisualStyleImpl` function receives `undefined` and will throw. The app API must validate before every call.

#### 3.10.6 Layout — `LayoutEngine.apply()`

Layout is not a store action — it's a method on `LayoutEngine` (defined in `src/models/LayoutModel/LayoutEngine.ts`):

```typescript
export interface LayoutEngine {
  readonly name: string
  readonly description?: string
  defaultAlgorithmName: string
  algorithms: Record<string, LayoutAlgorithm>

  apply: (
    nodes: Node[],
    edges: Edge[],
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,
    algorithm: LayoutAlgorithm,
  ) => void
}
```

**Key observation:** `apply()` is callback-based — `afterLayout` is called asynchronously when layout completes. The app API must wrap this in a `Promise<ApiResult>`. The position map returned in the callback uses `[number, number]` tuples (no Z coordinate).

Available engines are stored in `LayoutStore.layoutEngines: LayoutEngine[]`.

#### 3.10.7 Viewport — `RendererFunctionStore` + `RendererStore`

**`RendererFunctionStore`** (defined in `src/data/hooks/stores/RendererFunctionStore.ts`):

```typescript
interface RendererFunctionStore {
  rendererFunctions: Map<string, Map<string, Function>>
  rendererFunctionsByNetworkId: Map<IdType, Map<string, Map<string, Function>>>
}

interface RendererFunctionActions {
  setFunction(
    rendererName: string,
    functionName: string,
    fn: Function,
    networkId?: IdType,
  ): void
  getFunction(
    rendererName: string,
    functionName: string,
    networkId?: IdType,
  ): Function | undefined
}
```

**`fit()` lookup:** `getFunction('cyjs', 'fit', networkId)` — returns `Function | undefined`. The function itself takes no arguments and returns `void`.

**`RendererStore`** (defined in `src/models/StoreModel/RendererStoreModel.ts`):

```typescript
interface RendererAction {
  setViewport(rendererId: string, networkId: IdType, viewport: ViewPort): void
  getViewport(rendererId: string, networkId: IdType): ViewPort | undefined
}
```

```typescript
export interface ViewPort {
  zoom: number
  pan: { x: number; y: number }
}
```

Default renderer ID: `'cyjs'`.

#### 3.10.8 Export — Pure Function

`exportCyNetworkToCx2` is a pure function (not a hook), located in `src/models/CxModel/impl/exporter.ts`:

```typescript
exportCyNetworkToCx2(
  cyNetwork: CyNetwork,
  summary?: NetworkSummary,
  networkName?: string,
): Cx2
```

Returns `Cx2` (the CX2 format data). Throws on error. The app API assembles the `CyNetwork` from 6 store reads (see §3.8).

#### 3.10.9 Undo — `useUndoStack`

`useUndoStack` (defined in `src/data/hooks/useUndoStack.tsx`) returns:

```typescript
{
  undoStack: Edit[]
  postEdit: (
    undoCommand: UndoCommandType,
    description: string,
    undoParams: any[],
    redoParams: any[],
  ) => void
  undoLastEdit: () => void
  redoLastEdit: () => void
  clearStack: () => void
}
```

The `Edit` interface (defined in `src/models/StoreModel/UndoStoreModel.ts`):

```typescript
export interface Edit {
  undoCommand: UndoCommandType
  description: string
  undoParams: any[]
  redoParams: any[]
}
```

`UndoCommandType` is a const object with 26 string values:

```typescript
export const UndoCommandType = {
  SET_NETWORK_SUMMARY: 'SET_NETWORK_SUMMARY',
  SET_CELL_VALUE: 'SET_CELL_VALUE',
  APPLY_VALUE_TO_COLUMN: 'APPLY_VALUE_TO_COLUMN',
  APPLY_VALUE_TO_SELECTED: 'APPLY_VALUE_TO_SELECTED',
  SET_DEFAULT_VP_VALUE: 'SET_DEFAULT_VP_VALUE',
  CREATE_MAPPING: 'CREATE_MAPPING',
  REMOVE_MAPPING: 'REMOVE_MAPPING',
  SET_MAPPING_TYPE: 'SET_MAPPING_TYPE',
  SET_DISCRETE_VALUE: 'SET_DISCRETE_VALUE',
  DELETE_DISCRETE_VALUE: 'DELETE_DISCRETE_VALUE',
  SET_DISCRETE_VALUE_MAP: 'SET_DISCRETE_VALUE_MAP',
  DELETE_DISCRETE_VALUE_MAP: 'DELETE_DISCRETE_VALUE_MAP',
  SET_MAPPING_COLUMN: 'SET_MAPPING_COLUMN',
  SET_BYPASS: 'SET_BYPASS',
  SET_BYPASS_MAP: 'SET_BYPASS_MAP',
  DELETE_BYPASS: 'DELETE_BYPASS',
  DELETE_BYPASS_MAP: 'DELETE_BYPASS_MAP',
  RENAME_COLUMN: 'RENAME_COLUMN',
  DELETE_COLUMN: 'DELETE_COLUMN',
  MOVE_NODES: 'MOVE_NODES',
  APPLY_LAYOUT: 'APPLY_LAYOUT',
  DELETE_NODES: 'DELETE_NODES',
  DELETE_EDGES: 'DELETE_EDGES',
  CREATE_NODES: 'CREATE_NODES',
  CREATE_EDGES: 'CREATE_EDGES',
} as const
```

The CRUD hooks (`useCreateNode`, `useCreateEdge`, `useDeleteNodes`,
`useDeleteEdges`) call `postEdit` internally. `moveEdge` and `applyLayout`
must call `postEdit` from the app API. For `applyLayout`, use
`[networkId, prevPositions]` for undo params and `[networkId, positionMap]`
for redo params.

#### 3.10.10 Return Type Summary

| Internal Target                        | Return Type                | Pattern                                                   | App API Conversion                                                       |
| -------------------------------------- | -------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `useCreateNode().createNode()`         | `CreateNodeResult`         | `{ success, nodeId, error? }`                             | `success` → `ok({nodeId})`, else `fail(...)`                             |
| `useCreateNode().generateNextNodeId()` | `IdType`                   | Direct value                                              | Not wrapped in `ApiResult`                                               |
| `useCreateEdge().createEdge()`         | `CreateEdgeResult`         | `{ success, edgeId, error? }`                             | `success` → `ok({edgeId})`, else `fail(...)`                             |
| `useCreateEdge().generateNextEdgeId()` | `IdType`                   | Direct value                                              | Not wrapped in `ApiResult`                                               |
| `useDeleteNodes().deleteNodes()`       | `DeleteNodesResult`        | `{ success, deletedNodeCount, deletedEdgeCount, error? }` | `success` → `ok({deletedNodeCount, deletedEdgeCount})`, else `fail(...)` |
| `useDeleteEdges().deleteEdges()`       | `DeleteEdgesResult`        | `{ success, deletedEdgeCount, error? }`                   | `success` → `ok({deletedEdgeCount})`, else `fail(...)`                   |
| `useCreateNetworkFromCx2()()`          | `CyNetwork`                | Direct value (throws on error)                            | Catch → `fail(OperationFailed, ...)`                                     |
| `ViewModelStore` selection methods     | `void`                     | Silent no-op on missing network                           | App API pre-checks → `NetworkNotFound`                                   |
| `ViewModelStore.getViewModel()`        | `NetworkView \| undefined` | `undefined` on missing                                    | `undefined` → `NetworkNotFound`                                          |
| `TableStore` mutation methods          | `void`                     | Inconsistent null-safety                                  | App API pre-checks → `NetworkNotFound`                                   |
| `VisualStyleStore` all methods         | `void`                     | Zero null-checks (may throw)                              | App API pre-checks → `NetworkNotFound`                                   |
| `LayoutEngine.apply()`                 | `void` (callback-based)    | `afterLayout(positionMap)`                                | Wrap in `Promise<ApiResult>`                                             |
| `RendererFunctionStore.getFunction()`  | `Function \| undefined`    | `undefined` if not registered                             | `undefined` → `FunctionNotAvailable`                                     |
| `RendererStore.getViewport()`          | `ViewPort \| undefined`    | `undefined` if not set                                    | `undefined` → `NetworkNotFound`                                          |
| `exportCyNetworkToCx2()`               | `Cx2`                      | Direct value (throws on error)                            | Catch → `fail(OperationFailed, ...)`                                     |
| `useUndoStack().postEdit()`            | `void`                     | Fire-and-forget                                           | Not exposed via app API                                                  |

---

## 4. App API Test Pattern Template

All app API hooks follow the same testing pattern using the project's existing conventions (Jest, `@testing-library/react`, `renderHook` + `act`).

### 4.1 Mock Strategy

```
jest.mock('../../data/hooks/stores/NetworkStore', () => ({ ... }))
jest.mock('../../data/hooks/stores/TableStore', () => ({ ... }))
jest.mock('../../data/hooks/stores/ViewModelStore', () => ({ ... }))
// etc. — mock only stores accessed by the app API hook under test
```

For app API hooks that wrap internal hooks (Element API, Network API):

```
jest.mock('../../data/hooks/useCreateNode', () => ({ ... }))
jest.mock('../../data/hooks/useDeleteNodes', () => ({ ... }))
// etc.
```

### 4.2 Test Structure Template

Each app API hook test file (`use<Domain>Api.test.ts`, co-located in `src/app-api/`) follows this structure:

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

### 4.3 Test Categories Per App API Hook

| App API Hook        | Success Cases                                     | Error Cases                                                 | Special Cases                                                                       |
| ------------------- | ------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `useElementApi`     | CRUD operations return correct data               | NetworkNotFound, NodeNotFound, EdgeNotFound, InvalidInput   | `skipUndo` never forwarded, cascading edge deletion in deleteNodes                  |
| `useNetworkApi`     | Network creation returns `{networkId, cyNetwork}` | InvalidInput (empty name/edges), InvalidCx2                 | `validateCX2` called before `createNetworkFromCx2`, navigate/addToWorkspace options |
| `useSelectionApi`   | Selection state reads/writes                      | NetworkNotFound                                             | Silent no-op → explicit error conversion                                            |
| `useTableApi`       | Read/write operations on tables                   | NetworkNotFound, row not found                              | Inconsistent store null-safety → consistent app API errors                          |
| `useVisualStyleApi` | Mapping/bypass operations                         | NetworkNotFound                                             | Zero store validation → app API must validate                                       |
| `useLayoutApi`      | Layout completes, positions updated               | LayoutEngineNotFound, NetworkNotFound, FunctionNotAvailable | Async callback resolution, `fitAfterLayout` optional                                |
| `useViewportApi`    | Fit, position read/write                          | FunctionNotAvailable, NetworkNotFound                       | `fit()` returns Promise                                                             |
| `useExportApi`      | CX2 assembly from 6 stores                        | NetworkNotFound (any store entry)                           | Multi-store assembly validation                                                     |
| `useWorkspaceApi`   | Workspace reads (info, network list, current id) and writes (switch, rename) | NetworkNotFound, NoCurrentNetwork, InvalidInput | Silent omission of missing NetworkSummary entries in `getNetworkList` |

---

## 5. Per-Phase File Lists

Concrete file creation/modification list for each implementation phase.

### Phase 0: Foundation Types

_Fully specified in [phase0-shared-types-design.md](phase0-shared-types-design.md)_

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

| Action | File                                  | Notes                                                                                                        |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Create | `src/app-api/core/elementApi.ts`      | Framework-agnostic; coordinates stores via `.getState()` — 9 methods including `moveEdge`. No React imports. |
| Create | `src/app-api/core/elementApi.test.ts` | Plain Jest tests for all core methods (no `renderHook`) per § 4.3                                            |
| Create | `src/app-api/useElementApi.ts`        | Thin hook: `export const useElementApi = (): ElementApi => elementApi`                                       |
| Create | `src/app-api/useElementApi.test.ts`   | Trivial hook test: verifies hook returns core `elementApi` object                                            |
| Modify | `src/app-api/index.ts`                | Uncomment `useElementApi` export                                                                             |
| Modify | `src/app-api/types/AppContext.ts`     | Uncomment `element: ElementApi` in `AppContext.apis`                                                         |
| Modify | `webpack.config.js`                   | Add `'./ElementApi'` entry                                                                                   |

### Phase 1b: Network API

| Action | File                                        | Notes                                                                                   |
| ------ | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Create | `src/app-api/core/networkApi.ts`            | Framework-agnostic; coordinates stores via `.getState()` — 5 methods. No React imports. |
| Create | `src/app-api/core/networkApi.test.ts`       | Plain Jest tests for all core methods per § 4.3                                         |
| Create | `src/app-api/useNetworkApi.ts`              | Thin hook: `export const useNetworkApi = (): NetworkApi => networkApi`                  |
| Create | `src/app-api/useNetworkApi.test.ts`         | Trivial hook test: verifies hook returns core `networkApi` object                       |
| Modify | `src/data/task/useCreateNetworkFromCx2.tsx` | Add `navigate` and `addToWorkspace` options                                             |
| Modify | `src/app-api/index.ts`                      | Uncomment `useNetworkApi` export                                                        |
| Modify | `src/app-api/types/AppContext.ts`           | Uncomment `network: NetworkApi`                                                         |
| Modify | `webpack.config.js`                         | Add `'./NetworkApi'` entry                                                              |

### Phase 1c: Selection + Viewport

| Action | File                                    | Notes                                                                                         |
| ------ | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| Create | `src/app-api/core/selectionApi.ts`      | Framework-agnostic; coordinates `ViewModelStore` via `.getState()`. No React imports.         |
| Create | `src/app-api/core/selectionApi.test.ts` | Plain Jest tests per § 4.3                                                                    |
| Create | `src/app-api/useSelectionApi.ts`        | Thin hook: `export const useSelectionApi = (): SelectionApi => selectionApi`                  |
| Create | `src/app-api/useSelectionApi.test.ts`   | Trivial hook test: verifies hook returns core object                                          |
| Create | `src/app-api/core/viewportApi.ts`       | Framework-agnostic; coordinates `RendererFunctionStore` + `ViewModelStore`. No React imports. |
| Create | `src/app-api/core/viewportApi.test.ts`  | Plain Jest tests per § 4.3                                                                    |
| Create | `src/app-api/useViewportApi.ts`         | Thin hook: `export const useViewportApi = (): ViewportApi => viewportApi`                     |
| Create | `src/app-api/useViewportApi.test.ts`    | Trivial hook test: verifies hook returns core object                                          |
| Modify | `src/app-api/index.ts`                  | Uncomment both exports                                                                        |
| Modify | `src/app-api/types/AppContext.ts`       | Uncomment `selection`, `viewport`                                                             |
| Modify | `webpack.config.js`                     | Add `'./SelectionApi'`, `'./ViewportApi'` entries                                             |

### Phase 1d: Table + Visual Style

| Action | File                                      | Notes                                                                                   |
| ------ | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Create | `src/app-api/core/tableApi.ts`            | Framework-agnostic; coordinates `TableStore` via `.getState()`. No React imports.       |
| Create | `src/app-api/core/tableApi.test.ts`       | Plain Jest tests per § 4.3                                                              |
| Create | `src/app-api/useTableApi.ts`              | Thin hook: `export const useTableApi = (): TableApi => tableApi`                        |
| Create | `src/app-api/useTableApi.test.ts`         | Trivial hook test: verifies hook returns core object                                    |
| Create | `src/app-api/core/visualStyleApi.ts`      | Framework-agnostic; coordinates `VisualStyleStore` via `.getState()`. No React imports. |
| Create | `src/app-api/core/visualStyleApi.test.ts` | Plain Jest tests per § 4.3                                                              |
| Create | `src/app-api/useVisualStyleApi.ts`        | Thin hook: `export const useVisualStyleApi = (): VisualStyleApi => visualStyleApi`      |
| Create | `src/app-api/useVisualStyleApi.test.ts`   | Trivial hook test: verifies hook returns core object                                    |
| Modify | `src/app-api/index.ts`                    | Uncomment both exports                                                                  |
| Modify | `src/app-api/types/AppContext.ts`         | Uncomment `table`, `visualStyle`                                                        |
| Modify | `webpack.config.js`                       | Add `'./TableApi'`, `'./VisualStyleApi'` entries                                        |

### Phase 1e: Layout + Export

| Action | File                                 | Notes                                                                                                   |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Create | `src/app-api/core/layoutApi.ts`      | Framework-agnostic; **new coordination logic** — see § 3.6; dispatches layout events. No React imports. |
| Create | `src/app-api/core/layoutApi.test.ts` | Plain Jest tests; layout event dispatch verified per § 4.3                                              |
| Create | `src/app-api/useLayoutApi.ts`        | Thin hook: `export const useLayoutApi = (): LayoutApi => layoutApi`                                     |
| Create | `src/app-api/useLayoutApi.test.ts`   | Trivial hook test: verifies hook returns core object                                                    |
| Create | `src/app-api/core/exportApi.ts`      | Framework-agnostic; multi-store CyNetwork assembly + exporter call. No React imports.                   |
| Create | `src/app-api/core/exportApi.test.ts` | Plain Jest tests per § 4.3                                                                              |
| Create | `src/app-api/useExportApi.ts`        | Thin hook: `export const useExportApi = (): ExportApi => exportApi`                                     |
| Create | `src/app-api/useExportApi.test.ts`   | Trivial hook test: verifies hook returns core object                                                    |
| Modify | `src/app-api/core/index.ts`          | Assemble all 8 domain objects into `CyWebApi`; assigned to `window.CyWebApi` in `init.tsx`              |
| Modify | `src/app-api/index.ts`               | Uncomment both exports                                                                                  |
| Modify | `src/app-api/types/AppContext.ts`    | Uncomment `layout`, `export`. All fields now required                                                   |
| Modify | `webpack.config.js`                  | Add `'./LayoutApi'`, `'./ExportApi'` entries. Mark legacy stores `@deprecated`                          |
| Modify | `src/app-api/api_docs/Api.md`        | Complete app API hook documentation                                                                     |

### Phase 1f: Workspace API

| Action | File | Notes |
| ------ | ---- | ----- |
| Create | `src/app-api/core/workspaceApi.ts`      | Framework-agnostic; coordinates `WorkspaceStore` + `NetworkSummaryStore` via `.getState()` — 7 methods. No React imports. |
| Create | `src/app-api/core/workspaceApi.test.ts` | Plain Jest tests for all core methods per § 4.3 |
| Create | `src/app-api/useWorkspaceApi.ts`        | Thin hook: `export const useWorkspaceApi = (): WorkspaceApi => workspaceApi` |
| Create | `src/app-api/useWorkspaceApi.test.ts`   | Trivial hook test: verifies hook returns core `workspaceApi` object |
| Modify | `src/app-api/core/index.ts`             | Add `workspace: workspaceApi` to `CyWebApi` |
| Modify | `src/app-api/index.ts`                  | Export `useWorkspaceApi` |
| Modify | `src/app-api/types/index.ts`            | Export `WorkspaceInfo`, `WorkspaceNetworkInfo`, `WorkspaceApi` |
| Modify | `src/app-api/types/AppContext.ts`       | Add `workspace: WorkspaceApi` to `AppContext.apis` |
| Modify | `webpack.config.js`                     | Add `'./WorkspaceApi'` entry |

### Phase 1g: App Lifecycle

| Action | File                                                       | Notes |
| ------ | ---------------------------------------------------------- | ----- |
| Modify | `src/app-api/types/AppContext.ts`                          | Replace inline `apis` type with `CyWebApiType` imported from `../core`; add JSDoc noting it equals `window.CyWebApi` |
| Modify | `src/data/hooks/stores/useAppManager.ts`                   | Import `CyAppWithLifecycle` + `CyWebApi`; call `mount({ appId, apis: CyWebApi })` after `registerApp`; call `unmount()` on `beforeunload` and `AppStatus.Error` transition |
| Create | `src/data/hooks/stores/useAppManager.lifecycle.test.ts`    | Plain Jest tests: `mount` called with correct context; `mount` not called for plain `CyApp`; async `mount` awaited; `unmount` on `beforeunload`; `unmount` on `AppStatus.Error` |

---

## 6. Internal Store Validation Gap Summary

The following table summarizes the validation behavior of each internal store. The app API must compensate for these gaps by performing input validation before every store call.

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
| `WorkspaceStore`        | N/A (no per-network state; `workspace` is a single object)                       | None             | Safe — `workspace` is always defined; `networkIds` is always an array |

**App API rule:** Always check store state existence _before_ calling mutation methods. Never rely on store-level null-safety.
