# @cytoscape-web/api-types

TypeScript type declarations for the [Cytoscape Web](https://github.com/cytoscape/cytoscape-web) App API.

Install this package in your plugin app to get full IDE support — hover types, parameter names, and
completions — for all `cyweb/*` Module Federation imports and the `window.CyWebApi` global, without
needing the host repository.

## Installation

```bash
npm install --save-dev @cytoscape-web/api-types
```

## Setup

Add the package to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./node_modules/@cytoscape-web"]
  }
}
```

That's it. No imports needed — global augmentations for `window.CyWebApi` and typed
`window.addEventListener` overloads are active automatically.

## What's included

| Export | Description |
|--------|-------------|
| `CyWebApiType` | Type of `window.CyWebApi` (10 domain API objects) |
| `ElementApi` | Create/delete nodes and edges, apply visual bypasses |
| `NetworkApi` | Create, delete, and switch networks |
| `SelectionApi` | Read and modify node/edge selection state |
| `ViewportApi` | Pan, zoom, and fit the viewport |
| `TableApi` | Read and write node/edge attribute tables |
| `VisualStyleApi` | Read and set visual style properties and bypasses |
| `LayoutApi` | Run and stop layout algorithms |
| `ExportApi` | Export networks to CX2, PNG, and SVG |
| `WorkspaceApi` | Read workspace and network summary metadata |
| `ContextMenuApi` | Register custom items in the network context menu |
| `ApiResult<T>` | Discriminated union returned by all API functions |
| `ApiErrorCode` | Enum of all possible error codes |
| `CyWebEvents` | Typed event detail shapes for all `window` events |
| Model types | `IdType`, `Network`, `Node`, `Edge`, `Table`, `VisualStyle`, … |

Ambient module declarations for all `cyweb/*` Module Federation remotes are also bundled, so imports
like `import { useElementApi } from 'cyweb/ElementApi'` resolve correctly in TypeScript.

## Usage examples

### Module Federation (React plugin)

```typescript
import { useElementApi } from 'cyweb/ElementApi'
import { useCyWebEvent } from 'cyweb/EventBus'

function MyPanel() {
  const element = useElementApi()

  useCyWebEvent('network:switched', ({ networkId }) => {
    console.log('switched to', networkId)
  })

  const handleAdd = () => {
    const result = element.createNode(networkId, { x: 100, y: 100 })
    if (result.success) {
      console.log('created node', result.data.nodeId)
    }
  }
}
```

### Vanilla JS / `window.CyWebApi`

```javascript
window.addEventListener('cywebapi:ready', () => {
  const api = window.CyWebApi

  const result = api.network.getCurrentNetwork()
  if (result.success) {
    console.log('current network:', result.data.networkId)
  }
})
```

### Context menu registration

```typescript
import { useContextMenuApi } from 'cyweb/ContextMenuApi'

function MyApp() {
  const contextMenu = useContextMenuApi()

  useEffect(() => {
    const result = contextMenu.addContextMenuItem({
      label: 'Highlight node',
      targetTypes: ['node'],
      handler: ({ id, networkId }) => {
        console.log('clicked node', id, 'in network', networkId)
      },
    })
    if (result.success) {
      const { itemId } = result.data
      return () => { contextMenu.removeContextMenuItem(itemId) }
    }
  }, [])
}
```

## Available `cyweb/*` remotes

| Remote | Hook |
|--------|------|
| `cyweb/ElementApi` | `useElementApi()` |
| `cyweb/NetworkApi` | `useNetworkApi()` |
| `cyweb/SelectionApi` | `useSelectionApi()` |
| `cyweb/ViewportApi` | `useViewportApi()` |
| `cyweb/TableApi` | `useTableApi()` |
| `cyweb/VisualStyleApi` | `useVisualStyleApi()` |
| `cyweb/LayoutApi` | `useLayoutApi()` |
| `cyweb/ExportApi` | `useExportApi()` |
| `cyweb/WorkspaceApi` | `useWorkspaceApi()` |
| `cyweb/ContextMenuApi` | `useContextMenuApi()` |
| `cyweb/EventBus` | `useCyWebEvent(type, handler)` |
| `cyweb/ApiTypes` | Re-exports all types from this package |

## Documentation

- [App API Specification](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/docs/design/module-federation/specifications/app-api-specification.md) — Full API reference
- [Event Bus Specification](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/docs/design/module-federation/specifications/event-bus-specification.md) — Event types, detail shapes, and subscription patterns
- [ADR 0001 — ApiResult design](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/docs/adr/0001-api-result-discriminated-union.md)
- [ADR 0002 — Public type re-export strategy](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/docs/adr/0002-public-type-reexport-strategy.md)
- [ADR 0003 — Framework-agnostic core layer](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/docs/adr/0003-framework-agnostic-core-layer.md)

## License

MIT
