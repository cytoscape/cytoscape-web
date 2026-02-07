# Module Federation Extension Audit Report

Public API gaps and design issues blocking third-party app development

---

## 1. Executive Summary

The current Module Federation infrastructure is at a **Proof of Concept** stage with these fundamental issues:

1. **Unsafe API surface from raw store exposure** — Internal stores are exposed directly, risking inconsistent state
2. **Missing high-level operation hooks** — Compound operations (create/delete nodes, run layout) are not exposed
3. **No type definitions or SDK** — No type information or documentation for third-party developers
4. **No event system** — No mechanism for inter-app communication or state change notifications
5. **Limited UI integration points** — Only Menu and Panel component types are supported
6. **Build-time app registration** — `apps.json` + `app-definition.ts` require a host rebuild for each new app

---

## 2. Current Architecture

### 2.1 Modules Exposed via Module Federation

Defined in **webpack.config.js** (L113-132):

#### Stores (12)

| Module                  | File                                           | Purpose                    |
| ----------------------- | ---------------------------------------------- | -------------------------- |
| `./CredentialStore`     | `src/data/hooks/stores/CredentialStore.ts`     | Keycloak auth credentials  |
| `./LayoutStore`         | `src/data/hooks/stores/LayoutStore.ts`         | Layout algorithm settings  |
| `./MessageStore`        | `src/data/hooks/stores/MessageStore.ts`        | Notification messages      |
| `./NetworkStore`        | `src/data/hooks/stores/NetworkStore.ts`        | Network topology           |
| `./NetworkSummaryStore` | `src/data/hooks/stores/NetworkSummaryStore.ts` | Network metadata           |
| `./OpaqueAspectStore`   | `src/data/hooks/stores/OpaqueAspectStore.ts`   | Opaque aspects             |
| `./RendererStore`       | `src/data/hooks/stores/RendererStore.ts`       | Renderer config / viewport |
| `./TableStore`          | `src/data/hooks/stores/TableStore.ts`          | Node/edge attribute tables |
| `./UiStateStore`        | `src/data/hooks/stores/UiStateStore.ts`        | UI state                   |
| `./ViewModelStore`      | `src/data/hooks/stores/ViewModelStore.ts`      | Node positions / selection |
| `./VisualStyleStore`    | `src/data/hooks/stores/VisualStyleStore.ts`    | Visual styles              |
| `./WorkspaceStore`      | `src/data/hooks/stores/WorkspaceStore.ts`      | Workspace management       |

#### Task Hooks (2)

| Module                   | File                                        | Purpose                       |
| ------------------------ | ------------------------------------------- | ----------------------------- |
| `./CreateNetwork`        | `src/data/task/useCreateNetwork.tsx`        | Create network from edge list |
| `./CreateNetworkFromCx2` | `src/data/task/useCreateNetworkFromCx2.tsx` | Create network from CX2 data  |

### 2.2 Important Modules NOT Exposed

| Module                  | Severity     | Reason                                                     |
| ----------------------- | ------------ | ---------------------------------------------------------- |
| `RendererFunctionStore` | **Critical** | Holds camera control functions: `fit()`, `zoom()`, `pan()` |
| `FilterStore`           | High         | Network filtering operations                               |
| `AppStore`              | High         | App management, service app registration                   |
| `UndoStore`             | Medium       | Participation in undo/redo                                 |

### 2.3 DataStoreContext (Legacy Pattern)

`DataStore` interface in `src/features/AppManager/DataStore.ts`:

```typescript
interface DataStore {
  useWorkspaceStore: () => WorkspaceStore
  useNetworkStore: () => NetworkStore
}
```

This was effectively superseded by Module Federation but still exists, providing only **2 stores** to external apps. Needs cleanup.

---

## 3. Detailed API Gap Analysis

### 3.1 Network Operations — Critical Gap

#### Problem: Safe node/edge create/delete hooks are not exposed

Adding a node requires coordinating **6 stores**:

1. `NetworkStore.addNode()` — Topology update
2. `TableStore.addRows()` — Table row creation
3. `ViewModelStore.addNodeView()` — View generation
4. `VisualStyleStore` — Bypass handling (when needed)
5. `NetworkSummaryStore` — Metadata update
6. `UndoStore` — Undo history recording

Internally, `useCreateNode`, `useCreateEdge`, `useDeleteNodes`, `useDeleteEdges` hooks (`src/data/hooks/`) automate this, but **none are exposed**.

**Risks of direct store manipulation:**

- `NetworkStore.deleteNodes()` is marked `@deprecated` / `@internal`
- Direct calls skip cleanup of views, table rows, and visual style bypasses
- Leads to data inconsistency and memory leaks

#### Missing APIs:

| Operation        | Internal Hook        | Exposed? | Impact on External Apps                  |
| ---------------- | -------------------- | -------- | ---------------------------------------- |
| Add node         | `useCreateNode`      | **No**   | Must manually coordinate 6 stores        |
| Add edge         | `useCreateEdge`      | **No**   | Must manually coordinate 6 stores        |
| Delete nodes     | `useDeleteNodes`     | **No**   | Cannot cascade delete + cleanup          |
| Delete edges     | `useDeleteEdges`     | **No**   | Cannot cleanup bypasses                  |
| Delete network   | `useDeleteCyNetwork` | **No**   | Cannot safely remove from all stores     |
| Register network | `useRegisterNetwork` | **No**   | Cannot apply layout + register in stores |

### 3.2 Layout Operations — Critical Gap

#### Problem: Layout execution is completely unexposed

`LayoutStore` is exposed but **only allows configuration changes**. Actual layout execution requires:

1. `LayoutEngine.apply(nodes, edges, callback, algorithm)` — Run algorithm
2. `ViewModelStore.updateNodePositions()` — Update positions in callback
3. `RendererFunctionStore.getFunction('cyjs', 'fit')` — Fit viewport

Neither direct access to `LayoutEngine` objects nor a layout execution hook is exposed.

**Result:** External apps can set layout preferences but have no way to execute them.

### 3.3 Visual Style Operations — Partial Gap

`VisualStyleStore` is exposed, making these operations theoretically possible:

- Change default values (`setDefault`)
- Set bypasses / per-element overrides (`setBypass`)
- Create/modify mappings (discrete, continuous, passthrough)

**Problems:**

1. **`VisualPropertyName` enum is not exported** — No way to know valid property names
2. **`VisualPropertyValueType` types are not exported** — No way to know valid value types
3. **Mapping function structures are complex** — Impossible to construct without documentation
4. **`createContinuousMapping` auto-generates via statistics** — Convenient but hard to control

### 3.4 Camera / Viewport Control — Critical Gap

Because `RendererFunctionStore` is not exposed:

- `fit()` — Fit network to viewport → **Impossible**
- `zoom(factor)` — Change zoom → **Impossible**
- `pan(x, y)` — Pan viewport → **Impossible**
- Call custom renderer functions → **Impossible**

`RendererStore` is exposed with `setViewport()`, but this is for viewport **persistence**, not live control. Live control requires `RendererFunctionStore`.

### 3.5 Selection Operations — Available with Caveats

`ViewModelStore` is exposed with selection operations:

- `exclusiveSelect(networkId, nodeIds[], edgeIds[])` ✅
- `additiveSelect(networkId, ids[])` ✅
- `additiveUnselect(networkId, ids[])` ✅
- `toggleSelected(networkId, ids[])` ✅

**Problems:**

- No event notification on selection change (polling required)
- Node ID format convention (integer-based strings) is undocumented
- Edge ID `e` prefix convention is undocumented

### 3.6 Table (Attribute Data) Operations — Mostly Available

`TableStore` is exposed with:

- Column create/delete/rename ✅
- Cell value read/write ✅
- Batch updates ✅

**Problems:**

- `ValueTypeName` enum is not exported as a type
- Row ID (node/edge ID) mapping conventions are undocumented

---

## 4. Design Issues

### 4.1 Dangerous Raw Store Exposure

**Current design:** Internal Zustand stores exposed directly to external apps.

**Problems:**

- Any internal structure change is an immediate breaking change
- External apps can call arbitrary store actions, creating inconsistent state
- Destructive operations like `deleteAll()` are callable with no guard
- External developers must understand Immer proxy objects

**Recommendation:** Introduce a stable public API layer instead of raw store exposure.

### 4.2 Build-Time App Registration

**Current design:**

- Define in `apps.json` → webpack converts to `remotes`
- Manually add `import()` calls in `app-definition.ts`

**Problems:**

- Requires a Cytoscape Web rebuild for every new app
- `app-definition.ts` is a hardcoded import map; no dynamic addition
- Third parties cannot independently deploy and register apps

**Recommendation:** Migrate to runtime dynamic module loading.

### 4.3 Limited Component Types

**Current:** `ComponentType` supports only `Menu` and `Panel`.

**Missing integration points:**

| Type             | Use Case                          |
| ---------------- | --------------------------------- |
| `Toolbar`        | Add buttons/icons to toolbar      |
| `ContextMenu`    | Add right-click menu items        |
| `Dialog`         | Display modal dialogs             |
| `SidePanel`      | Add tabs in side panels           |
| `StatusBar`      | Display information in status bar |
| `NetworkOverlay` | Overlays on the network view      |

### 4.4 No Event / Notification System

**Current:** Store changes are only detectable via Zustand's `subscribeWithSelector`.

**Events external apps cannot detect:**

- Network switch
- Node/edge selection change
- Layout completion
- Network load completion
- Workspace changes
- Actions from other apps

**Recommendation:** Introduce a typed event bus for inter-app communication.

### 4.5 Missing CX2 Validation

`useCreateNetworkFromCx2` does not call `validateCX2()` despite the CLAUDE.md policy requiring all external CX2 data to be validated. Invalid CX2 data from external apps could corrupt stores.

### 4.6 Uncontrollable Side Effects

`useCreateNetworkFromCx2` **unconditionally** performs:

- Adding network to workspace
- Switching current network
- URL navigation

External apps have no option to suppress these side effects.

### 4.7 Insufficient Error Handling

Task hook issues:

- `useCreateNetwork`: Only throws `Error` when a node is not found
- `useCreateNetworkFromCx2`: No error handling at all
- No explicit success/failure in return values
- No way for external apps to handle errors gracefully

---

## 5. Use Case Gap Matrix

How well the current API supports typical third-party app scenarios:

### Use Case A: Network Generator App

> Generate networks from external data sources and add to Cytoscape Web

| Operation                     | Status | Method / Issue                                                    |
| ----------------------------- | ------ | ----------------------------------------------------------------- |
| Create network from edge list | ✅     | `useCreateNetwork`                                                |
| Create network from CX2       | ⚠️     | `useCreateNetworkFromCx2` (no validation, no side-effect control) |
| Apply layout after creation   | ❌     | No layout execution API                                           |
| Apply style after creation    | ⚠️     | Direct `VisualStyleStore` manipulation (complex, no type info)    |
| Fit to view after creation    | ❌     | `RendererFunctionStore` not exposed                               |

### Use Case B: Custom Layout Algorithm App

> Implement and apply custom layout algorithms

| Operation                     | Status | Method / Issue                                    |
| ----------------------------- | ------ | ------------------------------------------------- |
| Read current network topology | ✅     | `NetworkStore`                                    |
| Compute node positions        | ✅     | External computation                              |
| Batch update node positions   | ✅     | `ViewModelStore.updateNodePositions()`            |
| Fit viewport                  | ❌     | `RendererFunctionStore` not exposed               |
| Register as layout engine     | ❌     | `LayoutStore.layoutEngines` not directly writable |

### Use Case C: Style Modification App

> Dynamically change visual styles based on data

| Operation                      | Status | Method / Issue                            |
| ------------------------------ | ------ | ----------------------------------------- |
| Map node color to data         | ⚠️     | API exists but no type info               |
| Map edge width continuously    | ⚠️     | Same                                      |
| Set bypass on individual nodes | ⚠️     | `setBypass()` exists but VP names unknown |
| Save / restore styles          | ❌     | No style export/import mechanism          |

### Use Case D: Analysis / Annotation App

> Perform network analysis and write results as attributes

| Operation                            | Status | Method / Issue                          |
| ------------------------------------ | ------ | --------------------------------------- |
| Read node/edge attributes            | ✅     | `TableStore`                            |
| Add new column                       | ✅     | `TableStore.createColumn()`             |
| Write analysis results to attributes | ✅     | `TableStore.setValue()` / `setValues()` |
| Select nodes based on results        | ✅     | `ViewModelStore.exclusiveSelect()`      |
| Style based on results               | ⚠️     | No type info                            |

### Use Case E: Data Import/Export App

> Import and export data in various formats

| Operation            | Status | Method / Issue                     |
| -------------------- | ------ | ---------------------------------- |
| Import CX2           | ⚠️     | No validation                      |
| Import custom format | ⚠️     | Only edge list supported           |
| Read network data    | ✅     | Available from stores              |
| Export to CX2        | ❌     | `exportCyNetworkToCx2` not exposed |
| Export as image      | ❌     | No renderer function access        |

---

## 6. Prioritized Recommendations

### P0 (Blockers — App development is impossible without these)

#### 6.1 Expose High-Level Operation APIs

Create new task hooks and expose via Module Federation:

```
./CreateNode     → useCreateNodeTask    (add node)
./CreateEdge     → useCreateEdgeTask    (add edge)
./DeleteElements → useDeleteElementsTask (delete elements)
./ApplyLayout    → useApplyLayoutTask   (execute layout)
./FitView        → useFitViewTask       (fit viewport)
```

These wrap internal hooks (`useCreateNode`, etc.) and guarantee:

- Coordinated multi-store updates
- Input validation
- Error handling (Result type returns)
- Undo/redo integration

#### 6.2 Expose RendererFunctionStore

Add to `webpack.config.js` `exposes`:

```javascript
'./RendererFunctionStore': './src/data/hooks/stores/RendererFunctionStore.ts',
```

### P1 (Important — Needed for practical app development)

#### 6.3 Create Type Definitions Package

Publish as `@cytoscape-web/types` (or equivalent):

- All exposed store type definitions
- `VisualPropertyName` enum
- `ValueTypeName` enum
- `IdType` type
- `CyNetwork`, `Network`, `Node`, `Edge` interfaces
- `VisualStyle`, `VisualProperty`, mapping function types
- `Table`, `Column` interfaces
- Task hook argument and return types

#### 6.4 Runtime Dynamic App Registration

Remove build-time dependency on `apps.json` + `app-definition.ts`:

- Runtime dynamic module loading (`new Function` or `importScripts` based)
- URL-based app registration UI
- Manifest validation

#### 6.5 Introduce Event Bus

Typed event system:

```typescript
interface CyWebEvents {
  'network:created': { networkId: IdType }
  'network:deleted': { networkId: IdType }
  'network:switched': { networkId: IdType; previousId: IdType }
  'selection:changed': {
    networkId: IdType
    selectedNodes: IdType[]
    selectedEdges: IdType[]
  }
  'layout:started': { networkId: IdType; algorithm: string }
  'layout:completed': { networkId: IdType }
  'style:changed': { networkId: IdType; property: string }
  'data:changed': { networkId: IdType; tableType: string; rowIds: IdType[] }
}
```

#### 6.6 Add CX2 Validation

Add `validateCX2()` to `useCreateNetworkFromCx2` to prevent store corruption from invalid data.

### P2 (Improvements — Better developer experience)

#### 6.7 Expand UI Integration Points

Add to `ComponentType`:

- `ContextMenu` — Right-click menu items
- `Toolbar` — Toolbar buttons
- `SidePanel` — Side panel tabs

#### 6.8 Developer Documentation and Templates

- API reference documentation
- Third-party app development guide
- Starter template (including webpack.config.js)
- Local development and debugging workflow

#### 6.9 Side-Effect Control Options

Add options parameter to task hooks:

```typescript
createNetworkFromCx2({
  cxData: cx2Data,
  options: {
    addToWorkspace: true, // default: true
    setAsCurrent: true, // default: true
    navigate: false, // default: true
    applyLayout: true, // default: true
    validate: true, // default: true
  },
})
```

#### 6.10 Expose CX2 Export

Add `exportCyNetworkToCx2` as a public task hook.

---

## 7. App Type Comparison

| Aspect           | Client App (Module Federation)   | Service App (REST)                  |
| ---------------- | -------------------------------- | ----------------------------------- |
| Execution        | In-browser (same JS context)     | Remote server                       |
| UI               | Custom React components          | Auto-generated parameter UI by host |
| Communication    | Direct Zustand store access      | HTTP POST/GET (polling)             |
| Result handling  | Arbitrary store operations       | 7 predefined action types           |
| Integration      | Menu, Panel                      | Menu (auto-generated)               |
| Development cost | High (must understand internals) | Low (REST API only)                 |
| Flexibility      | High (unrestricted)              | Low (limited to actions)            |
| Security         | Low (no sandbox)                 | High (HTTP boundary)                |

**Service App Actions (7):**

1. `addNetworks` — Add networks
2. `updateNetwork` — Update network
3. `addTables` — Add tables (**unimplemented stub**)
4. `updateTables` — Update tables
5. `updateSelection` — Update selection
6. `updateLayouts` — Update layouts
7. `openURL` — Open URL

Note: `addTables` is an **unimplemented stub** (empty function).

---

## 8. Known Implementation Bugs

| #   | Type                        | Location                                 | Description                                                                      |
| --- | --------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Missing validation          | `useCreateNetworkFromCx2`                | `validateCX2()` not called (policy violation)                                    |
| 2   | Unimplemented stub          | `ServiceApps/resultHandler/addTables.ts` | `addTables` action is an empty function                                          |
| 3   | Legacy code                 | `DataStore.ts` / `DataStoreProvider.tsx` | Old Context API superseded by Module Federation                                  |
| 4   | No side-effect control      | `useCreateNetworkFromCx2`                | Navigation / workspace ops are unconditional                                     |
| 5   | Deprecated API exposed      | `NetworkStore`                           | `deleteNodes()`/`deleteEdges()` are `@deprecated` but callable externally        |
| 6   | Undocumented ID conventions | Global                                   | Node IDs (integer strings) and edge IDs (`e` prefix) are not documented anywhere |

---

## 9. Recommended Implementation Roadmap

### Phase 1: Facade API (see Sections 11–12 for full design)

1. Implement shared types (`ApiResult<T>`, `ApiErrorCode`) and type re-exports — Section 11.3–11.4
2. Implement facade hooks in 5 incremental phases — Section 12.6
3. Add CX2 validation to `useCreateNetworkFromCx2` — Section 11.5.2
4. Update `webpack.config.js` exposes — Section 12.1
5. Fix existing bugs (Section 8)

### Phase 2: Developer Experience

1. Design and implement event bus
2. Dynamic app registration mechanism
3. API reference documentation
4. Starter template

### Phase 3: Extensibility

1. Expand UI integration points
2. Expose CX2 export API
3. Inter-app communication protocol
4. Security sandbox evaluation

---

## 10. Files Investigated

### Module Federation Configuration

- `webpack.config.js` (L109-151)
- `src/assets/apps.json`
- `src/assets/app-definition.ts`

### Task Hooks (Exposed)

- `src/data/task/useCreateNetwork.tsx`
- `src/data/task/useCreateNetworkFromCx2.tsx`

### Wrapper Hooks (Not Exposed)

- `src/data/hooks/useCreateNode.ts`
- `src/data/hooks/useCreateEdge.ts`
- `src/data/hooks/useDeleteNodes.ts`
- `src/data/hooks/useDeleteEdges.ts`
- `src/data/hooks/useRegisterNetwork.ts`
- `src/data/hooks/useDeleteCyNetwork.ts`
- `src/data/hooks/useUndoStack.tsx`

### Stores (Exposed)

- `src/data/hooks/stores/NetworkStore.ts`
- `src/data/hooks/stores/TableStore.ts`
- `src/data/hooks/stores/VisualStyleStore.ts`
- `src/data/hooks/stores/ViewModelStore.ts`
- `src/data/hooks/stores/LayoutStore.ts`
- `src/data/hooks/stores/WorkspaceStore.ts`
- `src/data/hooks/stores/UiStateStore.ts`
- `src/data/hooks/stores/RendererStore.ts`
- `src/data/hooks/stores/NetworkSummaryStore.ts`
- `src/data/hooks/stores/OpaqueAspectStore.ts`
- `src/data/hooks/stores/CredentialStore.ts`
- `src/data/hooks/stores/MessageStore.ts`

### Stores (Not Exposed)

- `src/data/hooks/stores/RendererFunctionStore.ts`
- `src/data/hooks/stores/AppStore.ts`
- `src/data/hooks/stores/FilterStore.ts`
- `src/data/hooks/stores/UndoStore.ts`

### ServiceApps Feature Module

- `src/features/ServiceApps/index.ts`
- `src/features/ServiceApps/model/index.ts`
- `src/features/ServiceApps/api/index.ts`
- `src/features/ServiceApps/resultHandler/serviceResultHandlerManager.ts`
- `src/features/ServiceApps/resultHandler/addNetworks.ts`
- `src/features/ServiceApps/resultHandler/updateNetwork.ts`
- `src/features/ServiceApps/resultHandler/updateTables.ts`
- `src/features/ServiceApps/resultHandler/updateSelection.ts`
- `src/features/ServiceApps/resultHandler/updateLayouts.ts`
- `src/features/ServiceApps/resultHandler/addTables.ts`
- `src/features/ServiceApps/resultHandler/openURL.ts`

### AppManager Feature Module

- `src/features/AppManager/DataStore.ts`
- `src/features/AppManager/DataStoreContext.tsx`
- `src/features/AppManager/DataStoreProvider.tsx`
- `src/features/AppManager/ExternalComponent.tsx`

### Model Definitions

- `src/models/AppModel/CyApp.ts`
- `src/models/AppModel/ComponentMetadata.ts`
- `src/models/AppModel/ComponentType.ts`
- `src/models/AppModel/ServiceApp.ts`
- `src/models/AppModel/ServiceAppAction.ts`
- `src/models/StoreModel/NetworkStoreModel.ts`
- `src/models/StoreModel/TableStoreModel.ts`
- `src/models/StoreModel/VisualStyleStoreModel.ts`
- `src/models/StoreModel/ViewModelStoreModel.ts`
- `src/models/StoreModel/LayoutStoreModel.ts`
- `src/models/StoreModel/WorkspaceStoreModel.ts`
- `src/models/StoreModel/UiStateStoreModel.ts`

---

## 11. Facade Layer Design

### 11.1 Overview

To address the raw store exposure problem (Section 4.1), we introduce a **facade layer** at `src/data/api/`. Each facade hook wraps existing internal hooks or store actions, providing:

- Input validation at the boundary before any store mutation
- Consistent `ApiResult<T>` return types (no thrown exceptions cross the facade)
- Internal-only options (`skipUndo`) hidden from external callers
- Side-effect control via explicit options

The facade does **not** duplicate store coordination logic. It delegates to existing internal hooks (`src/data/hooks/`) and converts their results.

### 11.2 Directory Structure

```
src/data/api/
├── api_docs/
│   └── Api.md                     # Behavioral documentation
├── types/
│   ├── ApiResult.ts               # Result<T>, ApiError, ApiErrorCode
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

### 11.3 Shared Result Types

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

### 11.4 Public Type Re-exports

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
```

### 11.5 Facade Hook Specifications

#### 11.5.1 Element API

Wraps: `useCreateNode`, `useCreateEdge`, `useDeleteNodes`, `useDeleteEdges`

```typescript
// src/data/api/useElementApi.ts

interface CreateNodeOptions {
  attributes?: Record<AttributeName, ValueType>
  autoSelect?: boolean // default: true
}

interface CreateEdgeOptions {
  attributes?: Record<AttributeName, ValueType>
  autoSelect?: boolean // default: true
}

interface ElementApi {
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

**Implementation strategy:** Calls internal `useCreateNode()` etc., maps their result objects (`{ success, nodeId, error? }`) to `ApiResult<T>`. The `skipUndo` option is never passed — undo always records.

#### 11.5.2 Network API

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
  navigate?: boolean       // default: true
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

  deleteNetwork(
    networkId: IdType,
    options?: DeleteNetworkOptions,
  ): ApiResult

  deleteCurrentNetwork(options?: DeleteNetworkOptions): ApiResult

  deleteAllNetworks(): ApiResult
}

const useNetworkApi: () => NetworkApi
```

**Implementation strategy:**

- `createNetworkFromEdgeList`: Wraps existing `useCreateNetwork` task hook. Catches errors, returns `ApiResult`.
- `createNetworkFromCx2`: **Adds `validateCX2()` before processing** (fixes Section 4.5 bug). Refactors internal `useCreateNetworkFromCx2` to accept `navigate` and `addToWorkspace` options (fixes Section 4.6).
- `deleteNetwork` / `deleteCurrentNetwork` / `deleteAllNetworks`: Wraps `useDeleteCyNetwork`.

#### 11.5.3 Selection API

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

#### 11.5.4 Table API

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
  createColumn(
    networkId: IdType, tableType: TableType,
    columnName: string, dataType: ValueTypeName, defaultValue: ValueType,
  ): ApiResult

  deleteColumn(
    networkId: IdType, tableType: TableType, columnName: string,
  ): ApiResult

  setColumnName(
    networkId: IdType, tableType: TableType,
    currentName: string, newName: string,
  ): ApiResult

  setValue(
    networkId: IdType, tableType: TableType,
    elementId: IdType, column: AttributeName, value: ValueType,
  ): ApiResult

  setValues(
    networkId: IdType, tableType: TableType, cellEdits: CellEdit[],
  ): ApiResult

  editRows(
    networkId: IdType, tableType: TableType,
    rows: Map<IdType, Record<AttributeName, ValueType>>,
  ): ApiResult

  applyValueToElements(
    networkId: IdType, tableType: TableType,
    columnName: string, value: ValueType, elementIds?: IdType[],
  ): ApiResult
}

const useTableApi: () => TableApi
```

**Implementation strategy:** Validates `tables[networkId]` existence, then delegates to `TableStore` actions. Adds column existence checks for operations on existing columns.

#### 11.5.5 Visual Style API

Wraps: `VisualStyleStore` mapping/bypass methods

```typescript
// src/data/api/useVisualStyleApi.ts

interface VisualStyleApi {
  setDefault(
    networkId: IdType, vpName: VisualPropertyName,
    vpValue: VisualPropertyValueType,
  ): ApiResult

  setBypass(
    networkId: IdType, vpName: VisualPropertyName,
    elementIds: IdType[], vpValue: VisualPropertyValueType,
  ): ApiResult

  deleteBypass(
    networkId: IdType, vpName: VisualPropertyName, elementIds: IdType[],
  ): ApiResult

  createDiscreteMapping(
    networkId: IdType, vpName: VisualPropertyName,
    attribute: AttributeName, attributeType: ValueTypeName,
  ): ApiResult

  createContinuousMapping(
    networkId: IdType, vpName: VisualPropertyName, vpType: string,
    attribute: AttributeName, attributeValues: ValueType[],
    attributeType: ValueTypeName,
  ): ApiResult

  createPassthroughMapping(
    networkId: IdType, vpName: VisualPropertyName,
    attribute: AttributeName, attributeType: ValueTypeName,
  ): ApiResult

  removeMapping(networkId: IdType, vpName: VisualPropertyName): ApiResult
}

const useVisualStyleApi: () => VisualStyleApi
```

**Implementation strategy:** Validates `visualStyles[networkId]` existence, then delegates to `VisualStyleStore` actions.

#### 11.5.6 Layout API

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
  algorithmName?: string   // default: preferred layout
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

#### 11.5.7 Viewport API

Wraps: `RendererFunctionStore` (fit) + `ViewModelStore` (updateNodePositions)

```typescript
// src/data/api/useViewportApi.ts

interface ViewportApi {
  fit(networkId: IdType): ApiResult

  updateNodePositions(
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ): ApiResult
}

const useViewportApi: () => ViewportApi
```

**Implementation strategy:** `fit()` retrieves and calls `RendererFunctionStore.getFunction('cyjs', 'fit', networkId)`. Returns `FunctionNotAvailable` error if the renderer function is not registered.

#### 11.5.8 Export API

Wraps: `exportCyNetworkToCx2` from `src/models/CxModel/impl/exporter.ts`

```typescript
// src/data/api/useExportApi.ts

interface ExportCx2Options {
  networkName?: string
}

interface ExportApi {
  exportToCx2(
    networkId: IdType,
    options?: ExportCx2Options,
  ): ApiResult<Cx2>
}

const useExportApi: () => ExportApi
```

**Implementation strategy:** Gathers `CyNetwork` data from NetworkStore, TableStore, VisualStyleStore, ViewModelStore, OpaqueAspectStore. Reads `NetworkSummary` from NetworkSummaryStore. Passes to `exportCyNetworkToCx2()`.

### 11.6 Design Rules

| Rule | Rationale |
|---|---|
| `skipUndo` is never exposed externally | Prevents external apps from corrupting the undo stack |
| All exceptions caught → `ApiFailure` | External apps never need try/catch around facade calls |
| Validate inputs before any store mutation | Prevents partial state updates on invalid input |
| Options with sensible defaults | Minimize required parameters; opt-in for advanced behavior |
| Facade hooks wrap, never duplicate | Single source of truth for store coordination logic |

### 11.7 Wrapping Pattern

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

## 12. Public API via Module Federation

### 12.1 New Expose Entries

Add 9 entries to `webpack.config.js` `exposes`:

```javascript
exposes: {
  // --- Public Facade API (recommended for external apps) ---
  './ElementApi':     './src/data/api/useElementApi.ts',
  './NetworkApi':     './src/data/api/useNetworkApi.ts',
  './SelectionApi':   './src/data/api/useSelectionApi.ts',
  './TableApi':       './src/data/api/useTableApi.ts',
  './VisualStyleApi': './src/data/api/useVisualStyleApi.ts',
  './LayoutApi':      './src/data/api/useLayoutApi.ts',
  './ViewportApi':    './src/data/api/useViewportApi.ts',
  './ExportApi':      './src/data/api/useExportApi.ts',
  './ApiTypes':       './src/data/api/types/index.ts',

  // --- Raw stores (deprecated, kept for backward compatibility) ---
  './CredentialStore':      './src/data/hooks/stores/CredentialStore.ts',
  './LayoutStore':          './src/data/hooks/stores/LayoutStore.ts',
  // ... (12 stores unchanged)

  // --- Legacy task hooks (deprecated, use NetworkApi instead) ---
  './CreateNetwork':        './src/data/task/useCreateNetwork.tsx',
  './CreateNetworkFromCx2': './src/data/task/useCreateNetworkFromCx2.tsx',
},
```

### 12.2 External App Usage

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

### 12.3 API Surface Summary

| Module | Hook | Operations |
|---|---|---|
| `cyweb/ElementApi` | `useElementApi()` | createNode, createEdge, deleteNodes, deleteEdges |
| `cyweb/NetworkApi` | `useNetworkApi()` | createNetworkFromEdgeList, createNetworkFromCx2, deleteNetwork |
| `cyweb/SelectionApi` | `useSelectionApi()` | exclusiveSelect, additiveSelect, additiveUnselect, toggleSelected, getSelection |
| `cyweb/TableApi` | `useTableApi()` | createColumn, deleteColumn, setValue, setValues, editRows |
| `cyweb/VisualStyleApi` | `useVisualStyleApi()` | setDefault, setBypass, createDiscreteMapping, createContinuousMapping, createPassthroughMapping |
| `cyweb/LayoutApi` | `useLayoutApi()` | applyLayout, getAvailableLayouts |
| `cyweb/ViewportApi` | `useViewportApi()` | fit, updateNodePositions |
| `cyweb/ExportApi` | `useExportApi()` | exportToCx2 |
| `cyweb/ApiTypes` | — | IdType, ApiResult, ApiErrorCode, VisualPropertyName, ValueTypeName, CyNetwork, Cx2, ... |

### 12.4 Backward Compatibility Strategy

| Aspect | Approach |
|---|---|
| Existing 12 store exposures | Kept as-is, marked `@deprecated` in JSDoc |
| Existing 2 task hooks | Kept as-is, marked `@deprecated` in JSDoc |
| Runtime behavior | No change for existing consumers |
| Migration path | Incremental — replace one import at a time |
| Removal timeline | Minimum 2 release cycles after facade is stable |

### 12.5 Revised Use Case Gap Matrix

With the facade API in place, the use case coverage from Section 5 changes:

| Use Case | Before | After |
|---|---|---|
| **A: Network Generator** — create + layout + style + fit | ⚠️ Partial | ✅ Full (`NetworkApi` + `LayoutApi` + `VisualStyleApi` + `ViewportApi`) |
| **B: Custom Layout** — read topology + compute + update positions + fit | ⚠️ No fit | ✅ Full (`NetworkApi` read + `ViewportApi` + `LayoutApi`) |
| **C: Style Modification** — mappings + bypasses | ⚠️ No types | ✅ Full (`VisualStyleApi` + `ApiTypes` for VP names) |
| **D: Analysis / Annotation** — read + write attributes + select + style | ⚠️ No types | ✅ Full (`TableApi` + `SelectionApi` + `VisualStyleApi`) |
| **E: Data Import/Export** — import CX2 + export CX2 | ⚠️ No export | ✅ Full (`NetworkApi` + `ExportApi`) |

### 12.6 Implementation Phases

| Phase | Scope | Key Files |
|---|---|---|
| 1 | Types + Element API | `src/data/api/types/`, `src/data/api/useElementApi.ts` |
| 2 | Network API | `src/data/api/useNetworkApi.ts`, refactor `src/data/task/useCreateNetworkFromCx2.tsx` |
| 3 | Selection + Viewport | `src/data/api/useSelectionApi.ts`, `src/data/api/useViewportApi.ts` |
| 4 | Table + Visual Style | `src/data/api/useTableApi.ts`, `src/data/api/useVisualStyleApi.ts` |
| 5 | Layout + Export | `src/data/api/useLayoutApi.ts`, `src/data/api/useExportApi.ts` |
| 6 | Documentation + deprecation | `src/data/api/api_docs/Api.md`, update `webpack.config.js`, mark legacy `@deprecated` |
