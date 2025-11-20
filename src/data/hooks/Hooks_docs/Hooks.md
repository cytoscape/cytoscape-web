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

## Future Improvements

- Consolidate repeated loading and error patterns into shared utilities
- Strengthen typing of cross-hook contracts and selectors
- Expand test coverage for cancellation and race conditions
- Add diagnostics hooks for profiling long-running operations
