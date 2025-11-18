# Data

## Overview

The `data` directory contains all data access, persistence, and orchestration logic for Cytoscape Web. This includes local database operations, external API integrations, React hooks for data management, and task-related utilities.

## Architecture

The data layer is organized into four main areas:

- **`db/`**: Local IndexedDB persistence layer for networks, tables, visual styles, views, and application state
- **`external-api/`**: External API client integrations (NDEx, Cytoscape Desktop)
- **`hooks/`**: React hooks that orchestrate data operations, integrate db and API calls, and manage application state
- **`task/`**: Task-related hooks and utilities for external app integration

## Directory Structure

### `db/`

Local database operations using IndexedDB via Dexie. Handles:
- Network, table, and visual style persistence
- Workspace and UI state management
- Database migrations and versioning
- Snapshot export/import functionality
- Data serialization and validation

See [Database Documentation](../db/db_docs/Database.md) for details.

### `external-api/`

External API client integrations:
- **`ndex/`**: NDEx API client for network fetching, updating, querying, and workspace management
- **`cytoscape/`**: Cytoscape Desktop API integration

See [External API Documentation](../external-api/external-api_docs/ExternalApi.md) for details.

### `hooks/`

React hooks that provide the primary interface between UI components and the data layer:
- Data loading and saving hooks
- Workspace and network management
- State store integration
- URL navigation coordination
- Undo/redo orchestration

See [Hooks Documentation](../hooks/Hooks_docs/Hooks.md) for details.

### `task/`

Task-related hooks and utilities:
- Network creation hooks exposed to external apps via Module Federation
- Task execution and management

See [Task Documentation](../task/task_docs/Task.md) for details.

## Data Flow

1. **UI Components** → Use hooks from `hooks/` for data operations
2. **Hooks** → Orchestrate between stores, `db/`, and `external-api/`
3. **Database** → Persists local state to IndexedDB
4. **External APIs** → Fetches/updates remote data (NDEx, Cytoscape Desktop)

## Key Principles

- **Single Source of Truth**: Stores (in `hooks/stores/`) are the authoritative state
- **Separation of Concerns**: Database operations, API calls, and state management are separated
- **Composability**: Hooks compose to build complex data flows
- **Persistence**: Local state is automatically persisted to IndexedDB
- **Error Handling**: Consistent error handling patterns across all data operations

## Integration Points

- **`features/*`**: UI components consume hooks from `hooks/`
- **`models/*`**: Domain models used throughout the data layer
- **`assets/config.json`**: Configuration for API endpoints and database settings

## Design Decisions

### Local-First with Remote Sync

- Networks are cached locally in IndexedDB for fast access
- Remote networks are fetched from NDEx when not in cache
- Local-only networks cannot be retrieved from NDEx (prevents data loss)

### Store-Centric Architecture

- Zustand stores in `hooks/stores/` manage all application state
- Hooks orchestrate state updates and side effects
- Database operations are triggered by store mutations

### Type Safety

- All data operations are fully typed
- Models define the structure of persisted data
- Serialization/deserialization maintains type safety

## Future Improvements

- Expand test coverage for data operations
- Add data migration utilities for schema changes
- Improve error recovery and retry mechanisms
- Add data validation at API boundaries

