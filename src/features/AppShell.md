# AppShell Feature

## Overview

The AppShell component is the main application container that provides the layout structure and handles application initialization. It serves as the entry point for workspace management, network imports, and UI state restoration from URL parameters.

## Architecture

The AppShell follows a **container component pattern** where:

- **AppShell** is the main container that orchestrates initialization and layout
- It uses React Router's `<Outlet />` to render child routes (WorkspaceEditor)
- It manages workspace state, network imports, and URL parameter processing
- It coordinates with multiple Zustand stores for state management

## Component Structure

```
AppShell/
├── AppShell.tsx          # Main container component
└── AppShell_docs/        # Documentation
```

## Components

### AppShell

The main application shell component that provides layout and initialization.

**Behavior:**

- **Initialization Flow:**
  1. Loads workspace and network summaries from IndexedDB
  2. Processes URL parameters for network imports (from path and query params)
  3. Restores UI state from URL search parameters (panels, filters, selections)
  4. Navigates to the appropriate workspace/network route

- **Network Import:**
  - Supports two import methods:
    1. From URL path: `/:workspaceId/networks/:networkId` - imports network from NDEx by UUID
    2. From query params: `?import=https://example.com/network.cx` - imports network from URL
  - Handles import errors gracefully with user-friendly error messages
  - Limits URL imports to 10MB file size

- **State Restoration:**
  - Restores panel states (left, right, bottom) from URL
  - Restores node/edge selections from URL
  - Restores filter configurations from URL
  - Restores table browser tab index from URL
  - Restores network view tab index from URL
  - Restores active network view from URL (with 1s delay for component readiness)

- **Layout:**
  - Provides full-height flexbox layout
  - Contains toolbar at top
  - Contains content area (via `<Outlet />`) that fills remaining space

**URL Parameter Processing:**

- **Panel States:** `?left=open&right=closed&bottom=open`
- **Selections:** `?selectedNodes=node1 node2&selectedEdges=edge1`
- **Filters:** `?filterFor=node&filterBy=name&filterRange=value1,value2`
- **Table Browser:** `?activeTableBrowserTab=1`
- **Network View Tab:** `?activeNetworkViewTab=1`
- **Network View:** `?activeNetworkView=viewId`
- **Import:** `?import=https://example.com/network.cx` (can be multiple)

**Design Decisions:**

1. **Single Initialization:** Uses `useRef` to ensure initialization only runs once, preventing duplicate network imports and state updates

2. **URL Parameter Clearing:** Clears search params after processing to keep URLs clean and prevent re-processing on navigation

3. **Delayed Network View Restoration:** Uses 1s timeout for network view restoration to ensure components are mounted and ready

4. **Error Collection:** Collects all import errors and displays them together in a single message, rather than failing on first error

5. **Current Network Priority:** When importing networks, sets the imported network as current before updating stores, as store operations assume the current network is being updated

6. **Workspace-First Approach:** Always loads workspace from database first, then processes URL parameters to modify workspace state

## Integration Points

The AppShell integrates with the following stores and services:

- **WorkspaceStore** - Workspace data and current network ID
- **NetworkStore** - Network data
- **NetworkSummaryStore** - Network summaries and NDEx metadata
- **UiStateStore** - UI state (panels, table browser, active network view)
- **FilterStore** - Filter configurations
- **ViewModelStore** - Network views and selections
- **VisualStyleStore** - Visual styles
- **TableStore** - Node and edge tables
- **MessageStore** - User notifications
- **CredentialStore** - Authentication tokens
- **Database (IndexedDB)** - Workspace and UI state persistence
- **NDEx API** - Network summaries and imports
- **React Router** - Navigation and route parameters

## State Restoration Flow

1. **Load Base State:** Load workspace and UI state from IndexedDB
2. **Apply URL Overrides:** Override UI state with URL parameters
3. **Import Networks:** Process network imports from URL
4. **Set Stores:** Update all stores with loaded/imported data
5. **Restore Selections:** Restore selections, filters, and views from URL
6. **Navigate:** Navigate to final route with clean URL

## Design Decisions

1. **URL as State Source:** URL parameters serve as the source of truth for shareable state, allowing users to share specific network views with selections and filters

2. **Database as Fallback:** IndexedDB provides default workspace and UI state when URL parameters are not present

3. **Replace Navigation:** Uses `replace: true` for navigation to avoid cluttering browser history with intermediate states

4. **Error Handling:** Import errors are collected and displayed together, allowing multiple imports to be attempted even if some fail

5. **Store Update Order:** Updates workspace current network ID before updating stores, as stores assume operations are for the current network

## Testing Considerations

- AppShell has `data-testid="app-shell"` for Playwright testing
- Toolbar container has `data-testid="app-shell-toolbar-container"`
- Content container has `data-testid="app-shell-content-container"`
- Initialization can be tested by checking workspace loading and URL parameter processing
- Network imports can be tested by providing URL parameters
- State restoration can be tested by checking restored selections, filters, and panel states

## Future Improvements

1. **Network Update Detection:** Check if networks in workspace have been updated in NDEx and prompt user to update (currently commented out)

2. **Import Progress:** Show progress indicators for network imports, especially for large files

3. **Error Recovery:** Add retry mechanisms for failed network imports

4. **URL Validation:** Validate URL parameters before processing to provide better error messages

5. **State Restoration Optimization:** Reduce or eliminate the 1s delay for network view restoration by using proper component lifecycle hooks

6. **Import Limits:** Make file size limits configurable rather than hardcoded
