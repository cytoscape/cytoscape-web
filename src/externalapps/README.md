# External Apps API

This folder contains hooks and utilities that are **exposed to external applications** via Webpack Module Federation.

## Exposed Hooks

### `useCreateNetwork`

**Module Path:** `cyweb/CreateNetwork`

A custom hook that creates a network from an edge list and stores it in Zustand. Returns a function that takes network creation parameters (name, description, edge list) and returns a `NetworkWithView` object.

**Usage in External Apps:**

```typescript
const createNetwork = useCreateNetworkWithView()
const networkWithView = createNetwork({
  name: 'My Network',
  description: 'Network description',
  edgeList: [
    ['node1', 'node2'],
    ['node2', 'node3'],
  ],
})
```

### `useCreateNetworkFromCx2`

**Module Path:** `cyweb/CreateNetworkFromCx2`

A custom hook that creates a network from CX2 (Cytoscape Exchange 2) data and stores it in Zustand. Returns a function that takes CX2 data and returns a `NetworkWithView` object.

**Usage in External Apps:**

```typescript
const createNetworkFromCx2 = useCreateNetworkFromCx2()
const networkWithView = createNetworkFromCx2({
  cxData: cx2Data,
})
```

## Configuration

These hooks are exposed through Webpack Module Federation in:

- `webpack.config.js` - exposes `./CreateNetwork` and `./CreateNetworkFromCx2`
- `webpack.config.new.js` - same configuration

External apps can consume these modules using Module Federation:

```typescript
import { useCreateNetworkWithView } from 'cyweb/CreateNetwork'
import { useCreateNetworkFromCx2 } from 'cyweb/CreateNetworkFromCx2'
```

## Important Notes

1. **These hooks are only for external app consumption** - They are not used internally in the main codebase.
2. **Breaking changes** - Any changes to these hooks' APIs will affect external apps. Consider versioning if needed.
3. **Dependencies** - These hooks depend on Zustand stores (NetworkStore, TableStore, ViewModelStore, etc.) which are also exposed to external apps.

## Related Exposed Modules

The following stores are also exposed to external apps (see `webpack.config.js`):

- `CredentialStore`
- `LayoutStore`
- `MessageStore`
- `NetworkStore`
- `NetworkSummaryStore`
- `OpaqueAspectStore`
- `RendererStore`
- `TableStore`
- `UiStateStore`
- `ViewModelStore`
- `VisualStyleStore`
- `WorkspaceStore`
