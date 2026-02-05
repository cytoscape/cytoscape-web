# Stores

## Overview

This directory defines the core application state stores used across features and hooks. Stores centralize domain and UI state (networks, views, tables, styles, credentials, layout, messages) and expose typed selectors and mutation APIs. They are the single source of truth; hooks orchestrate behavior on top.

## Architecture

Stores are organized by domain responsibility:

- App-level: `AppStore`, `UiStateStore`, `WorkspaceStore`, `MessageStore`
- Network domain: `NetworkStore`, `NetworkSummaryStore`, `ViewModelStore`, `UndoStore`
- Tables and filters: `TableStore`, `FilterStore`
- Rendering and layout: `RendererStore`, `RendererFunctionStore`, `LayoutStore`, `VisualStyleStore`, `OpaqueAspectStore`
- Credentials: `CredentialStore`

Key characteristics:

- Encapsulated state with explicit mutations
- Derived selectors for computed values
- Cross-store coordination via hooks, not direct coupling
- Tested behavior for invariants and edge cases (see `*.spec.ts`)

## Behavior

### State Mutation

- Mutations are explicit and validated
- Guard clauses enforce invariants (e.g., selected IDs exist before assignment)
- Batched updates minimize re-renders where supported

### Derived State

- Selectors compute view models, filtered tables, and render-ready properties
- Memoization applied to avoid unnecessary computation

### Undo/Redo

- `UndoStore` coordinates reversible mutations across active domain stores
- Actions register inverse operations and metadata
- Hooks like `useUndoStack` provide the user-facing API

### Persistence and Integration

- Credential and NDEx-related stores mediate authentication and tokens
- UI and workspace stores persist layout and panel state for session continuity
- Renderer and style stores maintain consistent visualization state across reloads

### Immer Proxy Handling

All stores use Zustand with Immer middleware, which wraps state in Immer proxies. When persisting to IndexedDB, stores use the `toPlainObject` utility function (`src/data/db/serialization`) to convert Immer proxies to plain objects before database operations. This prevents serialization errors and ensures data integrity.

**Stores that persist to IndexedDB:**
- `AppStore` - App metadata and status
- `NetworkStore` - Network topology
- `NetworkSummaryStore` - Network summaries
- `OpaqueAspectStore` - Opaque aspect data
- `UiStateStore` - UI state and preferences
- `UndoStore` - Undo/redo stacks
- `WorkspaceStore` - Workspace configuration
- `FilterStore` - Filter configurations
- `TableStore` - Table data (uses serialization)
- `ViewModelStore` - Network views (uses serialization)
- `VisualStyleStore` - Visual styles (uses serialization)

## Integration Points

- `hooks/*`: Primary consumers; orchestrate async flows and side effects
- `features/*`: Read-only selectors or hook-mediated mutations; features should not bypass hooks for complex flows
- `api/*`: Service results are normalized then committed to stores
- `hooks/navigation/*`: URL decode/encode applied to/from store state

## Design Decisions

### Single Source of Truth

- Stores own domain state; components remain stateless where possible

### Clear Boundaries

- Domain-specific stores keep responsibilities narrow and composable
- Cross-cutting concerns handled by hooks or coordinator utilities

### Testability

- Rich set of `*.spec.ts` files validate invariants and behavior
- Deterministic updates and pure selectors facilitate testing

## Store Index

- `AppStore`: App-wide flags/config and environment
- `UiStateStore`: Panel visibility, sizing, and UI configuration
- `WorkspaceStore`: Active workspace context and composition
- `NetworkStore`: Networks, current network ID, and core graph entities
- `NetworkSummaryStore`: Summary metadata and listings
- `ViewModelStore`: View-layer models (selection, camera, decorators)
- `TableStore`: Node/edge table state, sorting, paging, selection
- `FilterStore`: Filter definitions and active filters
- `RendererStore`: Renderer settings and runtime parameters
- `RendererFunctionStore`: Custom renderer function registry
- `LayoutStore`: Layout algorithm parameters and results
- `VisualStyleStore`: Visual mapping definitions and style application
- `OpaqueAspectStore`: Non-core aspects attached to networks
- `UndoStore`: Undo/redo stacks and commands
- `CredentialStore`: Auth tokens and credentials
- `MessageStore`: User-facing messages and notifications

## Future Improvements

- Consolidate shared selector patterns into utilities
- Strengthen typing for cross-store references and IDs
- Expand undoable operations coverage
- Formalize persistence boundaries and versioning for stored state
