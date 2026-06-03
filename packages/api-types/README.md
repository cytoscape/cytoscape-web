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
| `ElementApi` | Create/delete nodes and edges, visual bypasses, graph traversal queries |
| `NetworkApi` | Create, delete, and switch networks |
| `SelectionApi` | Read and modify node/edge selection state |
| `ViewportApi` | Pan, zoom, and fit the viewport |
| `TableApi` | Read and write node/edge attribute tables |
| `VisualStyleApi` | Read and set visual style properties and bypasses |
| `LayoutApi` | Run and stop layout algorithms |
| `ExportApi` | Export networks to CX2, PNG, and SVG |
| `WorkspaceApi` | Read workspace and network summary metadata |
| `ContextMenuApi` | Register custom items in the network context menu |
| `AppContextApis` | Per-app API shape passed to `mount()` (extends `CyWebApiType`) |
| `ResourceApi` | Register panels and menu items at runtime |
| `ResourceDeclaration` | Declarative resource entry for `CyAppWithLifecycle.resources` |
| `ApiResult<T>` | Discriminated union returned by all API functions |
| `ApiErrorCode` | Enum of all possible error codes |
| `CyWebEvents` | Typed event detail shapes for all `window` events |
| Model types | `IdType`, `Network`, `Node`, `Edge`, `Table`, `VisualStyle`, … |

Ambient module declarations for all `cyweb/*` Module Federation remotes are also bundled, so imports
like `import { useElementApi } from 'cyweb/ElementApi'` resolve correctly in TypeScript.

## Usage examples

### Declarative resource registration (recommended)

```typescript
import { lazy } from 'react'
import { CyAppWithLifecycle } from 'cyweb/ApiTypes'

export const MyApp: CyAppWithLifecycle = {
  id: 'myApp',
  name: 'My App',
  version: '1.0.0',
  apiVersion: '1.0',

  // Panels and menu items — host registers these automatically
  resources: [
    {
      slot: 'right-panel',
      id: 'MainPanel',
      title: 'My Panel',
      component: lazy(() => import('./components/MainPanel')),
    },
    {
      slot: 'apps-menu',
      id: 'QuickAction',
      title: 'Quick Action',
      component: lazy(() => import('./components/QuickAction')),
      closeOnAction: true,
    },
  ],

  // Context menus need apis access, so they go in mount()
  mount({ apis }) {
    apis.contextMenu.addContextMenuItem({
      label: 'Highlight node',
      targetTypes: ['node'],
      handler: ({ id, networkId }) => {
        apis.visualStyle.setBypass(networkId, 'NODE_BACKGROUND_COLOR', { [id]: '#ff0000' })
      },
    })
  },
}
```

### Module Federation (React component)

```typescript
import { useElementApi } from 'cyweb/ElementApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import { useCyWebEvent } from 'cyweb/EventBus'

function MyPanel() {
  const element = useElementApi()
  const workspace = useWorkspaceApi()

  useCyWebEvent('network:switched', ({ networkId }) => {
    console.log('switched to', networkId)
  })

  const handleAdd = () => {
    const net = workspace.getCurrentNetworkId()
    if (!net.success) return
    const result = element.createNode(net.data.networkId, [100, 200])
    if (result.success) {
      console.log('created node', result.data.nodeId)
    }
  }
}
```

### Per-app context in plugin components

```typescript
import { useAppContext } from 'cyweb/AppIdContext'

function MyComponent() {
  const ctx = useAppContext()
  if (!ctx) return null

  // ctx.apis has all 10 domain APIs + resource + contextMenu (per-app)
  const resources = ctx.apis.resource.getRegisteredResources()
}
```

### Vanilla JS / `window.CyWebApi`

```javascript
window.addEventListener('cywebapi:ready', () => {
  const api = window.CyWebApi

  const result = api.workspace.getCurrentNetworkId()
  if (result.success) {
    console.log('current network:', result.data.networkId)
  }
})
```

> **Note:** `window.CyWebApi` is typed as `CyWebApiType` which does NOT include
> `resource` or per-app `contextMenu`. These are only available via `AppContextApis`
> inside `mount()` or `useAppContext()`.

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
| `cyweb/EventBus` | `useCyWebEvent(type, handler)` |
| `cyweb/AppIdContext` | `useAppContext()` — per-app context for plugin components |
| `cyweb/ApiTypes` | Re-exports all types from this package |

## Documentation

- [App API Specification](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/docs/design/module-federation/specifications/app-api-specification.md) — Full API reference
- [Event Bus Specification](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/docs/design/module-federation/specifications/event-bus-specification.md) — Event types, detail shapes, and subscription patterns
- [ADR 0001 — ApiResult design](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/docs/design/module-federation/adr/0001-api-result-discriminated-union.md)
- [ADR 0002 — Public type re-export strategy](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/docs/design/module-federation/adr/0002-public-type-reexport-strategy.md)
- [ADR 0003 — Framework-agnostic core layer](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/docs/design/module-federation/adr/0003-framework-agnostic-core-layer.md)

## License

MIT
