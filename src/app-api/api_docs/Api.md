# App API — Behavioral Documentation

## Overview

The app API (`src/app-api/`) is the sole public API for external apps loaded via
Module Federation. It provides a stable contract independent of internal store and
hook implementations.

`window.CyWebApi` contains **10 domain namespaces**, including its anonymous
Context Menu API. Plugin apps additionally receive per-app Context Menu and
Resource Registration factories, the typed Event Bus (`useCyWebEvent`), and an
App Lifecycle interface with declarative resource support.

## Result Convention

Fallible app API operations return `ApiResult<T>`, a discriminated union:

- `{ success: true, data: T }` — operation succeeded
- `{ success: false, error: { code, severity, message } }` — operation failed

App API hooks **never** throw exceptions across the API boundary.

The direct-value exceptions are `generateNextNodeId`, `generateNextEdgeId`,
and the Resource API introspection methods `getSupportedSlots`,
`getRegisteredResources`, and `getResourceVisibility`.

## Error Codes

Every failure carries a `code`, a `severity` (`'error'` or `'warning'` — see the
[MI1/MI2/MI3 caveat](./ErrorCodes.md#mi1) for what `severity` means when a code is
always blocking regardless), and a `message`. Codes that enforce a CX2 validation
requirement reuse the CX2 code string directly (`FK1`, `BV1`, `MI3`, …); concepts
with no CX2 equivalent (workspace/registry/runtime state) use a distinct `APP*`
namespace that can never collide with a future CX2 code addition.

See **[ErrorCodes.md](./ErrorCodes.md)** for the full catalog — one entry per code,
with severity, message, which methods return it, and (for CX2-derived codes) the
corresponding CX2 spec provenance.

## Module Federation Entry

External apps import types from `cyweb/ApiTypes`:

```typescript
import type { ApiResult, IdType } from 'cyweb/ApiTypes'
import { AppCodes, ElementCodes, ok, fail, isOk, isFail } from 'cyweb/ApiTypes'
```

`ok()` / `fail()` construct results; `isOk(result)` / `isFail(result)` are type
guards that narrow an `ApiResult<T>` to its success or failure branch (handy in
`filter`/`map` chains where `result.success` narrowing is inconvenient).

## App API Hooks

| Module                 | Hook                  | Key on `window.CyWebApi` | Phase |
| ---------------------- | --------------------- | ------------------------ | ----- |
| `cyweb/ElementApi`     | `useElementApi()`     | `.element`               | 1a    |
| `cyweb/NetworkApi`     | `useNetworkApi()`     | `.network`               | 1b    |
| `cyweb/SelectionApi`   | `useSelectionApi()`   | `.selection`             | 1c    |
| `cyweb/ViewportApi`    | `useViewportApi()`    | `.viewport`              | 1c    |
| `cyweb/TableApi`       | `useTableApi()`       | `.table`                 | 1d    |
| `cyweb/VisualStyleApi` | `useVisualStyleApi()` | `.visualStyle`           | 1d    |
| `cyweb/LayoutApi`      | `useLayoutApi()`      | `.layout`                | 1e    |
| `cyweb/ExportApi`      | `useExportApi()`      | `.export`                | 1e    |
| `cyweb/WorkspaceApi`   | `useWorkspaceApi()`   | `.workspace`             | 1f    |
| `cyweb/ScopedApi`      | `useScopedApi(id?)`   | `.forNetwork(id?)`       | 1g    |
| `cyweb/EventBus`       | `useCyWebEvent()`     | _(window events)_        | 1g    |

All hooks are thin React wrappers around framework-agnostic core objects.
The same objects are exposed on `window.CyWebApi` for Vanilla JS consumers.

### Scoped (current-network) API — `CyWebApi.forNetwork(networkId?)`

Every method on the network-scoped domains takes `networkId` as its first
argument. `forNetwork(networkId?)` returns a view of those domains — `element`,
`table`, `selection`, `viewport`, `visualStyle`, `export`, and `layout`
(`applyLayout` only) — with the id pre-bound, so it never has to be passed on
individual calls. Omit the argument to target the workspace's **current**
network, resolved at call time.

```typescript
// Bind the current network (resolved per call)
const net = window.CyWebApi.forNetwork()
net.element.createNode([100, 200])
net.selection.exclusiveSelect(['n1'], [])
net.table.getTable('node')

// Bind a specific network
const other = window.CyWebApi.forNetwork('net-42')
other.export.exportToCx2()
```

React apps get the same view from the `cyweb/ScopedApi` hook, memoized per
networkId (stable across renders, safe in effect/callback deps):

```typescript
import { useScopedApi } from 'cyweb/ScopedApi'

const net = useScopedApi() // current network
const other = useScopedApi(id) // a specific network
```

Domains whose methods are not uniformly network-scoped — `network`, `workspace`,
`contextMenu` — are excluded from the scoped view; call those on the top-level
`CyWebApi`. `layout` appears in the scoped view with only its network-scoped
`applyLayout` bound (read algorithms from `CyWebApi.layout.getAvailableLayouts()`).
The scoped view is purely additive: it delegates to the same underlying domain
objects.

### Readiness — `CyWebApi.whenReady()` / `CyWebApi.isReady()`

`window.CyWebApi` is assigned before the app finishes hydrating, so its
stateful methods only work after startup completes. Rather than listen for the
one-shot `cywebapi:ready` event and track whether it already fired, await the
promise:

```javascript
const api = await window.CyWebApi.whenReady() // resolves immediately if ready
api.forNetwork().element.createNode([0, 0])
```

`whenReady()` resolves with the `CyWebApi` object; `isReady()` returns the
current boolean. The `cywebapi:ready` window event still fires for consumers
that prefer events.

> **Context Menu API:** `cyweb/ContextMenuApi` and `useContextMenuApi()` were removed in Phase 2.
> Context menu access is now via `AppContext.apis.contextMenu` (per-app factory in `mount()`) or
> `window.CyWebApi.contextMenu` (anonymous singleton for non-React consumers).
> See `createContextMenuApi(appId)` in `src/app-api/core/contextMenuApi.ts`.

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
  /** Visual property bypasses validated, then applied atomically at creation. */
  bypass?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>
  autoSelect?: boolean // default: true
}

interface CreateEdgeOptions {
  attributes?: Record<AttributeName, ValueType>
  /** Visual property bypasses validated, then applied atomically at creation. */
  bypass?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>
  autoSelect?: boolean // default: true
}

/** One node to create in a createNodes() batch. */
interface NodeSpec {
  position: [number, number, number?]
  attributes?: Record<AttributeName, ValueType>
  bypass?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>
}

/** One edge to create in a createEdges() batch. */
interface EdgeSpec {
  sourceNodeId: IdType
  targetNodeId: IdType
  attributes?: Record<AttributeName, ValueType>
  bypass?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>
}

/** Options for the batch create operations. */
interface BatchCreateOptions {
  autoSelect?: boolean // default: true
}
```

### Methods

#### `getNode(networkId, nodeId): ApiResult<NodeData>`

Returns a node's table attributes and its current position from the view model.

| Error Code | Condition                              |
| ---------- | -------------------------------------- |
| `APP1`     | `networkId` does not exist             |
| `GL1`      | `nodeId` does not exist in the network |

#### `getEdge(networkId, edgeId): ApiResult<EdgeData>`

Returns an edge's source/target IDs and table attributes.

| Error Code | Condition                              |
| ---------- | -------------------------------------- |
| `APP1`     | `networkId` does not exist             |
| `GL2`      | `edgeId` does not exist in the network |

#### `getNodes(networkId, nodeIds?): ApiResult<{ nodes: Array<{ id } & NodeData>, missing: IdType[] }>`

Batch-reads nodes with their attributes and positions. When `nodeIds` is
omitted, every node in the network is returned. IDs that do not exist are
reported in `missing` rather than failing the whole call.

| Error Code | Condition                  |
| ---------- | -------------------------- |
| `APP1`     | `networkId` does not exist |

#### `createNode(networkId, position, options?): ApiResult<{ nodeId: IdType; node: NodeData }>`

Creates a new node at the given `[x, y, z?]` position. Adds an undo entry and,
unless `autoSelect: false`, exclusively selects the new node.

Returns the generated `nodeId` and a `node` object containing the final
`attributes` and `position` that were written to the stores.

If the node table has a `name` column and no `name` attribute is provided,
defaults to `"Node <id>"`.

If `options.bypass` is provided, each bypass is validated **before** the node is
created (property existence, node scope, and value type — the same checks
`setBypass` performs); an invalid bypass fails the call without creating the
node. Valid bypasses are then applied atomically immediately after the node is
created (single operation — no separate `setBypass` call required).

| Error Code   | Condition                                                         |
| ------------ | ----------------------------------------------------------------- |
| `APP1`       | `networkId` does not exist                                        |
| `N3`         | `options.attributes` contains an `id` key                         |
| `APP9`       | `options.bypass` names an unknown visual property                 |
| `BV2`        | A `options.bypass` property doesn't match node scope              |
| `VP1`–`VP10` | A `options.bypass` value is invalid for its property's value type |

#### `createEdge(networkId, sourceNodeId, targetNodeId, options?): ApiResult<{ edgeId: IdType; edge: EdgeData }>`

Creates a new edge. Edge IDs use the pattern `e<n>`. Adds an undo entry and,
unless `autoSelect: false`, exclusively selects the new edge.

Returns the generated `edgeId` and an `edge` object containing `sourceId`,
`targetId`, and the final `attributes` that were written to the stores.

If the edge table has a `name` column and no `name` attribute is provided,
defaults to `"<source> (interacts with) <target>"`.

If `options.bypass` is provided, each bypass is validated **before** the edge is
created (property existence, edge scope, and value type); an invalid bypass
fails the call without creating the edge. Valid bypasses are then applied
atomically immediately after the edge is created.

| Error Code   | Condition                                                         |
| ------------ | ----------------------------------------------------------------- |
| `APP1`       | `networkId` does not exist                                        |
| `E6`         | `options.attributes` contains an `id` key                         |
| `GL1`        | `sourceNodeId` or `targetNodeId` not found                        |
| `APP9`       | `options.bypass` names an unknown visual property                 |
| `BV2`        | A `options.bypass` property doesn't match edge scope              |
| `VP1`–`VP10` | A `options.bypass` value is invalid for its property's value type |

#### `createNodes(networkId, nodes, options?): ApiResult<{ nodes: Array<{ nodeId, node }> }>`

Creates many nodes in one operation that records a **single** undo entry
(undoing removes them all at once). Each `NodeSpec` carries its own `position`,
`attributes`, and `bypass`. Validation is all-or-nothing: everything is checked
up front, and if any spec is invalid no node is created. Unless
`options.autoSelect: false`, the created nodes are exclusively selected.

Returns each created `nodeId` paired with its `node` (`{ attributes, position }`).

| Error Code   | Condition                                                        |
| ------------ | ---------------------------------------------------------------- |
| `APP1`       | `networkId` does not exist                                       |
| `N3`         | A spec's `attributes` contains an `id` key                       |
| `APP9`       | A spec's `bypass` names an unknown visual property               |
| `BV2`        | A spec's `bypass` property doesn't match node scope              |
| `VP1`–`VP10` | A spec's `bypass` value is invalid for its property's value type |

#### `createEdges(networkId, edges, options?): ApiResult<{ edges: Array<{ edgeId, edge }> }>`

Creates many edges in one operation that records a **single** undo entry. Each
`EdgeSpec` carries `sourceNodeId`, `targetNodeId`, `attributes`, and `bypass`.
Validation is all-or-nothing: if any endpoint is missing or any bypass invalid,
no edge is created. Unless `options.autoSelect: false`, the created edges are
exclusively selected.

Returns each created `edgeId` paired with its `edge`
(`{ sourceId, targetId, attributes }`).

| Error Code   | Condition                                                        |
| ------------ | ---------------------------------------------------------------- |
| `APP1`       | `networkId` does not exist                                       |
| `E6`         | A spec's `attributes` contains an `id` key                       |
| `GL1`        | A spec's `sourceNodeId` or `targetNodeId` not found              |
| `APP9`       | A spec's `bypass` names an unknown visual property               |
| `BV2`        | A spec's `bypass` property doesn't match edge scope              |
| `VP1`–`VP10` | A spec's `bypass` value is invalid for its property's value type |

#### `moveEdge(networkId, edgeId, newSourceId, newTargetId): ApiResult`

Reconnects an existing edge to different endpoints. Updates `source`/`target`
columns in the edge table if they exist. Adds an undo entry.

| Error Code | Condition                                |
| ---------- | ---------------------------------------- |
| `APP1`     | `networkId` does not exist               |
| `GL2`      | `edgeId` does not exist                  |
| `GL1`      | `newSourceId` or `newTargetId` not found |

#### `deleteNodes(networkId, nodeIds): ApiResult<{ deletedNodeCount, deletedEdgeCount, deletedNodes, deletedEdges, missing }>`

Deletes the specified nodes and any incident edges. Visual style bypasses for the
deleted elements are cleaned up. Adds an undo entry.

Returns:

- `deletedNodeCount` / `deletedEdgeCount` — counts of removed elements
- `deletedNodes: Array<{ id, attributes, position }>` — full `NodeData` for each deleted node
- `deletedEdges: Array<{ id, sourceId, targetId, attributes }>` — full `EdgeData` for each
  incidentally-deleted edge (edges connected to the deleted nodes)
- `missing: IdType[]` — requested node ids that did not exist (partial requests
  still succeed; the op fails only when none of the ids exist)

| Error Code | Condition                         |
| ---------- | --------------------------------- |
| `APP1`     | `networkId` does not exist        |
| `APP9`     | `nodeIds` is empty                |
| `GL1`      | None of the specified nodes exist |

#### `deleteEdges(networkId, edgeIds): ApiResult<{ deletedEdgeCount, deletedEdges, missing }>`

Deletes the specified edges. Visual style bypasses are cleaned up. Adds an undo entry.

Returns:

- `deletedEdgeCount` — number of removed edges
- `deletedEdges: Array<{ id, sourceId, targetId, attributes }>` — full `EdgeData` for each deleted edge
- `missing: IdType[]` — requested edge ids that did not exist

| Error Code | Condition                         |
| ---------- | --------------------------------- |
| `APP1`     | `networkId` does not exist        |
| `APP9`     | `edgeIds` is empty                |
| `GL2`      | None of the specified edges exist |

#### `generateNextNodeId(networkId): ApiResult<{ nodeId: IdType }>`

Returns the ID the next created node in this network will receive, without
creating a node.

| Error Code | Condition                  |
| ---------- | -------------------------- |
| `APP1`     | `networkId` does not exist |

#### `generateNextEdgeId(networkId): ApiResult<{ edgeId: IdType }>`

Returns the ID the next created edge in this network will receive, without
creating an edge.

| Error Code | Condition                  |
| ---------- | -------------------------- |
| `APP1`     | `networkId` does not exist |

### Graph Traversal

Read-only methods wrapping the internal cytoscape.js graph engine. These are
useful for apps that need adjacency queries, graph walking, or structural
analysis (e.g., pathway expand/collapse).

#### `getNodeIds(networkId): ApiResult<{ nodeIds: IdType[] }>`

Returns all node IDs in the network.

#### `getEdgeIds(networkId): ApiResult<{ edgeIds: IdType[] }>`

Returns all edge IDs in the network.

#### `getEdges(networkId, edgeIds?): ApiResult<{ edges: Array<{ id, sourceId, targetId, attributes }>; missing: IdType[] }>`

Batch-reads edges with source/target and attributes in a single call. When
`edgeIds` is omitted, every edge is returned; requested ids that don't exist
are reported in `missing` (symmetric with `getNodes`). Use this instead of
`getEdgeIds` + per-edge `getEdge()` when building topology — it avoids one API
round-trip per edge, which matters on networks with thousands of edges.

#### `getConnectedEdges(networkId, nodeId): ApiResult<{ edges: Array<{ id, sourceId, targetId, attributes }> }>`

Returns all edges connected to the given node (both incoming and outgoing).
Each edge includes its `id`, `sourceId`, `targetId`, and `attributes`, so the
results can be selected or deleted directly.

#### `getConnectedNodes(networkId, nodeId): ApiResult<{ nodeIds: IdType[] }>`

Returns all nodes directly connected to the given node (undirected
neighborhood, excluding the node itself).

#### `getOutgoers(networkId, nodeId): ApiResult<{ nodeIds, edgeIds }>`

Returns immediate outgoing neighbors and the edges connecting to them
(directed, one hop). For undirected networks, returns all neighbors.

#### `getIncomers(networkId, nodeId): ApiResult<{ nodeIds, edgeIds }>`

Returns immediate incoming neighbors and the edges connecting from them
(directed, one hop). For undirected networks, returns all neighbors.

#### `getSuccessors(networkId, nodeId): ApiResult<{ nodeIds: IdType[] }>`

Returns all downstream nodes reachable from the given node (transitive closure,
directed). Does not include the starting node.

#### `getPredecessors(networkId, nodeId): ApiResult<{ nodeIds: IdType[] }>`

Returns all upstream nodes from which the given node is reachable (transitive
closure, directed). Does not include the starting node.

#### `getRoots(networkId): ApiResult<{ nodeIds: IdType[] }>`

Returns nodes with no incoming edges (roots of the directed graph).

#### `getLeaves(networkId): ApiResult<{ nodeIds: IdType[] }>`

Returns nodes with no outgoing edges (leaves of the directed graph).

**Common errors for graph traversal methods:**

| Error Code | When                                            |
| ---------- | ----------------------------------------------- |
| `APP1`     | The specified network does not exist            |
| `GL1`      | The specified node does not exist (node-scoped) |

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
  edgeList: Array<[IdType, IdType, string?]> // [sourceLabel, targetLabel, edgeLabel?]
  addToWorkspace?: boolean // default: true
}

interface CreateNetworkFromCx2Props {
  cxData: Cx2
  navigate?: boolean // default: true  — set as current network
  addToWorkspace?: boolean // default: true
}

interface DeleteNetworkOptions {
  /** Retained for source compatibility; currently ignored. */
  navigate?: boolean
}
```

### Methods

#### `createNetworkFromEdgeList(props): ApiResult<{ networkId, cyNetwork }>`

Creates a network from an edge list (pairs of node labels). Each unique label
becomes a node with its label stored in the `name` column. A passthrough mapping
for `nodeLabel → name` is created automatically.

The resulting `CyNetwork` is added to NetworkStore, TableStore, VisualStyleStore,
ViewModelStore, and NetworkSummaryStore. If `addToWorkspace: true` (the default),
the network is added to WorkspaceStore and set as the current network (firing
`network:created` and `network:switched` events). Pass `addToWorkspace: false` to
create the network without adding it to the workspace.

| Error Code | Condition                              |
| ---------- | -------------------------------------- |
| `APP9`     | `name` is empty or `edgeList` is empty |

#### `createNetworkFromNodeList(networkId, nodeIds, edgeIds?, options?): ApiResult<{ networkId, cyNetwork }>`

Creates a new network (subnetwork) from a subset of an existing network's
nodes. Unlike `createNetworkFromEdgeList`, isolated (unconnected) nodes are
allowed. Element IDs are preserved; table column schemas, the selected
attribute rows, and node positions are copied from the source network.

- `edgeIds` omitted or `'all'` → induced subgraph: every source edge whose
  endpoints are both in `nodeIds` is included.
- Explicit `edgeIds` → only those edges; each must connect nodes in `nodeIds`.
- `options`: `{ name?, description?, addToWorkspace? }` — name defaults to
  `Subnetwork of <source name>`; `addToWorkspace` defaults to `true` (pass
  `false` to opt out, matching `createNetworkFromEdgeList`).

| Error Code | Condition                                             |
| ---------- | ----------------------------------------------------- |
| `APP1`     | Source network does not exist                         |
| `GL1`      | A nodeId is not in the source network                 |
| `GL2`      | An edgeId is not in the source network                |
| `APP9`     | `nodeIds` empty, or an edge endpoint not in `nodeIds` |

#### `createNetworkFromCx2(props): ApiResult<{ networkId, cyNetwork }>`

Creates a network from a CX2 document. Validates the CX2 structure before
importing. Infers network name and description from CX2 `networkAttributes`.

If `addToWorkspace: true`, adds to WorkspaceStore (fires `network:created`).
If `navigate: true`, sets as current network (fires `network:switched`).

| Error Code | Condition                        |
| ---------- | -------------------------------- |
| `APP8`     | CX2 structural validation failed |

#### `deleteNetwork(networkId, options?): ApiResult`

Deletes a network through the shared deletion orchestrator. `navigate` is
retained for source compatibility but is ignored: deleting the current network
always repairs `currentNetworkId`, while deleting a non-current network never
switches the active network. Fires `network:deleted`; deleting the current
network also fires `network:switched` when the repaired ID differs.

| Error Code | Condition                  |
| ---------- | -------------------------- |
| `APP1`     | `networkId` does not exist |

#### `deleteCurrentNetwork(options?): ApiResult`

Deletes the currently active network. Delegates to `deleteNetwork`.

| Error Code | Condition                        |
| ---------- | -------------------------------- |
| `APP2`     | No network is currently selected |

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

#### `additiveSelect(networkId, nodeIds, edgeIds): ApiResult`

Adds the specified nodes and edges to the current selection.

#### `additiveDeselect(networkId, nodeIds, edgeIds): ApiResult`

Removes the specified nodes and edges from the current selection.

#### `toggleSelected(networkId, nodeIds, edgeIds): ApiResult`

Toggles the selection state of each specified node and edge.

#### `clearSelection(networkId): ApiResult`

Clears the entire selection (deselects all nodes and edges).

#### `getSelection(networkId): ApiResult<SelectionState>`

Returns the current selection state.

All methods return `APP1` if the view model for `networkId` is not found.

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

| Error Code | Condition                                     |
| ---------- | --------------------------------------------- |
| `APP1`     | `networkId` does not exist                    |
| `APP5`     | Fit function not yet registered for this view |

#### `getNodePositions(networkId, nodeIds?): ApiResult<{ positions: PositionRecord; missing: IdType[] }>`

Returns current `[x, y, z?]` positions. When `nodeIds` is omitted, every node's
position is returned. Requested ids with no view model entry are reported in
`missing` rather than silently dropped (symmetric with `elementApi.getNodes`).

| Error Code | Condition                  |
| ---------- | -------------------------- |
| `APP1`     | `networkId` does not exist |

#### `updateNodePositions(networkId, positions): ApiResult`

Bulk-updates node positions in the view model. Accepts a `PositionRecord`
(plain object) and converts it internally to a `Map` before writing to the store.
Rejects (does not partially apply) if any key is not a node ID in the network.

| Error Code | Condition                                   |
| ---------- | ------------------------------------------- |
| `APP1`     | `networkId` does not exist                  |
| `GL1`      | A position key is not a node in the network |

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
  id: IdType // element ID (node or edge)
  column: AttributeName
  value: ValueType
}
```

Write operations (`setValue`, `setValues`, `editRows`, etc.) trigger `data:changed`
via the Event Bus (the TableStore subscription in `initEventBus` fires automatically).

### Methods

#### `getValue(networkId, tableType, elementId, column): ApiResult<{ value: ValueType }>`

Returns the value of a single cell. On edge tables, the `source` and `target`
pseudo-columns are resolved from the network model (matching `getTable` /
`getColumns`).

| Error Code  | Condition                                          |
| ----------- | -------------------------------------------------- |
| `APP1`      | `networkId` does not exist                         |
| `GL1`/`GL2` | `elementId` row not found (`GL1` node, `GL2` edge) |
| `APP10`     | `column` is not declared and absent from the row   |

#### `getRow(networkId, tableType, elementId): ApiResult<{ row: Record<AttributeName, ValueType> }>`

Returns the full attribute row for a single element. Same error codes as `getValue`.

#### `createColumn(networkId, tableType, columnName, dataType, defaultValue): ApiResult`

Creates a new column with the given data type and default value. The
`defaultValue` is validated against the declared `dataType`. The
`data:changed` event reports the name in `addedColumns` and includes any rows
whose values changed.

| Error Code  | Condition                                                   |
| ----------- | ----------------------------------------------------------- |
| `APP1`      | `networkId` does not exist                                  |
| `FK1`/`FK2` | `columnName` is `"id"` (`FK1` node table, `FK2` edge table) |
| `A8`        | `columnName` is `"s"`/`"t"` on an edge table                |
| `AC6`       | `columnName` already exists on this table                   |
| `A6`        | `defaultValue` is `null` or `undefined`                     |
| `A1`        | `defaultValue` does not match the declared `dataType`       |

#### `deleteColumn(networkId, tableType, columnName): ApiResult`

Deletes a column. Cascades: removes any visual style mapping referencing the
column, and removes the column from the Table Browser display config. The
`data:changed` event reports the name in `removedColumns` and includes affected
rows.

| Error Code | Condition                                |
| ---------- | ---------------------------------------- |
| `APP1`     | `networkId` does not exist               |
| `APP10`    | `columnName` does not exist in the table |

#### `renameColumn(networkId, tableType, currentName, newName): ApiResult`

Renames a column. Cascades: retargets any visual style mapping referencing the
column, and updates the Table Browser display config. Renaming to the current
name is a no-op, not a collision. The `data:changed` event reports the old name
in `removedColumns`, the new name in `addedColumns`, and any affected rows.

| Error Code  | Condition                                                |
| ----------- | -------------------------------------------------------- |
| `APP1`      | `networkId` does not exist                               |
| `FK1`/`FK2` | `newName` is `"id"` (`FK1` node table, `FK2` edge table) |
| `A8`        | `newName` is `"s"`/`"t"` on an edge table                |
| `APP10`     | `currentName` does not exist in the table                |
| `AC6`       | `newName` already exists and differs from `currentName`  |

#### `setValue(networkId, tableType, elementId, column, value): ApiResult`

Sets a single cell value. Triggers `data:changed`.

| Error Code  | Condition                                            |
| ----------- | ---------------------------------------------------- |
| `APP1`      | `networkId` does not exist                           |
| `GL1`/`GL2` | `elementId` not found (`GL1` node, `GL2` edge)       |
| `A1`        | `value` does not match the declared type of `column` |

#### `setValues(networkId, tableType, cellEdits): ApiResult`

Bulk cell edit. Converts `CellEdit[]` (app format, uses `id`) to the store format
(uses `row`) internally. Rejects the whole batch (no partial application) if
any edit fails validation. Triggers `data:changed`.

| Error Code  | Condition                                                    |
| ----------- | ------------------------------------------------------------ |
| `APP1`      | `networkId` does not exist                                   |
| `GL1`/`GL2` | Any edit's `id` not found (`GL1` node, `GL2` edge)           |
| `A1`        | Any edit's `value` does not match its column's declared type |

#### `editRows(networkId, tableType, rows): ApiResult`

Bulk row edit via a `Record<IdType, Record<AttributeName, ValueType>>`.
Converts to `Map` internally. Rejects the whole batch if any value fails
validation. Triggers `data:changed`.

| Error Code  | Condition                                           |
| ----------- | --------------------------------------------------- |
| `APP1`      | `networkId` does not exist                          |
| `GL1`/`GL2` | Any row's key not found (`GL1` node, `GL2` edge)    |
| `A1`        | Any value does not match its column's declared type |

#### `applyValueToElements(networkId, tableType, columnName, value, elementIds?): ApiResult`

Sets the same value for all specified elements (or all elements if `elementIds`
is omitted). Triggers `data:changed`.

| Error Code  | Condition                                                |
| ----------- | -------------------------------------------------------- |
| `APP1`      | `networkId` does not exist                               |
| `GL1`/`GL2` | An `elementIds` entry not found (`GL1` node, `GL2` edge) |
| `A1`        | `value` does not match the declared type of `columnName` |

### Bulk Read

#### `getColumns(networkId, tableType): ApiResult<{ columns: ColumnInfo[] }>`

Returns only the column definitions (the table schema) without loading any
rows. Prefer this over `getTable` when you only need the schema — on large
tables `getTable` materializes every row. Edge tables include the `source`
and `target` pseudo-columns, matching `getTable`'s output.

#### `getTable(networkId, tableType, options?): ApiResult<{ columns, rows }>`

Returns all columns (with type metadata) and all rows for the given table.
By default a leading `id` column is prepended and every row carries an `id`
field, so rows are round-trippable back to their nodes/edges. For edge tables,
`source` and `target` columns follow (read from the network model, not from the
table itself).

**Options:**

- `columns?: string[]` — return only these columns (omit = all)
- `includeId?: boolean` — include the element `id` column and per-row `id`
  field. Default: `true`. Set `false` for a data-only result.

```typescript
const result = tableApi.getTable(networkId, 'node')
if (result.success) {
  result.data.columns // [{ name: 'id', type: 'string' }, { name: 'name', type: 'string' }, { name: 'degree', type: 'long' }]
  result.data.rows // [{ id: 'n1', name: 'TP53', degree: 42 }, ...]
}
```

### TSV I/O

#### `exportTableToTsv(networkId, tableType, options?): ApiResult<{ tsvText }>`

Serializes the table to a tab-separated values string. Useful for interop with
pandas, R, and other external tools.

**Options:**

- `columns?: string[]` — export only these columns
- `includeTypeHeader?: boolean` — `true` → `name:string\tscore:double` (Cytoscape
  Desktop format for lossless round-trip). Default: `false` (plain column names).
- `includeId?: boolean` — emit a leading `id` column holding each element's id.
  Default: `true`, so the export round-trips through `importTableFromTsv` (whose
  default `keyColumn` is `id`) with no manual id insertion. Set `false` for a
  data-only export.

For edge tables, `source` and `target` columns are always included.

```typescript
const result = tableApi.exportTableToTsv(networkId, 'node')
if (result.success) {
  console.log(result.data.tsvText)
  // id\tname\tscore
  // n1\tTP53\t0.95
  // n2\tBRCA1\t0.73
}
```

#### `importTableFromTsv(networkId, tableType, tsvText, options?): ApiResult<{ rowCount, newColumns, skippedRows, skippedCells }>`

Parses a TSV string and writes data into the table. New column names are
validated up front (before anything is mutated), so a forbidden name fails the
import cleanly instead of leaving some columns created; valid missing columns
are then created as needed. Matches rows by resolving the key column's value to
element IDs — TSV rows whose key value matches no element are skipped (never
creating orphaned rows) and their key values are returned in `skippedRows`.

Cell values are parsed strictly against the column's type, with no coercion
(matching `setValue`/`setValues`):

- A non-empty cell that cannot be parsed as its column type is **skipped** and
  reported in `skippedCells` (as `{ key, column, value }`) rather than coerced
  to `0`/`false`.
- An empty cell for a non-string column is treated as "no value provided" and
  leaves the existing attribute untouched.

**Options:**

- `keyColumn?: string` — column in the TSV to use as element ID (default: `'id'`)

Auto-detects typed headers (`name:string\tscore:double`) if present. Otherwise
infers types from the first few data rows.

```typescript
const tsv = 'id\tcluster\tpagerank\nn1\t0\t0.042\nn2\t1\t0.015'
const result = tableApi.importTableFromTsv(networkId, 'node', tsv)
if (result.success) {
  console.log(result.data.newColumns) // ['cluster', 'pagerank']
  console.log(result.data.rowCount) // 2
  console.log(result.data.skippedRows) // [] — no unmatched key values
  console.log(result.data.skippedCells) // [] — no unparseable cells
}
```

| Error Code  | Condition                                             |
| ----------- | ----------------------------------------------------- |
| `APP1`      | Table record for `networkId` not found                |
| `APP9`      | TSV has < 2 lines or key column missing               |
| `FK1`/`FK2` | A new column is named `"id"` (`FK1` node, `FK2` edge) |
| `A8`        | A new column is named `"s"`/`"t"` on an edge table    |

All methods in this API return `APP1` if the table record for `networkId` is not found.

---

## VisualStyleApi (`cyweb/VisualStyleApi`)

Reads and modifies visual style properties.

```typescript
import { useVisualStyleApi } from 'cyweb/VisualStyleApi'
import { VisualPropertyName } from 'cyweb/ApiTypes'
```

All write methods trigger `style:changed` via the Event Bus (the VisualStyleStore
subscription in `initEventBus` fires on any property change).

### Types

```typescript
/** One visual property's identity and scope, from getVisualProperties(). */
interface VisualPropertyInfo {
  name: VisualPropertyName
  group: 'node' | 'edge' | 'network'
  type: VisualPropertyValueTypeName // e.g. 'color', 'number', 'string'
  hasMapping: boolean // true when the property has a mapping
}

/** Options bundle for createContinuousMapping. */
interface CreateContinuousMappingOptions {
  vpType: VisualPropertyValueTypeName // property's value type
  attribute: AttributeName // source table column
  attributeValues: ValueType[] // numeric anchors (min…max)
  attributeType: ValueTypeName // declared type of the column
  controlPoints?: ContinuousFunctionControlPoint[] // override interpolation points
  ltMinVpValue?: VisualPropertyValueType // value below the minimum anchor
  gtMaxVpValue?: VisualPropertyValueType // value above the maximum anchor
}
```

### Read Methods

#### `getVisualProperties(networkId): ApiResult<{ properties: VisualPropertyInfo[] }>`

Lists every visual property in the network's style, each with its `name`,
`group` (node/edge/network), value `type`, and whether it currently has a
mapping (`hasMapping`).

#### `getDefault(networkId, vpName): ApiResult<{ value }>`

Reads the default value of a visual property.

#### `getBypass(networkId, vpName, elementId): ApiResult<{ value }>`

Reads a single element's bypass for a property. `value` is `undefined` when the
element has no bypass for that property.

#### `getBypasses(networkId, vpName): ApiResult<{ bypasses: Record<elementId, value> }>`

Reads every bypass set for a property, keyed by element id. Returns an empty
object when the property has no bypasses.

#### `getMapping(networkId, vpName): ApiResult<{ mapping }>`

Reads the mapping installed on a property. `mapping` is `undefined` when the
property has no mapping.

**Common errors for read methods:**

| Error Code | Condition                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| `APP1`     | `networkId` has no visual style                                                                                     |
| `APP9`     | `vpName` is not a known visual property (the `vpName`-scoped reads only; `getVisualProperties` returns only `APP1`) |

### Write Methods

#### `setDefault(networkId, vpName, vpValue): ApiResult`

Sets the default value for a visual property (applies to all elements without a
bypass or mapping). `vpValue` is validated against the property's declared value
type before being written.

| Error Code                                             | Condition                                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `APP1`                                                 | `networkId` does not exist                                                             |
| `APP9`                                                 | `vpName` is not a known visual property                                                |
| `VP1`/`VP2`/`VP3`/`VP4`/`VP5`/`VP6`/`VP7`/`VP9`/`VP10` | `vpValue` invalid for the property's value type (see [ErrorCodes.md](./ErrorCodes.md)) |

#### `setDefaults(networkId, defaults): ApiResult`

Sets several visual-property defaults in one call, where `defaults` is a
`Partial<Record<VisualPropertyName, value>>`. Every entry is validated first
(property existence and value type); if any is invalid, **nothing** is applied,
so a bad value can't leave a half-updated style. Same error codes as
`setDefault`.

#### `setBypass(networkId, vpName, elementIds, vpValue): ApiResult`

Sets a per-element override. `elementIds` must be non-empty and must match the
property's node/edge scope; network-scoped properties cannot be bypassed.

| Error Code   | Condition                                                                    |
| ------------ | ---------------------------------------------------------------------------- |
| `APP1`       | `networkId` does not exist                                                   |
| `APP9`       | `elementIds` is empty, or `vpName` is not a known property                   |
| `BV5`        | `vpName` is a network-scoped property                                        |
| `BV1`        | An `elementIds` entry does not exist in the network                          |
| `BV2`        | An `elementIds` entry doesn't match the property's node/edge scope           |
| `VP1`–`VP10` | `vpValue` invalid for the property's value type (same codes as `setDefault`) |

#### `setBypasses(networkId, elementIds, bypasses): ApiResult`

Sets several visual-property bypasses on the same `elementIds` in one call —
e.g. highlighting nodes with color + border + size at once. `bypasses` is a
`Partial<Record<VisualPropertyName, value>>`. Every property is validated first
(existence, node/edge scope, value type, and element existence); if any is
invalid, **nothing** is applied. Same error codes as `setBypass`.

#### `deleteBypass(networkId, vpName, elementIds): ApiResult`

Removes per-element overrides. Intentionally unguarded against non-existent
element IDs, so cleanup of stale bypasses (e.g. after external deletion) always
succeeds.

| Error Code | Condition                  |
| ---------- | -------------------------- |
| `APP1`     | `networkId` does not exist |

#### `createDiscreteMapping(networkId, vpName, attribute, attributeType, mapping?): ApiResult`

Creates a discrete (lookup-table) mapping for `vpName` based on the specified
node/edge attribute. `mapping` is an optional `Record<string, VisualPropertyValueType>`
of attribute-value keys (stringified; parsed back to `integer`/`long`/`double` per
`attributeType`) to visual property values.

| Error Code | Condition                                                   |
| ---------- | ----------------------------------------------------------- |
| `APP1`     | `networkId` does not exist                                  |
| `MC1`      | `vpName` is a network-scoped property                       |
| `MI1`      | `attribute` is not declared in the matching node/edge table |
| `MI2`      | `attributeType` does not match the declared column type     |

#### `createContinuousMapping(networkId, vpName, options): ApiResult`

Creates a continuous (interpolated) mapping. `options` is a
`CreateContinuousMappingOptions` bundle (see [Types](#types)) — the correlated
values are passed as one object rather than positionally.
`options.attributeValues` defines the control point values on the data axis. By
default, `min`/`max`/`controlPoints`/`ltMinVpValue`/`gtMaxVpValue` are computed
automatically from `attributeValues` and `vpType`. Pass `controlPoints` to
override the interpolation points (`min`/`max` are derived from the first/last
entries); pass `ltMinVpValue`/`gtMaxVpValue` to override the values used
below/above the range.

```typescript
visualStyleApi.createContinuousMapping(networkId, 'NODE_BACKGROUND_COLOR', {
  vpType: 'color',
  attribute: 'degree',
  attributeValues: [0, 50, 100],
  attributeType: 'long',
})
```

| Error Code | Condition                                                              |
| ---------- | ---------------------------------------------------------------------- |
| `APP1`     | `networkId` does not exist                                             |
| `MC1`      | `vpName` is a network-scoped property                                  |
| `MI1`      | `attribute` is not declared in the matching node/edge table            |
| `MI2`      | `attributeType` does not match the declared column type                |
| `MI3`      | The source column is non-numeric                                       |
| `V7`       | `attributeValues` empty/non-numeric, or a control point is non-numeric |

#### `createPassthroughMapping(networkId, vpName, attribute, attributeType): ApiResult`

Creates a passthrough mapping (attribute value used directly as the visual value).

| Error Code | Condition                                                   |
| ---------- | ----------------------------------------------------------- |
| `APP1`     | `networkId` does not exist                                  |
| `MC1`      | `vpName` is a network-scoped property                       |
| `MI1`      | `attribute` is not declared in the matching node/edge table |
| `MI2`      | `attributeType` does not match the declared column type     |

#### `deleteMapping(networkId, vpName): ApiResult`

Removes any mapping for the specified visual property.

All methods in this API return `APP1` if the visual style for `networkId` is not found.

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
  algorithmName?: string // default: LayoutStore.preferredLayout
  fitAfterLayout?: boolean // default: true
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

Never throws across the API boundary: if the layout engine throws synchronously
(or its callback throws), the promise resolves to `fail(APP3)` and
`LayoutStore.isRunning` is reset to `false` rather than leaving the rejection to
escape.

| Error Code | Condition                                |
| ---------- | ---------------------------------------- |
| `APP1`     | `networkId` does not exist               |
| `APP4`     | No engine registered for `algorithmName` |
| `APP3`     | The layout engine or its callback threw  |

#### `getAvailableLayouts(): ApiResult<{ layouts: LayoutAlgorithmInfo[] }>`

Returns all registered layout algorithms across all engines. There are no
validation failures to report — an empty engine registry yields
`ok({ layouts: [] })` — but the call is still wrapped like every other, so an
unexpected store error resolves to `fail(APP3)`. Handle both branches of the
`ApiResult`.

---

## ExportApi (`cyweb/ExportApi`)

Exports networks to portable formats.

```typescript
import { useExportApi } from 'cyweb/ExportApi'
```

### Types

```typescript
type Cx2 = any[] // CX2 format: array of aspect objects

interface ExportOptions {
  networkName?: string // override the network name in the exported CX2
}
```

### Methods

#### `exportToCx2(networkId, options?): ApiResult<Cx2>`

Assembles the network from NetworkStore, TableStore, VisualStyleStore, ViewModelStore,
OpaqueAspectStore, and NetworkSummaryStore, then serializes to CX2 format.

| Error Code | Condition                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `APP1`     | Network, tables, visual style, or view model not found — all four checks collapse to this one code (see [ErrorCodes.md](./ErrorCodes.md)) |

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
  currentNetworkId: IdType // '' if no networks are open
  networkCount: number
}

interface WorkspaceNetworkInfo {
  networkId: IdType
  name: string
  description: string
  nodeCount: number
  edgeCount: number
  isModified: boolean // true when the network has unsaved local changes
}
```

### Methods

#### `getWorkspaceInfo(): ApiResult<WorkspaceInfo>`

Returns top-level metadata. Always succeeds.

#### `getNetworkIds(): ApiResult<{ networkIds: IdType[] }>`

Returns the ordered list of network IDs (tab order). Always succeeds (empty array
when no networks are open).

#### `getNetworks(): ApiResult<{ networks: WorkspaceNetworkInfo[] }>`

Returns summary metadata for all networks. Networks whose summary is not found in
NetworkSummaryStore are **silently omitted**.

#### `getNetworkSummary(networkId): ApiResult<WorkspaceNetworkInfo>`

Returns summary metadata for a single network.

| Error Code | Condition                                              |
| ---------- | ------------------------------------------------------ |
| `APP1`     | `networkId` is not in the workspace or summary missing |

#### `getCurrentNetworkId(): ApiResult<{ networkId: IdType }>`

Returns the currently active network ID.

| Error Code | Condition            |
| ---------- | -------------------- |
| `APP2`     | No networks are open |

#### `switchCurrentNetwork(networkId): ApiResult`

Switches the active network. Triggers `network:switched` via the Event Bus.

| Error Code | Condition                           |
| ---------- | ----------------------------------- |
| `APP9`     | `networkId` is empty/whitespace     |
| `APP1`     | `networkId` is not in the workspace |

#### `setWorkspaceName(name): ApiResult`

Renames the workspace. The name is trimmed before being stored.

| Error Code | Condition                      |
| ---------- | ------------------------------ |
| `APP9`     | `name` is empty after trimming |

---

## ContextMenuApi

> **Phase 2 change:** `cyweb/ContextMenuApi` and `useContextMenuApi()` have been removed.
> Context menu access is now via `AppContext.apis.contextMenu` (per-app factory, lifecycle-managed)
> or `window.CyWebApi.contextMenu` (anonymous singleton, for non-React consumers only).

Allows external apps to register and remove custom items in the host's context
menus (right-click on nodes, edges, or the canvas background).

```typescript
// In mount() — per-app factory (recommended for plugin apps)
mount({ apis }) {
  apis.contextMenu.addContextMenuItem({ ... })
}

// In plugin components — via useAppContext()
import { useAppContext } from 'cyweb/AppIdContext'
const ctx = useAppContext()
ctx?.apis.contextMenu.addContextMenuItem({ ... })

// Non-React consumers — anonymous singleton (no auto-cleanup)
window.CyWebApi.contextMenu.addContextMenuItem({ ... })
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

Items registered via `AppContext.apis.contextMenu` are automatically cleaned up
when the app is disabled or mount() fails (via `cleanupAllForApp`). Explicit
removal in `unmount()` is redundant but harmless.

| Error Code | Condition                      |
| ---------- | ------------------------------ |
| `APP9`     | `label` is empty or whitespace |

#### `removeContextMenuItem(itemId): ApiResult`

Removes a previously registered context menu item.

| Error Code | Condition           |
| ---------- | ------------------- |
| `APP6`     | `itemId` is unknown |

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

  // unmount() is optional — context menu items registered via
  // AppContext.apis.contextMenu are automatically cleaned up when
  // the app is disabled. Only add unmount() if you have manual
  // event listeners to remove.
  unmount() {
    // No need to remove context menu items — auto-cleaned by host.
  },
}
```

---

## NodeGraphicsApi

Register one function that Cytoscape Web calls with each node whose data changed.
Return an image and the host draws it as that node's `background-image`.

Access is via `AppContext.apis.nodeGraphics` (per-app factory, lifecycle-managed)
or `window.CyWebApi.nodeGraphics` (anonymous singleton, non-React consumers only).
There is no `cyweb/NodeGraphicsApi` Module Federation expose.

> **Hook images are never exported to CX2.** They are renderer-only, applied as
> Cytoscape.js element style bypasses. Vizmapper custom graphics
> (`nodeImageChart1..9`) still export exactly as before. See
> `docs/design/custom-graphics-image/node-graphics-render-hook.md`.

```typescript
// In mount() — per-app factory (recommended for plugin apps)
mount({ apis }) {
  apis.nodeGraphics.setRenderHook(({ nodeId, attributes }) => {
    const pct = Number(attributes.confidence)
    if (!Number.isFinite(pct)) return null   // leave this node to the Vizmapper
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
      <circle cx='50' cy='50' r='48' fill='none' stroke='#4caf50'
              stroke-width='4' stroke-dasharray='${pct * 302} 302'/>
    </svg>`
  })
}

// Non-React consumers — anonymous singleton (no auto-cleanup)
window.CyWebApi.nodeGraphics.setRenderHook((req) => '…')
```

### Types

```typescript
interface NodeGraphicsRequest {
  networkId: IdType
  nodeId: IdType
  /** Shallow copy of the node's table row. Writes to it are ignored. */
  attributes: Record<string, ValueType>
  /** Current node size in model units, when the view model has it. */
  width?: number
  height?: number
}

interface NodeGraphicsImage {
  /**
   * An `http(s)://` URL, a `data:` URI, or raw `<svg>` markup.
   * `blob:` and `file:` are rejected.
   */
  image: string
  /** @default 'contain' */
  fit?: 'contain' | 'cover' | 'none'
  /** 0..1. @default 1 */
  opacity?: number
  /** @default 'null' — loads without CORS, but taints the canvas. */
  crossOrigin?: 'anonymous' | 'use-credentials' | 'null'
  /**
   * 'inside' draws under pie/ring charts; 'over' draws above them.
   * @default 'inside'
   */
  containment?: 'inside' | 'over'
}

/** A bare string is shorthand for `{ image }`. `null` means "no image". */
type NodeGraphicsResult = string | NodeGraphicsImage | null | undefined

/** Synchronous. Must not throw. */
type NodeGraphicsRenderHook = (
  request: NodeGraphicsRequest,
) => NodeGraphicsResult
```

### Hook contract

- **Synchronous.** For images needing async work (a fetch, an offscreen render),
  compute and cache in your own code, then call `refresh()` so the hook can
  return the cached value.
- **Must not throw.** A throw yields no image for that node. After 20 throws or
  slow calls (>16 ms) the hook is disabled for the rest of the session.
- **Return `null` to decline a node.** It falls back to its Vizmapper custom
  graphic, if any. With several apps registered, hooks run in registration order
  and the first non-`null` result wins.
- **Prefer stable URLs over freshly generated data URIs.** Cytoscape retains one
  image per distinct URL with no eviction. The host caps a network at 2000
  distinct images and warns once when it stops accepting new ones.

### When the hook runs

Automatically on: renderer mount, network switch, hook registration, and any node
table edit (including undo and redo). Deleted nodes have their image dropped
without a hook call. Call `refresh()` for anything the host cannot observe —
your own state.

### Methods

#### `setRenderHook(hook): ApiResult<{ hookId: string }>`

Registers the hook, replacing any hook this caller previously registered. Hooks
registered via `AppContext.apis.nodeGraphics` are removed automatically, along
with every image they produced, when the app is disabled.

| Error Code | Condition                |
| ---------- | ------------------------ |
| `VP9`      | `hook` is not a function |

#### `clearRenderHook(): ApiResult`

Removes this caller's hook and every image it produced. Affected nodes fall back
to their Vizmapper custom graphics.

| Error Code | Condition                          |
| ---------- | ---------------------------------- |
| `APP5`     | This caller has no hook registered |

One app cannot clear another app's hook, and the anonymous singleton cannot clear
an app-owned hook.

#### `refresh(networkId?, nodeIds?): ApiResult<{ nodeCount: number }>`

Re-runs the hook. Omit `networkId` for the workspace's current network; omit
`nodeIds` for every node.

| Error Code | Condition                                |
| ---------- | ---------------------------------------- |
| `APP5`     | This caller has no hook registered       |
| `APP2`     | No `networkId` given and none is current |
| `APP1`     | `networkId` is unknown                   |

### Example — an image driven by the app's own state

```typescript
let currentThreshold = 0.5
const cache = new Map<string, string>()

export const MyApp: CyAppWithLifecycle = {
  mount(context) {
    // Synchronous: read from the cache the app fills elsewhere.
    context.apis.nodeGraphics.setRenderHook(({ nodeId, attributes }) =>
      Number(attributes.score) >= currentThreshold
        ? (cache.get(nodeId) ?? null)
        : null,
    )

    onSliderChange(async (value) => {
      currentThreshold = value
      await fillCache(cache, value) // async work lives here, not in the hook
      // Ask the host to re-run the hook now that the cache is warm.
      context.apis.nodeGraphics.refresh()
    })
  },

  // No unmount needed — the hook and its images are auto-cleaned on disable.
}
```

### Example — remote images from a STRING network

STRING networks carry two node-image columns. Both need handling the contract
above does not do for you.

| Column                   | Value shape                                                                    |
| ------------------------ | ------------------------------------------------------------------------------ |
| `stringdb::imageurl`     | `https://version-12-0.string-db.org//images/Proteinpictures/pdb/1f/1fgu_A.png` |
| `stringdb::STRING style` | `string:data:image/png;base64,iVBORw0KGgo…`                                    |

```typescript
// `string:` is a STRING namespace marker, not part of the URI. Without stripping
// it the value is an unrecognised scheme and the node silently gets no image.
const strip = (v: unknown): string =>
  String(v).replace(/^string:(?=data:|https?:)/, '')

apis.nodeGraphics.setRenderHook(({ attributes }) => {
  const raw =
    attributes['stringdb::STRING style'] ?? attributes['stringdb::imageurl']
  if (raw == null) return null

  return {
    image: strip(raw),
    fit: 'contain',
    // Required for the remote host — it sends no CORS header. See below.
    crossOrigin: 'null',
  }
})
```

Two things measured against the live host, both of which look like "the feature
is broken" when hit:

- **The `string:` prefix is rejected.** `normalizeImageSource` classifies
  `string:data:…` as `unrecognized`, so the hook's return value is discarded.
- **The structure-image host sends no `Access-Control-Allow-Origin`.** It answers
  `200 image/png` (33,667 bytes), so the URL is fine — but
  `crossOrigin: 'anonymous'` fails to load it at all. `'null'` works and taints
  the canvas, which means Cytoscape omits that image from `cy.png()`. The base64
  value is same-origin and survives PNG export either way.

When adding any new remote source, preflight it with an `Image()` under both
`crossOrigin` modes before concluding anything about the hook.

Both STRING images are 240×240. Rasters skip the SVG size wrapper entirely, so
Cytoscape's `background-fit` sizes them natively and their aspect ratio is
preserved; on the default 75×35 node a square image letterboxes to a 35px square.

### Interaction with Vizmapper custom graphics

| Situation                                         | Result                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Hook returns an image, node has a Vizmapper image | Hook wins                                                                       |
| Hook returns `null`                               | Vizmapper image shows                                                           |
| `clearRenderHook()`                               | Vizmapper image returns on the next restyle                                     |
| Node has a Vizmapper **pie or ring** chart        | The chart draws **on top** of a hook image unless you set `containment: 'over'` |

The last row is Cytoscape's node draw order (shape → images(inside) → border →
pie → stripe → images(over)), and matches how two Vizmapper slots already behave.

---

## ResourceApi (`cyweb/AppIdContext`)

Per-app resource registration API for panels and menu items. Available via
`useAppContext().apis.resource` in plugin components or `context.apis.resource`
in `mount()`. Not available on `window.CyWebApi`.

```typescript
import { useAppContext } from 'cyweb/AppIdContext'

function MyComponent() {
  const ctx = useAppContext()
  if (!ctx) return null
  const { resource } = ctx.apis
  // resource.registerPanel(...), resource.getRegisteredResources(), etc.
}
```

### Types

```typescript
type ResourceSlot = 'right-panel' | 'apps-menu'

interface ResourceDeclaration {
  slot: ResourceSlot
  id: string
  title?: string
  order?: number
  group?: string
  requires?: { network?: boolean; selection?: boolean }
  component: React.ComponentType<any>
  errorFallback?: React.ComponentType<{
    error: Error
    resetErrorBoundary: () => void
  }>
  closeOnAction?: boolean // apps-menu only
}

interface RegisteredResourceInfo {
  resourceId: string // identity triple: appId::slot::id
  slot: ResourceSlot
  id: string
  title?: string
  order?: number
  requires?: { network?: boolean; selection?: boolean }
}

interface ResourceVisibilityResult {
  registered: boolean
  visible: boolean
  hiddenReason?:
    | 'app-inactive'
    | 'requires-network'
    | 'requires-selection'
    | 'slot-not-rendered'
}
```

### Methods

#### `getSupportedSlots(): ApiResult<{ slots: ResourceSlot[] }>`

Returns the slots the host supports. Currently `['right-panel', 'apps-menu']`.

#### `registerPanel(options): ApiResult<{ resourceId: string }>`

Registers a panel in the `'right-panel'` slot. Uses upsert semantics: if a
panel with the same `id` is already registered by this app, it is replaced
in place (preserving tab selection).

| Error Code | Condition                                      |
| ---------- | ---------------------------------------------- |
| `APP9`     | `id` empty, `component` not a valid React type |

#### `unregisterPanel(panelId): ApiResult`

Removes a panel. Returns `APP7` if the panel is not registered.

#### `registerMenuItem(options): ApiResult<{ resourceId: string }>`

Registers a menu item in the `'apps-menu'` slot. Uses upsert semantics. Same
error codes as `registerPanel`.

#### `unregisterMenuItem(menuItemId): ApiResult`

Removes a menu item. Returns `APP7` if the menu item is not registered.

#### `unregisterAll(): ApiResult`

Removes all resources registered by this app.

#### `registerAll(entries): ApiResult<{ registered, errors }>`

Batch registration. Always returns `ok()`. Check `result.data.errors` for
partial failures.

```typescript
const result = apis.resource.registerAll([
  { slot: 'right-panel', id: 'Panel', component: MyPanel },
  { slot: 'apps-menu', id: 'Menu', component: MyMenu },
])
if (result.success && result.data.errors.length > 0) {
  console.warn('Partial failures:', result.data.errors)
}
```

#### `getRegisteredResources(): ApiResult<{ resources: RegisteredResourceInfo[] }>`

Returns all resources registered by this app. Useful for debugging.

#### `getResourceVisibility(id): ApiResult<ResourceVisibilityResult>`

Returns the visibility evaluation for a specific resource. Evaluates:

1. App active status
2. `requires.network` — hidden when no network is loaded
3. `requires.selection` — hidden when nothing is selected, evaluated against the
   current network's live selection

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

`initEventBus()` is called once after store hydration in `src/features/AppShell.tsx`. It wires
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
detail: {
  networkId: IdType
}
```

Source: WorkspaceStore subscription (`workspace.networkIds`).

#### `network:deleted`

Fired when a network is removed from the workspace.

```typescript
detail: {
  networkId: IdType
}
```

Source: WorkspaceStore subscription (`workspace.networkIds`).

#### `network:changed`

Fired when nodes or edges are added to or removed from an existing network.
Whole-network creation/deletion and attribute-only changes are excluded.

```typescript
detail: {
  networkId: IdType
  addedNodeIds: IdType[]
  removedNodeIds: IdType[]
  addedEdgeIds: IdType[]
  removedEdgeIds: IdType[]
}
```

Source: NetworkStore subscription (`networks` selector and element-ID diff).

#### `network:switched`

Fired when the active (current) network changes.
`previousId` is an empty string if no network was active before.

```typescript
detail: {
  networkId: IdType
  previousId: IdType
}
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
detail: {
  networkId: IdType
  algorithm: string
}
```

Source: `layoutApi.applyLayout` (dispatched directly, not via store subscription).

#### `layout:completed`

Fired when a layout algorithm finishes and node positions are updated.

```typescript
detail: {
  networkId: IdType
  algorithm: string
}
```

Source: `layoutApi.applyLayout` (dispatched directly, not via store subscription).

#### `style:changed`

Fired when a visual style property changes on any network.
`property` is a `VisualPropertyName` string (e.g., `'nodeBackgroundColor'`).
One event is fired per changed property per network per store update.

```typescript
detail: {
  networkId: IdType
  property: string
}
```

Source: VisualStyleStore subscription (full-state diff, no `subscribeWithSelector`).

#### `data:changed`

Fired when table data or schema changes in a network's node or edge table.
`rowIds` lists changed node/edge IDs. `addedColumns` and `removedColumns`
describe schema changes; a rename produces one entry in each. Column operations
may also populate `rowIds`.

```typescript
detail: {
  networkId: IdType
  tableType: 'node' | 'edge'
  rowIds: IdType[]
  addedColumns: string[]
  removedColumns: string[]
}
```

Source: TableStore subscription (`tables` selector).
Also triggered by TableApi write methods.

### Event Dispatch Table

| API Method / Store Mutation                                                                                                | Events Fired                                                                             |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `networkApi.createNetworkFromEdgeList` / `createNetworkFromNodeList` (addToWorkspace: true)                                | `network:created`, `network:switched`                                                    |
| `networkApi.createNetworkFromCx2` (addToWorkspace: true)                                                                   | `network:created`                                                                        |
| `networkApi.createNetworkFromCx2` (navigate: true)                                                                         | `network:switched`                                                                       |
| `networkApi.deleteNetwork`                                                                                                 | `network:deleted`; `network:switched` only when deleting the current network             |
| `networkApi.deleteAllNetworks`                                                                                             | `network:deleted` (×N)                                                                   |
| `elementApi.createNode` / `createNodes` / `createEdge` / `createEdges` / `deleteNodes` / `deleteEdges`                     | `network:changed`; coordinated table/style/selection mutations may emit their own events |
| `workspaceApi.switchCurrentNetwork`                                                                                        | `network:switched`                                                                       |
| `selectionApi.exclusiveSelect` / `additiveSelect` / `additiveDeselect` / `toggleSelected` / `clearSelection`               | `selection:changed`                                                                      |
| `layoutApi.applyLayout`                                                                                                    | `layout:started`, `layout:completed`                                                     |
| `visualStyleApi.setDefault` / `setBypass` / `deleteBypass` / `create*Mapping` / `deleteMapping`                            | `style:changed` (×per property)                                                          |
| `tableApi.setValue` / `setValues` / `editRows` / `createColumn` / `deleteColumn` / `renameColumn` / `applyValueToElements` | `data:changed`                                                                           |
| `contextMenuApi.addContextMenuItem` / `removeContextMenuItem`                                                              | _(no events — synchronous store mutation only)_                                          |

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
    const result = workspaceApi.getNetworks()
    if (result.success) setNetworks(result.data.networks)
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
  const { workspace } = window.CyWebApi

  // Display workspace name
  const info = workspace.getWorkspaceInfo()
  if (info.success) document.title = info.data.name

  // React to events
  window.addEventListener('selection:changed', (e) => {
    const { selectedNodes, selectedEdges } = e.detail
    console.log(
      `Selected: ${selectedNodes.length} nodes, ${selectedEdges.length} edges`,
    )
  })

  window.addEventListener('data:changed', (e) => {
    const { networkId, tableType, rowIds, addedColumns, removedColumns } =
      e.detail
    console.log(
      `${tableType} table ${networkId}: ${rowIds.length} rows, ` +
        `${addedColumns.length} columns added, ` +
        `${removedColumns.length} removed`,
    )
  })
})
```

---

## App Lifecycle

### `AppContext`

Passed to `mount()` when the app is activated:

```typescript
interface AppContext {
  readonly appId: string // unique ID of this app instance
  readonly apis: AppContextApis // per-app APIs (extends CyWebApiType)
}
```

### `AppContextApis`

Per-app API object that extends `CyWebApiType` with additional per-app capabilities:

```typescript
interface AppContextApis extends CyWebApiType {
  readonly resource: ResourceApi // per-app resource registration
  readonly contextMenu: ContextMenuApi // per-app, auto-cleaned on disable
  readonly nodeGraphics: NodeGraphicsApi // per-app, auto-cleaned on disable
}
```

> **Note:** `window.CyWebApi` is typed as `CyWebApiType` and does NOT include
> `resource`. Resource registration requires the per-app context available in
> `mount()` or via `useAppContext()`.

### `CyAppWithLifecycle`

Extends the existing `CyApp` interface with lifecycle callbacks, declarative
resource registration, and metadata:

```typescript
interface CyAppWithLifecycle extends CyApp {
  /** Declared API version this app targets (e.g. '1.0'). */
  apiVersion?: string

  /**
   * Declarative resource registrations. The host registers these automatically
   * when the app is loaded — no mount() needed.
   */
  resources?: ResourceDeclaration[]

  mount?(context: AppContext): void | Promise<void>
  unmount?(): void | Promise<void>
}
```

The base `CyApp` interface provides the core metadata fields:

```typescript
interface CyApp {
  id: string // unique ID, matches Module Federation name
  name: string // human-readable display name
  description?: string // short description shown in the App Settings panel
  version?: string // app's own semantic version (e.g. '1.2.0')
  /** @deprecated Prefer `resources` or runtime registration via mount(). */
  components?: ComponentMetadata[]
  status?: AppStatus // managed by host; do not set manually
}
```

- **`resources`** — declarative registration of panels and menu items. The host
  registers them before `mount()` is called. For dynamic registration, use
  `apis.resource.registerPanel()` in `mount()`.
- **`mount(context)`** — called after declarative resources are registered. If it
  returns a Promise, the host awaits it. Use for context menus, event listeners,
  and API-dependent initialization. If mount() throws, the host auto-cleans all
  registered resources.
- **`unmount()`** — called when the app is disabled or the page unloads. The host
  calls `cleanupAllForApp()` before `unmount()`, so resources and context menu
  items are already removed. Only manual cleanup (event listeners, timers) is needed.
- **`version`** — import from `package.json` to keep in sync automatically.
- **`apiVersion`** — reserved for future compatibility checks; set to `'1.0'`.

Existing apps without lifecycle methods continue to work unchanged.

### Example

```typescript
import { lazy } from 'react'
import type { CyAppWithLifecycle, AppContext } from '@cytoscape-web/api-types'

let _networkHandler: ((e: Event) => void) | null = null

export const MyApp: CyAppWithLifecycle = {
  id: 'myApp',
  name: 'My App',
  description: 'Short description shown in App Settings.',
  version: '1.0.0',
  apiVersion: '1.0',

  // Declarative: panels and menu items
  resources: [
    {
      slot: 'right-panel',
      id: 'MainPanel',
      title: 'My App',
      component: lazy(() => import('./components/MainPanel')),
    },
    {
      slot: 'apps-menu',
      id: 'MyMenuItem',
      title: 'My Action',
      component: lazy(() => import('./components/MyMenuItem')),
      closeOnAction: true,
    },
  ],

  // Imperative: context menus and event listeners
  mount(context: AppContext) {
    const { appId, apis } = context

    // Context menu items (auto-cleaned on disable)
    apis.contextMenu.addContextMenuItem({
      label: 'My App: Inspect',
      targetTypes: ['node'],
      handler: (ctx) => console.log(`[${appId}]`, ctx.id),
    })

    // Event listeners (manual cleanup in unmount)
    _networkHandler = (e: Event) => {
      const { networkId } = (e as CustomEvent).detail
      console.log(`[${appId}] switched to`, networkId)
    }
    window.addEventListener('network:switched', _networkHandler)
  },

  unmount() {
    // Only event listeners need manual cleanup
    if (_networkHandler) {
      window.removeEventListener('network:switched', _networkHandler)
      _networkHandler = null
    }
  },
}
```

---

## `window.CyWebApi`

The global `window.CyWebApi` object assembles all 10 domain APIs into a single
singleton. Available after the `cywebapi:ready` event.

```typescript
interface CyWebApiType {
  element: ElementApi
  network: NetworkApi
  selection: SelectionApi
  viewport: ViewportApi
  table: TableApi
  visualStyle: VisualStyleApi
  layout: LayoutApi
  export: ExportApi
  workspace: WorkspaceApi
  contextMenu: ContextMenuApi
}
```

```javascript
window.addEventListener('cywebapi:ready', () => {
  const api = window.CyWebApi
  // api.element, api.network, api.selection, ...
})
```

`AppContext.apis` extends `window.CyWebApi` with per-app `resource` and `contextMenu`
fields. The 10 domain APIs (element, network, etc.) are shared; `resource` and the
per-app `contextMenu` are exclusive to `AppContext.apis`.
