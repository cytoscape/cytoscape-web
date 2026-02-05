# Database

## Overview

The database module provides local persistence for Cytoscape Web using IndexedDB via Dexie. It handles storage and retrieval of networks, tables, visual styles, views, workspace state, UI state, and application configuration.

## Architecture

### Database Structure

The database uses Dexie (IndexedDB wrapper) with the following object stores:

- **`workspace`**: Workspace configuration and metadata
- **`summaries`**: Network summary metadata (NDEx and local networks)
- **`cyNetworks`**: Network topology (nodes and edges)
- **`cyTables`**: Node and edge attribute tables
- **`cyVisualStyles`**: Visual style definitions
- **`cyNetworkViews`**: Network view configurations (camera, selection, decorators)
- **`uiState`**: UI panel visibility and layout state
- **`timestamp`**: Last modification timestamp
- **`filters`**: Filter configurations
- **`apps`**: External app definitions
- **`serviceApps`**: Service app configurations
- **`opaqueAspects`**: Non-core aspects attached to networks
- **`undoStacks`**: Undo/redo stack data

### Database Versioning

The database uses version-based migrations. The current version is defined in `currentVersion` (currently version 7). When the database schema changes:

1. Increment `currentVersion`
2. Update `ObjectStoreNames` if adding new stores
3. Update `Keys` to define primary keys for new stores
4. Add migration logic in `migrations.ts`

## Key Functions

### Database Management

- `initializeDb()`: Opens and initializes the database connection
- `getDb()`: Returns the database instance
- `closeDb()`: Closes the database connection
- `deleteDb()`: Deletes the entire database (use with caution)
- `getDatabaseVersion()`: Returns the current database version

### Network Operations

- `putNetworkToDb(network)`: Persist network topology to IndexedDB
- `getNetworkFromDb(id)`: Retrieve network by ID
- `getCyNetworkFromDb(id)`: Retrieve complete CyNetwork (network + tables + styles)
- `deleteNetworkFromDb(id)`: Delete network from database
- `clearNetworksFromDb()`: Clear all networks
- `getAllNetworkKeys()`: Get all network IDs

### Table Operations

- `putTablesToDb(id, nodeTable, edgeTable)`: Persist node and edge tables
- `getTablesFromDb(id)`: Retrieve tables for a network
- `deleteTablesFromDb(id)`: Delete tables for a network
- `clearTablesFromDb()`: Clear all tables

### Network Summary Operations

- `putNetworkSummaryToDb(summary)`: Persist network summary metadata
- `getNetworkSummaryFromDb(externalId)`: Retrieve summary by external ID
- `getNetworkSummariesFromDb(externalIds)`: Bulk retrieve summaries
- `deleteNetworkSummaryFromDb(externalId)`: Delete summary
- `clearNetworkSummaryFromDb()`: Clear all summaries

### Visual Style Operations

- `putVisualStyleToDb(id, visualStyle)`: Persist visual style
- `getVisualStyleFromDb(id)`: Retrieve visual style
- `deleteVisualStyleFromDb(id)`: Delete visual style
- `clearVisualStyleFromDb()`: Clear all visual styles

### Network View Operations

- `putNetworkViewToDb(id, view)`: Add or update a network view
- `putNetworkViewsToDb(id, views)`: Update multiple views at once
- `getNetworkViewsFromDb(id)`: Retrieve all views for a network
- `deleteNetworkViewsFromDb(id)`: Delete all views for a network
- `clearNetworkViewsFromDb()`: Clear all network views

### Workspace Operations

- `putWorkspaceToDb(workspace)`: Persist workspace
- `updateWorkspaceDb(id, value)`: Update workspace fields
- `getWorkspaceFromDb(id?)`: Retrieve workspace (creates default if none exists)

### UI State Operations

- `putUiStateToDb(uiState)`: Persist UI state
- `getUiStateFromDb()`: Retrieve UI state
- `deleteUiStateFromDb()`: Delete UI state

### Filter Operations

- `putFilterToDb(filterName, filterConfig)`: Persist filter configuration
- `getFilterFromDb(filterName)`: Retrieve filter configuration
- `deleteFilterFromDb(filterName)`: Delete filter

### App Operations

- `putAppToDb(app)`: Persist external app definition
- `getAppFromDb(appId)`: Retrieve app definition
- `deleteAppFromDb(appId)`: Delete app

### Service App Operations

- `putServiceAppToDb(serviceApp)`: Persist service app configuration
- `getAllServiceAppsFromDb()`: Retrieve all service apps
- `deleteServiceAppFromDb(url)`: Delete service app

### Opaque Aspects Operations

- `putOpaqueAspectsToDb(id, aspects)`: Persist opaque aspects
- `getOpaqueAspectsFromDb(id)`: Retrieve opaque aspects
- `deleteOpaqueAspectsFromDb(id)`: Delete opaque aspects
- `clearOpaqueAspectsFromDb()`: Clear all opaque aspects

### Undo/Redo Stack Operations

- `putUndoRedoStackToDb(id, stack)`: Persist undo/redo stack
- `getUndoRedoStackFromDb(id)`: Retrieve undo/redo stack
- `deleteUndoRedoStackFromDb(id)`: Delete undo/redo stack
- `clearUndoRedoStackFromDb()`: Clear all undo/redo stacks

## Serialization

The database uses custom serialization for complex objects:

- **Tables**: Serialized to JSON-compatible format (Map → Array)
- **Network Views**: Serialized with view-specific transformations
- **Visual Styles**: Serialized with style-specific transformations
- **Filter Configs**: Serialized filter definitions

Serialization functions are in `serialization.ts`:

- `serializeTable`, `deserializeTable`
- `serializeNetworkView`, `deserializeNetworkView`
- `serializeVisualStyle`, `deserializeVisualStyle`
- `serializeFilterConfig`, `deserializeFilterConfig`

### Immer Proxy Handling

All objects written to IndexedDB are converted from Immer proxies to plain objects using `toPlainObject` from `src/data/db/serialization`. This prevents "Cannot perform 'Object.prototype.toString' on a proxy that has been revoked" errors when serializing Zustand state (which uses Immer) to IndexedDB.

The `toPlainObject` function:

- Uses `structuredClone` when available (modern browsers)
- Falls back to `JSON.parse(JSON.stringify())` for older browsers
- Performs manual deep copy as a last resort for edge cases

All store operations that write to IndexedDB automatically use `deepClone` to ensure safe serialization.

## Snapshot Functionality

The database supports full export/import via snapshots. See `snapshot/` directory and [Snapshot Documentation](../snapshot/snapshot_docs/snapshot.md) for details.

## Data Validation

The `validator.ts` module provides validation for:

- Network data integrity
- Table structure validation
- Visual style validation
- View model validation

## Usage Examples

### Basic Network Persistence

```typescript
import { putNetworkToDb, getNetworkFromDb } from '../data/db'

// Save network
await putNetworkToDb(network)

// Retrieve network
const network = await getNetworkFromDb(networkId)
```

### Complete Network with Tables and Styles

```typescript
import { getCyNetworkFromDb } from '../data/db'

// Get complete network (network + tables + styles)
const cyNetwork = await getCyNetworkFromDb(networkId)
```

### Workspace Management

```typescript
import { getWorkspaceFromDb, putWorkspaceToDb } from '../data/db'

// Get or create workspace
const workspace = await getWorkspaceFromDb()

// Update workspace
workspace.name = 'New Workspace'
await putWorkspaceToDb(workspace)
```

## Error Handling

All database operations use try-catch blocks and log errors via `logDb`. Operations that fail will:

1. Log the error with context
2. Throw the error for upstream handling
3. Maintain transaction integrity (failed transactions are rolled back)

## Performance Considerations

- **Transactions**: Operations use Dexie transactions for atomicity
- **Bulk Operations**: Use bulk methods when available (`bulkGet`, `bulkPut`)
- **Lazy Loading**: Networks are stored separately from tables/styles for efficient loading
- **Caching**: Frequently accessed data is cached in memory stores

## Testing

See `db.test.ts` for comprehensive test coverage including:

- CRUD operations for all object stores
- Serialization/deserialization
- Migration handling
- Error cases

## Related Documentation

- [Snapshot Documentation](../snapshot/snapshot_docs/snapshot.md)
- [Serialization Documentation](./serialization.ts)
- [Migrations Documentation](./migrations.ts)
- [Validator Documentation](./validator.ts)
