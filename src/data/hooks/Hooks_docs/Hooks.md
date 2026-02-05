# Hooks

## Overview

This directory contains reusable React hooks that encapsulate application behaviors such as network loading, NDEx integration, workspace management, undo/redo, URL navigation, and cross-feature coordination. Hooks here are the primary integration layer between feature components and the application's state stores and services.

## Architecture

Hooks are organized by behavior and responsibility:

- Provide focused, composable interfaces for features
- Encapsulate side effects and service calls
- Mediate between UI components and domain stores
- Enforce consistent error/loading/undo patterns

Hooks typically follow a consistent pattern:

- Read from one or more state stores
- Expose imperative actions and derived state
- Handle async flows with cancellation and status reporting
- Integrate with URL, persistence, or external services as needed

## Hook Categories

### Data and Services

- `useLoadCyNetwork`, `useLoadNetworkSummaries`: Load network entities and summaries
- `useServiceTaskRunner`: Execute and monitor long-running service tasks
- `useSaveCyNetworkToNDEx`, `useSaveCyNetworkCopyToNDEx`, `useSaveWorkspaceToNDEx`: Persist to NDEx
- `useOpenInCytoscapeDesktop`: Hand off to Cytoscape Desktop

### Workspace and Tables

- `useWorkspaceManager`, `useWorkspaceData`: Manage workspace lifecycle and composing panels
- `useLoadWorkspace`: Load a remote workspace from NDEx into the database
- `useTableManager`: Coordinate table selection and actions
- `useNetworkViewManager`: Manage network views
- `useNetworkSummaryManager`: Manage network summary interactions

### Navigation

- `navigation/`: URL management and high-level navigation helpers

### State Management Utilities

- `stores/`: Underlying Zustand-like store definitions and typed access patterns
- `useUndoStack`: Cross-feature undo/redo orchestration

## Behavior

### Async Operations

- Standardized loading/error state exposure
- Cancellation on unmount or dependency change where applicable
- Status updates propagated to UI and Message store as needed

### Store Integration

- Read/write via dedicated stores (`stores/*`)
- Derived state memoization to avoid unnecessary renders
- Consistent invariants and guard clauses around store mutations

### Side Effects

- NDEx persistence: token/auth handling delegated to Credential store
- URL side effects: routed via `navigation/urlManager` helpers
- Workspace effects: orchestrated updates across multiple stores

## Integration Points

- `stores/*`: Core domain state (network, workspace, tables, view models, UI state, etc.)
- `features/*`: Hooks provide the API surface consumed by feature components
- `api/*`: Back-end and NDEx service access
- `hooks/navigation/*`: URL encode/decode for deep-linking and app state reflection

## Design Decisions

### Composability First

- Small, single-responsibility hooks that compose for complex flows
- Clear separation between data fetching, state mutation, and UI orchestration

### Predictable Async

- Uniform patterns for loading/error/cancel states
- Side effects isolated and testable

### Store-Centric

- Stores as the single source of truth
- Hooks as thin orchestrators, not alternate state containers

## Hook Reference

### useLoadWorkspace

Loads a remote workspace from NDEx into the local database. This hook provides a function that:

1. Clears the current database
2. Writes the workspace metadata to the database
3. Updates app statuses based on the workspace's active apps list
4. Updates service apps (fetches metadata for new ones, removes ones not in the list)
5. Handles errors gracefully (continues with workspace write even if app/service app updates fail)
6. Reloads the page after successful completion

**Usage:**

```typescript
import { useLoadWorkspace } from '../data/hooks/useLoadWorkspace'
import { useAppStore } from '../data/hooks/stores/AppStore'

const MyComponent = () => {
  const loadWorkspace = useLoadWorkspace()
  const apps = useAppStore((state) => state.apps)
  const serviceApps = useAppStore((state) => state.serviceApps)

  const handleLoad = async (remoteWorkspace: RemoteWorkspace) => {
    try {
      await loadWorkspace(remoteWorkspace, apps, serviceApps)
    } catch (error) {
      // Handle error
    }
  }
}
```

**Parameters:**

- `selectedWorkspace`: The remote workspace object from NDEx
- `currentApps`: Current apps from the app store (used for status updates)
- `currentServiceApps`: Current service apps from the app store

**Behavior:**

- App statuses are updated in the database to match the workspace's `activeApps` list
- Service apps are synchronized: removed if not in workspace list, fetched and added if new
- Errors in app/service app updates are logged but don't prevent workspace loading
- Page reloads automatically after successful completion to apply all changes

**See also:** `Hooks_docs/useLoadWorkspace.md` for detailed documentation

## Future Improvements

- Consolidate repeated loading and error patterns into shared utilities
- Strengthen typing of cross-hook contracts and selectors
- Expand test coverage for cancellation and race conditions
- Add diagnostics hooks for profiling long-running operations
