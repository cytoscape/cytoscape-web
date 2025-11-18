# Task

## Overview

The `task` directory contains hooks and utilities that are **exposed to external applications** via Webpack Module Federation. These hooks allow external apps to create networks and integrate with Cytoscape Web's data layer.

## Architecture

The task hooks provide a clean interface for external apps to:
- Create networks from edge lists
- Create networks from CX2 data
- Automatically integrate with Cytoscape Web's stores and state management

## Exposed Hooks

### `useCreateNetworkWithView`

**Module Path:** `cyweb/CreateNetwork`

A custom hook that creates a network from an edge list and stores it in Zustand. Returns a function that takes network creation parameters and returns a `NetworkWithView` object.

**Signature:**
```typescript
export const useCreateNetworkWithView = (): (({
  name: string,
  description?: string,
  edgeList: Array<[IdType, IdType, string?]>
}) => CyNetwork)
```

**Usage in External Apps:**
```typescript
import { useCreateNetworkWithView } from 'cyweb/CreateNetwork'

function MyExternalApp() {
  const createNetwork = useCreateNetworkWithView()
  
  const handleCreate = () => {
    const networkWithView = createNetwork({
      name: 'My Network',
      description: 'Network description',
      edgeList: [
        ['node1', 'node2'],
        ['node2', 'node3'],
        ['node1', 'node3', 'interaction'],
      ],
    })
    // Network is now stored in Cytoscape Web's state
  }
}
```

**What it does:**
1. Generates unique integer-based IDs for nodes
2. Creates network topology from edge list
3. Creates node and edge tables with name mappings
4. Creates default visual style and view model
5. Stores everything in Zustand stores (NetworkStore, TableStore, ViewModelStore, VisualStyleStore, NetworkSummaryStore)
6. Sets up passthrough mapping for node labels

**Edge List Format:**
- Each edge is a tuple: `[sourceId, targetId, edgeType?]`
- `sourceId` and `targetId` are the original node identifiers (will be mapped to internal IDs)
- `edgeType` is optional and can specify the interaction type

### `useCreateNetworkFromCx2`

**Module Path:** `cyweb/CreateNetworkFromCx2`

A custom hook that creates a network from CX2 (Cytoscape Exchange 2) data and stores it in Zustand. Returns a function that takes CX2 data and returns a `NetworkWithView` object.

**Signature:**
```typescript
export const useCreateNetworkFromCx2 = (): (({
  cxData: Cx2
}) => CyNetwork)
```

**Usage in External Apps:**
```typescript
import { useCreateNetworkFromCx2 } from 'cyweb/CreateNetworkFromCx2'

function MyExternalApp() {
  const createNetworkFromCx2 = useCreateNetworkFromCx2()
  
  const handleCreate = () => {
    const networkWithView = createNetworkFromCx2({
      cxData: cx2Data, // Cx2 object
    })
    // Network is now stored and navigated to
  }
}
```

**What it does:**
1. Converts CX2 data to a complete CyNetwork
2. Extracts network metadata (name, description, version) from CX2 attributes
3. Creates network summary with metadata
4. Stores everything in Zustand stores
5. Adds network to workspace
6. Sets network as current and navigates to it

**CX2 Data:**
- Must be a valid Cx2 object following the Cytoscape Exchange 2 format
- Network attributes (name, description, version) are extracted from the CX2 data
- Visual styles, tables, and views are created from CX2 content

## Internal Implementation

### Network Creation Process

Both hooks follow a similar pattern:

1. **Generate Network ID**: Creates a UUID for the network
2. **Create Network Topology**: Builds nodes and edges
3. **Create Tables**: Generates node and edge attribute tables
4. **Create Visual Style**: Sets up default visual mappings
5. **Create View Model**: Initializes network view (camera, selection, etc.)
6. **Create Summary**: Generates network summary metadata
7. **Store in Zustand**: Adds all components to their respective stores
8. **Return CyNetwork**: Returns the complete network object

### Store Integration

The hooks integrate with the following stores:
- `NetworkStore`: Stores network topology
- `TableStore`: Stores node and edge tables
- `ViewModelStore`: Stores network views
- `VisualStyleStore`: Stores visual styles
- `NetworkSummaryStore`: Stores network summaries
- `WorkspaceStore`: Manages workspace state (for CX2 hook)

## Module Federation Configuration

These hooks are exposed through Webpack Module Federation in:
- `webpack.config.js`
- `webpack.config.new.js`

**Exposed Modules:**
- `./CreateNetwork` → `useCreateNetworkWithView`
- `./CreateNetworkFromCx2` → `useCreateNetworkFromCx2`

## Dependencies

These hooks depend on:
- Zustand stores (NetworkStore, TableStore, ViewModelStore, VisualStyleStore, NetworkSummaryStore, WorkspaceStore)
- Model implementations (NetworkModel, TableModel, VisualStyleModel, ViewModel)
- URL navigation (for CX2 hook)

## Important Notes

1. **External App Only**: These hooks are designed for external app consumption via Module Federation
2. **Breaking Changes**: Any API changes will affect external apps - consider versioning
3. **State Management**: Networks created via these hooks are immediately available in Cytoscape Web's state
4. **Navigation**: The CX2 hook automatically navigates to the created network
5. **ID Mapping**: The edge list hook maps original node IDs to internal integer-based IDs

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

## Testing

These hooks are tested indirectly through:
- External app integration tests
- Store behavior tests
- Model conversion tests

## Future Improvements

- Add validation for edge lists and CX2 data
- Support for additional network creation formats
- Better error handling and reporting
- Support for incremental network updates

