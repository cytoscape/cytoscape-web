# App API — Behavioral Documentation

## Overview

The app API (`src/app-api/`) is the sole public API for external apps loaded via
Module Federation. It provides a stable contract independent of internal store and
hook implementations.

The API is organized into **10 domain namespaces** (Phase 1a–1h), an **Event Bus**
(useCyWebEvent), and an **App Lifecycle** interface (Phase 1g).

## Result Convention

All app API operations return `ApiResult<T>`, a discriminated union:

- `{ success: true, data: T }` — operation succeeded
- `{ success: false, error: { code, message } }` — operation failed

App API hooks **never** throw exceptions across the API boundary.

## Error Codes

| Code                          | When Returned                                          |
| ----------------------------- | ------------------------------------------------------ |
| `NETWORK_NOT_FOUND`           | The specified network ID does not exist                |
| `NODE_NOT_FOUND`              | The specified node ID does not exist in the network    |
| `EDGE_NOT_FOUND`              | The specified edge ID does not exist in the network    |
| `INVALID_INPUT`               | Input validation failed (missing/malformed parameters) |
| `INVALID_CX2`                 | CX2 data failed structural validation                  |
| `OPERATION_FAILED`            | An internal store operation threw an unexpected error  |
| `LAYOUT_ENGINE_NOT_FOUND`     | The requested layout engine is not registered          |
| `FUNCTION_NOT_AVAILABLE`      | A renderer function (e.g., fit) is not registered yet  |
| `NO_CURRENT_NETWORK`          | No network is currently selected in the workspace      |
| `CONTEXT_MENU_ITEM_NOT_FOUND` | The specified context menu item ID does not exist      |

## Module Federation Entry

External apps import types from `cyweb/ApiTypes`:

```typescript
import type { ApiResult, IdType } from 'cyweb/ApiTypes'
import { ApiErrorCode, ok, fail } from 'cyweb/ApiTypes'
```

## App API Hooks

| Module                 | Hook                    | Key on `window.CyWebApi` | Phase |
| ---------------------- | ----------------------- | ------------------------ | ----- |
| `cyweb/ElementApi`     | `useElementApi()`       | `.element`               | 1a    |
| `cyweb/NetworkApi`     | `useNetworkApi()`       | `.network`               | 1b    |
| `cyweb/SelectionApi`   | `useSelectionApi()`     | `.selection`             | 1c    |
| `cyweb/ViewportApi`    | `useViewportApi()`      | `.viewport`              | 1c    |
| `cyweb/TableApi`       | `useTableApi()`         | `.table`                 | 1d    |
| `cyweb/VisualStyleApi` | `useVisualStyleApi()`   | `.visualStyle`           | 1d    |
| `cyweb/LayoutApi`      | `useLayoutApi()`        | `.layout`                | 1e    |
| `cyweb/ExportApi`      | `useExportApi()`        | `.export`                | 1e    |
| `cyweb/WorkspaceApi`   | `useWorkspaceApi()`     | `.workspace`             | 1f    |
| `cyweb/ContextMenuApi` | `useContextMenuApi()`   | `.contextMenu`           | 1h    |
| `cyweb/EventBus`       | `useCyWebEvent()`       | _(window events)_        | 1g    |

All hooks are thin React wrappers around framework-agnostic core objects.
The same objects are exposed on `window.CyWebApi` for Vanilla JS consumers.

---

## ElementApi (`cyweb/ElementApi`)

Provides CRUD operations on nodes and edges within a network.

```typescript
import { useElementApi } from 'cyweb/ElementApi'

function MyComponent() {
  const elementApi = useElementApi()
  // ...
}
```

### Types

```typescript
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
  /** Visual property bypasses applied atomically at creation. */
  bypass?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>
  autoSelect?: boolean   // default: true
}

interface CreateEdgeOptions {
  attributes?: Record<AttributeName, ValueType>
  /** Visual property bypasses applied atomically at creation. */
  bypass?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>
  autoSelect?: boolean   // default: true
}
```

### Methods

#### `getNode(networkId, nodeId): ApiResult<NodeData>`

Returns a node's table attributes and its current position from the view model.

| Error Code          | Condition                                  |
| ------------------- | ------------------------------------------ |
| `NETWORK_NOT_FOUND` | `networkId` does not exist                 |
| `NODE_NOT_FOUND`    | `nodeId` does not exist in the network     |

#### `getEdge(networkId, edgeId): ApiResult<EdgeData>`

Returns an edge's source/target IDs and table attributes.

| Error Code          | Condition                                  |
| ------------------- | ------------------------------------------ |
| `NETWORK_NOT_FOUND` | `networkId` does not exist                 |
| `EDGE_NOT_FOUND`    | `edgeId` does not exist in the network     |

#### `createNode(networkId, position, options?): ApiResult<{ nodeId: IdType }>`

Creates a new node at the given `[x, y, z?]` position. Adds an undo entry and,
unless `autoSelect: false`, exclusively selects the new node.

If the node table has a `name` column and no `name` attribute is provided,
defaults to `"Node <id>"`.

If `options.bypass` is provided, visual property bypasses are applied atomically
immediately after the node is created (single operation — no separate `setBypass`
call required).

| Error Code          | Condition                  |
| ------------------- | -------------------------- |
| `NETWORK_NOT_FOUND` | `networkId` does not exist |

#### `createEdge(networkId, sourceNodeId, targetNodeId, options?): ApiResult<{ edgeId: IdType }>`

Creates a new edge. Edge IDs use the pattern `e<n>`. Adds an undo entry and,
unless `autoSelect: false`, exclusively selects the new edge.

If the edge table has a `name` column and no `name` attribute is provided,
defaults to `"<source> (interacts with) <target>"`.

If `options.bypass` is provided, visual property bypasses are applied atomically
immediately after the edge is created.

| Error Code          | Condition                                    |
| ------------------- | -------------------------------------------- |
| `NETWORK_NOT_FOUND` | `networkId` does not exist                   |
| `NODE_NOT_FOUND`    | `sourceNodeId` or `targetNodeId` not found   |

#### `moveEdge(networkId, edgeId, newSourceId, newTargetId): ApiResult`

Reconnects an existing edge to different endpoints. Updates `source`/`target`
columns in the edge table if they exist. Adds an undo entry.

| Error Code          | Condition                                    |
| ------------------- | -------------------------------------------- |
| `NETWORK_NOT_FOUND` | `networkId` does not exist                   |
| `EDGE_NOT_FOUND`    | `edgeId` does not exist                      |
| `NODE_NOT_FOUND`    | `newSourceId` or `newTargetId` not found     |

#### `deleteNodes(networkId, nodeIds): ApiResult<{ deletedNodeCount, deletedEdgeCount }>`

Deletes the specified nodes and any incident edges. Visual style bypasses for the
deleted elements are cleaned up. Adds an undo entry.

| Error Code          | Condition                               |
| ------------------- | --------------------------------------- |
| `NETWORK_NOT_FOUND` | `networkId` does not exist              |
| `INVALID_INPUT`     | `nodeIds` is empty                      |
| `NODE_NOT_FOUND`    | None of the specified nodes exist       |

#### `deleteEdges(networkId, edgeIds): ApiResult<{ deletedEdgeCount }>`

Deletes the specified edges. Visual style bypasses are cleaned up. Adds an undo entry.

| Error Code          | Condition                               |
| ------------------- | --------------------------------------- |
| `NETWORK_NOT_FOUND` | `networkId` does not exist              |
| `INVALID_INPUT`     | `edgeIds` is empty                      |
| `EDGE_NOT_FOUND`    | None of the specified edges exist       |

#### `generateNextNodeId(networkId): IdType`

Returns the next available node ID without creating a node. Returns `'0'` if the
network is not found.

#### `generateNextEdgeId(networkId): IdType`

Returns the next available edge ID without creating an edge. Returns `'e0'` if
the network is not found.

---

## NetworkApi (`cyweb/NetworkApi`)

Creates and deletes networks.

```typescript
import { useNetworkApi } from 'cyweb/NetworkApi'
```

### Types

```typescript
interface CreateNetworkFromEdgeListProps {
  name: string
  description?: string
  edgeList: Array<[IdType, IdType, string?]>   // [sourceLabel, targetLabel, edgeLabel?]
  addToWorkspace?: boolean   // default: false
}

interface CreateNetworkFromCx2Props {
  cxData: Cx2
  navigate?: boolean         // default: true  — set as current network
  addToWorkspace?: boolean   // default: true
}

interface DeleteNetworkOptions {
  navigate?: boolean         // default: true  — switch to next available network
}
```

### Methods

#### `createNetworkFromEdgeList(props): ApiResult<{ networkId, cyNetwork }>`

Creates a network from an edge list (pairs of node labels). Each unique label
becomes a node with its label stored in the `name` column. A passthrough mapping
for `NODE_LABEL → name` is created automatically.

The resulting `CyNetwork` is added to NetworkStore, TableStore, VisualStyleStore,
ViewModelStore, and NetworkSummaryStore. If `addToWorkspace: true`, the network is
added to WorkspaceStore and set as the current network (firing `network:created`
and `network:switched` events).

| Error Code      | Condition                              |
| --------------- | -------------------------------------- |
| `INVALID_INPUT` | `name` is empty or `edgeList` is empty |

#### `createNetworkFromCx2(props): ApiResult<{ networkId, cyNetwork }>`

Creates a network from a CX2 document. Validates the CX2 structure before
importing. Infers network name and description from CX2 `networkAttributes`.

If `addToWorkspace: true`, adds to WorkspaceStore (fires `network:created`).
If `navigate: true`, sets as current network (fires `network:switched`).

| Error Code          | Condition                        |
| ------------------- | -------------------------------- |
| `INVALID_CX2`       | CX2 structural validation failed |

#### `deleteNetwork(networkId, options?): ApiResult`

Deletes a network from all stores. Fires `network:deleted`. If `navigate: true`
(default), switches to the next available network.

| Error Code          | Condition                  |
| ------------------- | -------------------------- |
| `NETWORK_NOT_FOUND` | `networkId` does not exist |

#### `deleteCurrentNetwork(options?): ApiResult`

Deletes the currently active network. Delegates to `deleteNetwork`.

| Error Code          | Condition                           |
| ------------------- | ----------------------------------- |
| `NO_CURRENT_NETWORK` | No network is currently selected   |

#### `deleteAllNetworks(): ApiResult`

Deletes all networks from all stores. Clears workspace state.

---

## SelectionApi (`cyweb/SelectionApi`)

Manages node and edge selection state in network view models.

```typescript
import { useSelectionApi } from 'cyweb/SelectionApi'
```

### Types

```typescript
interface SelectionState {
  selectedNodes: IdType[]
  selectedEdges: IdType[]
}
```

All write methods trigger `selection:changed` via the Event Bus (the ViewModelStore
subscription in `initEventBus` fires automatically on store mutation).

### Methods

#### `exclusiveSelect(networkId, nodeIds, edgeIds): ApiResult`

Clears current selection and selects exactly the specified nodes and edges.

#### `additiveSelect(networkId, ids): ApiResult`

Adds the specified IDs (nodes or edges) to the current selection.

#### `additiveUnselect(networkId, ids): ApiResult`

Removes the specified IDs from the current selection.

#### `toggleSelected(networkId, ids): ApiResult`

Toggles the selection state of each specified ID.

#### `getSelection(networkId): ApiResult<SelectionState>`

Returns the current selection state.

All methods return `NETWORK_NOT_FOUND` if the view model for `networkId` is not found.

---

## ViewportApi (`cyweb/ViewportApi`)

Controls the viewport and node positions in the renderer.

```typescript
import { useViewportApi } from 'cyweb/ViewportApi'
```

### Types

```typescript
/** JSON-serializable position map: nodeId → [x, y, z?] */
type PositionRecord = Record<IdType, [number, number, number?]>
```

### Methods

#### `fit(networkId): Promise<ApiResult>`

Fits the viewport to show all elements. Calls the renderer's registered `fit`
function. This is async because it delegates to the renderer.

| Error Code               | Condition                                     |
| ------------------------ | --------------------------------------------- |
| `NETWORK_NOT_FOUND`      | `networkId` does not exist                    |
| `FUNCTION_NOT_AVAILABLE` | Fit function not yet registered for this view |

#### `getNodePositions(networkId, nodeIds): ApiResult<{ positions: PositionRecord }>`

Returns current `[x, y, z?]` positions for the specified nodes. Nodes without
a view model entry are silently omitted from the result.

| Error Code          | Condition                  |
| ------------------- | -------------------------- |
| `NETWORK_NOT_FOUND` | `networkId` does not exist |

#### `updateNodePositions(networkId, positions): ApiResult`

Bulk-updates node positions in the view model. Accepts a `PositionRecord`
(plain object) and converts it internally to a `Map` before writing to the store.

| Error Code          | Condition                  |
| ------------------- | -------------------------- |
| `NETWORK_NOT_FOUND` | `networkId` does not exist |

---

## TableApi (`cyweb/TableApi`)

Reads and writes node/edge table data.

```typescript
import { useTableApi } from 'cyweb/TableApi'
```

### Types

```typescript
type AppTableType = 'node' | 'edge'

interface CellEdit {
  id: IdType           // element ID (node or edge)
  column: AttributeName
  value: ValueType
}
```

Write operations (`setValue`, `setValues`, `editRows`, etc.) trigger `data:changed`
via the Event Bus (the TableStore subscription in `initEventBus` fires automatically).

### Methods

#### `getValue(networkId, tableType, elementId, column): ApiResult<{ value: ValueType }>`

Returns the value of a single cell. Returns `NODE_NOT_FOUND` / `EDGE_NOT_FOUND`
if the element row is not found.

#### `getRow(networkId, tableType, elementId): ApiResult<{ row: Record<AttributeName, ValueType> }>`

Returns the full attribute row for a single element.

#### `createColumn(networkId, tableType, columnName, dataType, defaultValue): ApiResult`

Creates a new column with the given data type and default value.
Triggers `data:changed` with an empty `rowIds` array (schema-only change).

#### `deleteColumn(networkId, tableType, columnName): ApiResult`

Deletes a column. Triggers `data:changed` with an empty `rowIds` array.

#### `setColumnName(networkId, tableType, currentName, newName): ApiResult`

Renames a column. Triggers `data:changed` with an empty `rowIds` array.

#### `setValue(networkId, tableType, elementId, column, value): ApiResult`

Sets a single cell value. Triggers `data:changed`.

#### `setValues(networkId, tableType, cellEdits): ApiResult`

Bulk cell edit. Converts `CellEdit[]` (app format, uses `id`) to the store format
(uses `row`) internally. Triggers `data:changed`.

#### `editRows(networkId, tableType, rows): ApiResult`

Bulk row edit via a `Record<IdType, Record<AttributeName, ValueType>>`.
Converts to `Map` internally. Triggers `data:changed`.

#### `applyValueToElements(networkId, tableType, columnName, value, elementIds?): ApiResult`

Sets the same value for all specified elements (or all elements if `elementIds`
is omitted). Triggers `data:changed`.

All methods return `NETWORK_NOT_FOUND` if the table record for `networkId` is not found.

---

## VisualStyleApi (`cyweb/VisualStyleApi`)

Reads and modifies visual style properties.

```typescript
import { useVisualStyleApi } from 'cyweb/VisualStyleApi'
import { VisualPropertyName } from 'cyweb/ApiTypes'
```

All write methods trigger `style:changed` via the Event Bus (the VisualStyleStore
subscription in `initEventBus` fires on any property change).

### Methods

#### `setDefault(networkId, vpName, vpValue): ApiResult`

Sets the default value for a visual property (applies to all elements without a
bypass or mapping).

#### `setBypass(networkId, vpName, elementIds, vpValue): ApiResult`

Sets a per-element override. `elementIds` must be non-empty.

| Error Code          | Condition              |
| ------------------- | ---------------------- |
| `INVALID_INPUT`     | `elementIds` is empty  |

#### `deleteBypass(networkId, vpName, elementIds): ApiResult`

Removes per-element overrides.

#### `createDiscreteMapping(networkId, vpName, attribute, attributeType): ApiResult`

Creates a discrete (lookup-table) mapping for `vpName` based on the specified
node/edge attribute.

#### `createContinuousMapping(networkId, vpName, vpType, attribute, attributeValues, attributeType): ApiResult`

Creates a continuous (interpolated) mapping. `attributeValues` defines the
control point values on the data axis.

#### `createPassthroughMapping(networkId, vpName, attribute, attributeType): ApiResult`

Creates a passthrough mapping (attribute value used directly as the visual value).

#### `removeMapping(networkId, vpName): ApiResult`

Removes any mapping for the specified visual property.

All methods return `NETWORK_NOT_FOUND` if the visual style for `networkId` is not found.

---

## LayoutApi (`cyweb/LayoutApi`)

Applies layout algorithms and queries available layouts.

```typescript
import { useLayoutApi } from 'cyweb/LayoutApi'
```

### Types

```typescript
interface LayoutAlgorithmInfo {
  engineName: string
  algorithmName: string
  displayName: string
  description: string
  type: string
}

interface ApplyLayoutOptions {
  algorithmName?: string    // default: LayoutStore.preferredLayout
  fitAfterLayout?: boolean  // default: true
}
```

### Methods

#### `applyLayout(networkId, options?): Promise<ApiResult>`

Applies a layout algorithm asynchronously. Lifecycle:

1. Dispatches `layout:started` event
2. Sets `LayoutStore.isRunning = true`
3. Calls `engine.apply(...)` (callback-based, wrapped in a Promise)
4. On completion: updates node positions, records undo, calls `fit()` if requested,
   sets `isRunning = false`, dispatches `layout:completed`

Pre-layout positions are snapshotted for undo.

| Error Code               | Condition                                          |
| ------------------------ | -------------------------------------------------- |
| `NETWORK_NOT_FOUND`      | `networkId` does not exist                         |
| `LAYOUT_ENGINE_NOT_FOUND`| No engine registered for `algorithmName`           |

#### `getAvailableLayouts(): ApiResult<LayoutAlgorithmInfo[]>`

Returns all registered layout algorithms across all engines. Never fails.

---

## ExportApi (`cyweb/ExportApi`)

Exports networks to portable formats.

```typescript
import { useExportApi } from 'cyweb/ExportApi'
```

### Types

```typescript
type Cx2 = any[]   // CX2 format: array of aspect objects

interface ExportOptions {
  networkName?: string   // override the network name in the exported CX2
}
```

### Methods

#### `exportToCx2(networkId, options?): ApiResult<Cx2>`

Assembles the network from NetworkStore, TableStore, VisualStyleStore, ViewModelStore,
OpaqueAspectStore, and NetworkSummaryStore, then serializes to CX2 format.

| Error Code          | Condition                                             |
| ------------------- | ----------------------------------------------------- |
| `NETWORK_NOT_FOUND` | Network, tables, visual style, or view model not found |

---

## WorkspaceApi (`cyweb/WorkspaceApi`)

Provides read access to workspace state and the ability to switch the active
network or rename the workspace. All operations are synchronous.

```typescript
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import type { WorkspaceInfo, WorkspaceNetworkInfo } from 'cyweb/ApiTypes'
```

### Types

```typescript
interface WorkspaceInfo {
  workspaceId: IdType
  name: string
  currentNetworkId: IdType   // '' if no networks are open
  networkCount: number
}

interface WorkspaceNetworkInfo {
  networkId: IdType
  name: string
  description: string
  nodeCount: number
  edgeCount: number
  isModified: boolean   // true when the network has unsaved local changes
}
```

### Methods

#### `getWorkspaceInfo(): ApiResult<WorkspaceInfo>`

Returns top-level metadata. Always succeeds.

#### `getNetworkIds(): ApiResult<{ networkIds: IdType[] }>`

Returns the ordered list of network IDs (tab order). Always succeeds (empty array
when no networks are open).

#### `getNetworkList(): ApiResult<WorkspaceNetworkInfo[]>`

Returns summary metadata for all networks. Networks whose summary is not found in
NetworkSummaryStore are **silently omitted**.

#### `getNetworkSummary(networkId): ApiResult<WorkspaceNetworkInfo>`

Returns summary metadata for a single network.

| Error Code          | Condition                                             |
| ------------------- | ----------------------------------------------------- |
| `NETWORK_NOT_FOUND` | `networkId` is not in the workspace or summary missing |

#### `getCurrentNetworkId(): ApiResult<{ networkId: IdType }>`

Returns the currently active network ID.

| Error Code           | Condition                        |
| -------------------- | -------------------------------- |
| `NO_CURRENT_NETWORK` | No networks are open             |

#### `switchCurrentNetwork(networkId): ApiResult`

Switches the active network. Triggers `network:switched` via the Event Bus.

| Error Code          | Condition                          |
| ------------------- | ---------------------------------- |
| `INVALID_INPUT`     | `networkId` is empty/whitespace    |
| `NETWORK_NOT_FOUND` | `networkId` is not in the workspace |

#### `setWorkspaceName(name): ApiResult`

Renames the workspace. The name is trimmed before being stored.

| Error Code      | Condition                              |
| --------------- | -------------------------------------- |
| `INVALID_INPUT` | `name` is empty after trimming         |

---

## ContextMenuApi (`cyweb/ContextMenuApi`)

Allows external apps to register and remove custom items in the host's context
menus (right-click on nodes, edges, or the canvas background).

```typescript
import { useContextMenuApi } from 'cyweb/ContextMenuApi'
import type { ContextMenuItemConfig, ContextMenuTarget } from 'cyweb/ApiTypes'
```

### Types

```typescript
interface ContextMenuTarget {
  type: 'node' | 'edge' | 'canvas'
  /** Present for node/edge targets; absent for canvas. */
  id?: IdType
  networkId: IdType
}

interface ContextMenuItemConfig {
  /** Display label shown in the menu. Must be non-empty. */
  label: string
  /** Called when the user clicks the item. */
  handler: (target: ContextMenuTarget) => void
  /**
   * Which context menus this item appears in.
   * @default ['node', 'edge']
   */
  targetTypes?: Array<'node' | 'edge' | 'canvas'>
  /** Optional icon URL or data URI rendered next to the label. */
  icon?: string
}
```

### Methods

#### `addContextMenuItem(config): ApiResult<{ itemId: string }>`

Registers a new context menu item. Returns a unique `itemId` that can be used to
remove the item later.

Items registered in `mount()` **must** be removed in `unmount()` to avoid
orphaned entries after app deactivation.

| Error Code      | Condition                        |
| --------------- | -------------------------------- |
| `INVALID_INPUT` | `label` is empty or whitespace   |

#### `removeContextMenuItem(itemId): ApiResult`

Removes a previously registered context menu item.

| Error Code                    | Condition                    |
| ----------------------------- | ---------------------------- |
| `CONTEXT_MENU_ITEM_NOT_FOUND` | `itemId` is unknown          |

### Example

```typescript
// Typical pattern — register in mount(), remove in unmount()
let menuItemId: string | undefined

export const MyApp: CyAppWithLifecycle = {
  // ...
  mount(context) {
    const result = context.apis.contextMenu.addContextMenuItem({
      label: 'Expand Pathway',
      handler: (target) => {
        if (target.type === 'node') {
          console.log('Expand pathway for node:', target.id)
        }
      },
      targetTypes: ['node'],
    })
    if (result.success) {
      menuItemId = result.data.itemId
    }
  },

  unmount() {
    if (menuItemId !== undefined) {
      context.apis.contextMenu.removeContextMenuItem(menuItemId)
      menuItemId = undefined
    }
  },
}
```

---

## Event Bus (`cyweb/EventBus`)

The Event Bus bridges Cytoscape Web's internal Zustand store mutations to typed
`CustomEvent`s dispatched on `window`. External apps subscribe to these events
to react to state changes in real time.

### Architecture

```
Zustand stores → initEventBus (subscriptions) → dispatchCyWebEvent → window CustomEvent
layoutApi.ts ──────────────────────────────────→ dispatchCyWebEvent → window CustomEvent
```

`initEventBus()` is called once after store hydration in `src/init.tsx`. It wires
store subscriptions for all events except `layout:started`/`layout:completed`,
which are dispatched directly from `layoutApi.ts`.

### Subscribing (React)

```typescript
import { useCyWebEvent } from 'cyweb/EventBus'
import { useCallback } from 'react'

function MyComponent() {
  const handleSwitch = useCallback(({ networkId, previousId }) => {
    console.log('switched to', networkId, 'from', previousId)
  }, [])

  useCyWebEvent('network:switched', handleSwitch)
}
```

`useCyWebEvent(eventType, handler)` subscribes on mount and automatically removes
the listener on unmount. The `handler` receives the typed `detail` object directly
(not the raw `CustomEvent`).

**Stability requirement:** Wrap `handler` in `useCallback` (or a stable reference)
to avoid re-subscribing on every render.

### Subscribing (Vanilla JS)

```javascript
window.addEventListener('cywebapi:ready', () => {
  window.addEventListener('network:switched', (e) => {
    console.log('switched to', e.detail.networkId)
  })
})
```

### Event Reference

#### `network:created`

Fired when a new network is added to the workspace.

```typescript
detail: { networkId: IdType }
```

Source: WorkspaceStore subscription (`workspace.networkIds`).

#### `network:deleted`

Fired when a network is removed from the workspace.

```typescript
detail: { networkId: IdType }
```

Source: WorkspaceStore subscription (`workspace.networkIds`).

#### `network:switched`

Fired when the active (current) network changes.
`previousId` is an empty string if no network was active before.

```typescript
detail: { networkId: IdType; previousId: IdType }
```

Source: WorkspaceStore subscription (`workspace.currentNetworkId`).
Also triggered by `WorkspaceApi.switchCurrentNetwork`.

#### `selection:changed`

Fired when the selection state of the current network's primary view changes.
Uses value-equality comparison to suppress spurious events (e.g., re-clicking
the same node produces identical arrays).

```typescript
detail: {
  networkId: IdType
  selectedNodes: IdType[]
  selectedEdges: IdType[]
}
```

Source: ViewModelStore subscription (current network's view `selectedNodes` / `selectedEdges`).
Also triggered by SelectionApi write methods.

#### `layout:started`

Fired immediately before a layout algorithm begins executing.

```typescript
detail: { networkId: IdType; algorithm: string }
```

Source: `layoutApi.applyLayout` (dispatched directly, not via store subscription).

#### `layout:completed`

Fired when a layout algorithm finishes and node positions are updated.

```typescript
detail: { networkId: IdType; algorithm: string }
```

Source: `layoutApi.applyLayout` (dispatched directly, not via store subscription).

#### `style:changed`

Fired when a visual style property changes on any network.
`property` is a `VisualPropertyName` string (e.g., `'NODE_BACKGROUND_COLOR'`).
One event is fired per changed property per network per store update.

```typescript
detail: { networkId: IdType; property: string }
```

Source: VisualStyleStore subscription (full-state diff, no `subscribeWithSelector`).

#### `data:changed`

Fired when table data is written to a network's node or edge table.
`rowIds` lists the node/edge IDs whose data changed. An empty array indicates
a schema-only change (e.g., column created or deleted).

```typescript
detail: {
  networkId: IdType
  tableType: 'node' | 'edge'
  rowIds: IdType[]
}
```

Source: TableStore subscription (`tables` selector).
Also triggered by TableApi write methods.

### Event Dispatch Table

| API Method / Store Mutation              | Events Fired                          |
| ---------------------------------------- | ------------------------------------- |
| `networkApi.createNetworkFromEdgeList` (addToWorkspace: true) | `network:created`, `network:switched` |
| `networkApi.createNetworkFromCx2` (addToWorkspace: true) | `network:created`               |
| `networkApi.createNetworkFromCx2` (navigate: true) | `network:switched`                  |
| `networkApi.deleteNetwork`               | `network:deleted`, `network:switched` |
| `networkApi.deleteAllNetworks`           | `network:deleted` (×N)                |
| `workspaceApi.switchCurrentNetwork`      | `network:switched`                    |
| `selectionApi.exclusiveSelect` / `additiveSelect` / `additiveUnselect` / `toggleSelected` | `selection:changed` |
| `layoutApi.applyLayout`                  | `layout:started`, `layout:completed`  |
| `visualStyleApi.setDefault` / `setBypass` / `deleteBypass` / `create*Mapping` / `removeMapping` | `style:changed` (×per property) |
| `tableApi.setValue` / `setValues` / `editRows` / `createColumn` / `deleteColumn` / `setColumnName` / `applyValueToElements` | `data:changed` |
| `contextMenuApi.addContextMenuItem` / `removeContextMenuItem` | _(no events — synchronous store mutation only)_ |

### Usage Example (React)

```typescript
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import { useCyWebEvent } from 'cyweb/EventBus'
import { useState, useEffect, useCallback } from 'react'
import type { WorkspaceNetworkInfo } from 'cyweb/ApiTypes'

function NetworkList() {
  const workspaceApi = useWorkspaceApi()
  const [networks, setNetworks] = useState<WorkspaceNetworkInfo[]>([])

  const refresh = useCallback(() => {
    const result = workspaceApi.getNetworkList()
    if (result.success) setNetworks(result.data)
  }, [workspaceApi])

  useEffect(refresh, [refresh])

  useCyWebEvent('network:created', refresh)
  useCyWebEvent('network:deleted', refresh)

  const handleSwitch = (networkId: string) => {
    workspaceApi.switchCurrentNetwork(networkId)
  }

  return (
    <ul>
      {networks.map((n) => (
        <li key={n.networkId} onClick={() => handleSwitch(n.networkId)}>
          {n.name} ({n.nodeCount} nodes){n.isModified ? ' *' : ''}
        </li>
      ))}
    </ul>
  )
}
```

### Usage Example (Vanilla JS)

```javascript
window.addEventListener('cywebapi:ready', () => {
  const { workspace, network } = window.CyWebApi

  // Display workspace name
  const info = workspace.getWorkspaceInfo()
  if (info.success) document.title = info.data.name

  // React to events
  window.addEventListener('selection:changed', (e) => {
    const { selectedNodes, selectedEdges } = e.detail
    console.log(`Selected: ${selectedNodes.length} nodes, ${selectedEdges.length} edges`)
  })

  window.addEventListener('data:changed', (e) => {
    const { networkId, tableType, rowIds } = e.detail
    if (rowIds.length === 0) {
      console.log(`Schema changed in ${tableType} table of ${networkId}`)
    } else {
      console.log(`${rowIds.length} ${tableType} rows changed in ${networkId}`)
    }
  })
})
```

---

## App Lifecycle

Phase 1g introduced an optional lifecycle API for external apps that need to run
initialization logic outside of React components.

### `AppContext`

Passed to `mount()` when the app is activated:

```typescript
interface AppContext {
  readonly appId: string       // unique ID of this app instance
  readonly apis: CyWebApiType  // same object as window.CyWebApi at runtime
}
```

### `CyAppWithLifecycle`

Extends the existing `CyApp` interface with optional lifecycle callbacks and metadata:

```typescript
interface CyAppWithLifecycle extends CyApp {
  /** Declared API version this app targets (e.g. '1.0'). Optional. */
  apiVersion?: string

  mount?(context: AppContext): void | Promise<void>
  unmount?(): void | Promise<void>
}
```

The base `CyApp` interface provides the core metadata fields:

```typescript
interface CyApp {
  id: string             // unique ID, matches Module Federation name
  name: string           // human-readable display name
  description?: string   // short description shown in the App Settings panel
  version?: string       // app's own semantic version (e.g. '1.2.0')
  components: ComponentMetadata[]
  status?: AppStatus     // managed by host; do not set manually
}
```

- **`mount(context)`** — called after React components are registered. If it returns
  a Promise, the host awaits it before marking the app as ready. Use it to
  initialize data, subscribe to events, or call `CyWebApi` methods.
- **`unmount()`** — called when the app is deactivated or the page is unloaded.
  Must clean up all listeners, timers, DOM nodes, and async tasks. Always called,
  even on page reload.
- **`version`** — the app's own version string. Import from `package.json` to keep
  it in sync automatically (requires `resolveJsonModule: true` in tsconfig).
- **`apiVersion`** — the Cytoscape Web App API version this app targets. Reserved
  for future compatibility checks; set to `'1.0'` for current apps.

Existing apps without these methods continue to work unchanged (backward-compatible).

### Example

```typescript
import { ComponentType } from '@cytoscape-web/types'
import type { CyAppWithLifecycle, AppContext } from 'cyweb/ApiTypes'
import packageJson from '../package.json'   // requires resolveJsonModule: true
const { version } = packageJson            // destructure after default import (avoids webpack warning)

let cleanup: (() => void) | undefined

export const MyApp: CyAppWithLifecycle = {
  // --- Core metadata (CyApp) ---
  id: 'myApp',                      // unique, matches Module Federation name
  name: 'My App',
  description: 'Short description shown in App Settings.',
  version,                           // imported from package.json — stays in sync automatically
  components: [
    { id: 'MyPanel',    type: ComponentType.Panel },
    { id: 'MyMenuItem', type: ComponentType.Menu },
  ],

  // --- Lifecycle metadata (CyAppWithLifecycle) ---
  apiVersion: '1.0',                 // Cytoscape Web App API version this app targets

  // --- Lifecycle callbacks ---
  mount(context: AppContext) {
    const { appId, apis } = context

    // Example: read current networks on startup
    const result = apis.workspace.getNetworkIds()
    if (result.success) {
      console.log(`[${appId}] Networks on mount:`, result.data.networkIds)
    }

    // Example: subscribe to events
    const handler = (e: Event): void => {
      const detail = (e as CustomEvent).detail
      console.log(`[${appId}] Network switched:`, detail.networkId)
    }
    window.addEventListener('network:switched', handler)
    cleanup = () => window.removeEventListener('network:switched', handler)
  },

  unmount() {
    cleanup?.()
    cleanup = undefined
  },
}
```

---

## `window.CyWebApi`

The global `window.CyWebApi` object assembles all 10 domain APIs into a single
singleton. Available after the `cywebapi:ready` event.

```typescript
interface CyWebApiType {
  element:     ElementApi
  network:     NetworkApi
  selection:   SelectionApi
  viewport:    ViewportApi
  table:       TableApi
  visualStyle: VisualStyleApi
  layout:      LayoutApi
  export:      ExportApi
  workspace:   WorkspaceApi
  contextMenu: ContextMenuApi
}
```

```javascript
window.addEventListener('cywebapi:ready', () => {
  const api = window.CyWebApi
  // api.element, api.network, api.selection, ...
})
```

The `apis` field of `AppContext` is the same object as `window.CyWebApi` at runtime.
