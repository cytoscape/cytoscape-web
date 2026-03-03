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
| `cyweb/WorkspaceApi`   | `useWorkspaceApi()`   | 1f    |

## WorkspaceApi

Provides read access to the workspace state and the ability to switch the active network or rename the workspace. All operations are synchronous.

**Import (React / Module Federation):**

```typescript
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import type { WorkspaceInfo, WorkspaceNetworkInfo } from 'cyweb/ApiTypes'
```

**Access (Vanilla JS / browser extension):**

```javascript
window.addEventListener('cywebapi:ready', () => {
  const workspace = window.CyWebApi.workspace
})
```

### Methods

#### `getWorkspaceInfo(): ApiResult<WorkspaceInfo>`

Returns top-level metadata about the workspace.

```typescript
interface WorkspaceInfo {
  workspaceId: IdType         // workspace UUID
  name: string                // human-readable workspace name
  currentNetworkId: IdType    // ID of the active network; '' if no networks are open
  networkCount: number        // number of networks in the workspace
}
```

Always succeeds. Returns `OperationFailed` only if an unexpected store error occurs.

#### `getNetworkIds(): ApiResult<{ networkIds: IdType[] }>`

Returns the ordered list of network IDs currently open in the workspace. The order matches the tab order shown in the UI.

```typescript
const result = workspaceApi.getNetworkIds()
if (result.success) {
  console.log(result.data.networkIds) // e.g. ['uuid-1', 'uuid-2']
}
```

Always succeeds (returns an empty array when no networks are open).

#### `getNetworkList(): ApiResult<WorkspaceNetworkInfo[]>`

Returns summary metadata for all networks in the workspace. Preserves the same order as `getNetworkIds()`.

```typescript
interface WorkspaceNetworkInfo {
  networkId: IdType
  name: string
  description: string
  nodeCount: number
  edgeCount: number
  isModified: boolean   // true when the network has unsaved local changes
}
```

Networks whose summary is not found in `NetworkSummaryStore` are **silently omitted** from the result. Callers should not assume the result length matches `getNetworkIds()`.

#### `getNetworkSummary(networkId: IdType): ApiResult<WorkspaceNetworkInfo>`

Returns summary metadata for a single network.

| Error Code | Condition |
| --- | --- |
| `NETWORK_NOT_FOUND` | `networkId` is not in the workspace, or its summary is not found |

#### `getCurrentNetworkId(): ApiResult<{ networkId: IdType }>`

Returns the ID of the currently active (displayed) network.

| Error Code | Condition |
| --- | --- |
| `NO_CURRENT_NETWORK` | No networks are open in the workspace |

#### `switchCurrentNetwork(networkId: IdType): ApiResult`

Switches the active network. Triggers the `network:switched` event on `window` (via the existing Event Bus subscription — no additional wiring needed).

```typescript
const result = workspaceApi.switchCurrentNetwork('uuid-2')
if (!result.success) console.error(result.error.code, result.error.message)
```

| Error Code | Condition |
| --- | --- |
| `INVALID_INPUT` | `networkId` is empty or whitespace-only |
| `NETWORK_NOT_FOUND` | `networkId` is not in the workspace |

#### `setWorkspaceName(name: string): ApiResult`

Renames the workspace. The new name is trimmed before being stored.

| Error Code | Condition |
| --- | --- |
| `INVALID_INPUT` | `name` is empty or whitespace-only after trimming |

### Usage Example (React)

```typescript
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import { useCyWebEvent } from 'cyweb/EventBus'
import { useState, useEffect } from 'react'
import type { WorkspaceNetworkInfo } from 'cyweb/ApiTypes'

function NetworkList() {
  const workspaceApi = useWorkspaceApi()
  const [networks, setNetworks] = useState<WorkspaceNetworkInfo[]>([])

  const refresh = () => {
    const result = workspaceApi.getNetworkList()
    if (result.success) setNetworks(result.data)
  }

  useEffect(refresh, [])

  // Keep the list in sync when networks are added or removed
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
  const ws = window.CyWebApi.workspace

  // Display workspace name
  const info = ws.getWorkspaceInfo()
  if (info.success) document.title = info.data.name

  // List all networks
  const list = ws.getNetworkList()
  if (list.success) {
    list.data.forEach((n) =>
      console.log(`${n.name}: ${n.nodeCount} nodes, ${n.edgeCount} edges`),
    )
  }

  // Switch to the first network
  const ids = ws.getNetworkIds()
  if (ids.success && ids.data.networkIds.length > 0) {
    ws.switchCurrentNetwork(ids.data.networkIds[0])
  }
})
```

### Event Integration

`switchCurrentNetwork` is the only WorkspaceApi method that fires an event.

| Action | Event Fired |
| --- | --- |
| `switchCurrentNetwork(id)` | `network:switched` `{ networkId: id, previousId: ... }` |
| `setWorkspaceName(name)` | _(none)_ |
| All read methods | _(none)_ |

Subscribe to `network:switched` via `useCyWebEvent` (React) or `window.addEventListener` (Vanilla JS) to react to network changes regardless of whether they originated from the UI or from `switchCurrentNetwork`.
