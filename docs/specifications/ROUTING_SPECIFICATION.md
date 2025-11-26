# Cytoscape Web Routing Specification

## Overview

This specification defines the routing behavior for the Cytoscape Web application based on the current implementation and requirements. The system uses React Router as the primary source of truth for navigation state.

## Core Principles

1. **URL as State**: Route parameters and search params represent the initial application state before any user action
2. **Consistent Navigation**: All navigation goes through React Router, not direct store manipulation
3. **Search Parameter Consumption**: Search parameters are consumed on initial load and removed from URL

## Route Structure

### Primary Routes

```
/                           → Root (AppShell)
/:workspaceId               → Workspace Editor
/:workspaceId/networks      → Workspace Editor with no network displayed
/:workspaceId/networks/:networkId → Network viewer
/error                      → Error page
```

### Route Parameters

- `workspaceId`: Unique identifier for the workspace (will be ignored if doesn't match cache)
- `networkId`: Unique identifier for a network within the workspace

## Route Behavior Specifications

### 1. Root Route (`/`)

**Purpose**: Application entry point and initialization

**Behavior**:

- Initialize workspace from cache or create new workspace
- Load workspace relevant UI state from cache
- Process `import` query parameters
- Handle authentication and configuration loading
- Redirect to appropriate workspace route

**Query Parameters**:

- `import`: URL to import network from
- `left`, `right`, `bottom`: Panel states (left -> network list panel, right -> subnetwork panel, bottom -> table browser panel)
- `activeTableBrowserTab`: Table browser tab index (0 -> nodes, 1 -> edges, 2 -> network)
- `activeNetworkViewTab`: Network view tab index (0, 1, 2, ...)

Query paramters will set the initial ui state and subsequently removed from the url

**Redirect Logic**:

```
/ → /:workspaceId/networks/:networkId
```

### 2. Workspace Route (`/:workspaceId`)

**Purpose**: Display workspace without specific network

**Behavior**:

- **Workspace ID in URL is ignored** - this is a key requirement
- If workspace exists in cache, load it and redirect to the loaded workspace ID
- If no workspace exists in cache, create a new one, load it, redirect to the loaded workspace ID
- It doesn't matter if the workspace ID in the original URL is found or not

**Redirect Logic**:

```
/:workspaceId → /:actualWorkspaceId/networks/:currentNetworkId
```

### 3. Networks List Route (`/:workspaceId/networks`)

**Purpose**: Display list of networks in workspace

**Behavior**:

- Currently renders an empty state for the network panel
- Intended to show network browser panel
- Handle empty workspace state
- Allow network selection and creation

### 4. Network Route (`/:workspaceId/networks/:networkId`)

**Purpose**: Display specific network with viewer

**Behavior**:

- Load network from cache or NDEx
- Apply layout if needed
- Restore relevant network UI state from search parameters
- Handle network loading errors
- Support network switching via browser navigation

**Query Parameters** (consumed on load):

- `selectedNodes`: Space-separated list of selected node IDs
- `selectedEdges`: Space-separated list of selected edge IDs
- `filterFor`: Filter target (node/edge)
- `filterBy`: Filter attribute name
- `filterRange`: Filter value range
- `activeNetworkView`: Active network view identifier
- `activeNetworkViewTab`: Network view tab index (0, 1, 2, ...)
- `activeTableBrowserTab`: Table browser tab index

**Error Handling**:

- Network not found in NDEx or cache → Show error, render current network
- Network loading failure → Show error message, render current network
- Invalid network ID → Show error message, render current network

### 5. Error Route (`/error`)

**Purpose**: Display error page

**Behavior**:

- Reset workspace state
- Provide recovery options
- Allow navigation back to root

## Import Behavior

### URL Import (`/:workspaceId/networks/:networkId`)

**Process**:

1. Check if networkId exists in workspace cache
2. If not in cache, attempt to load from NDEx
3. If found in NDEx, import to workspace
4. If not found, show error message and render current network

**Error Cases**:

- Network not found in NDEx → Error message, no import, render current network
- Network loading failure → Error message, no import, render current network
- Invalid network ID → Error message, no import, render current network

### Query Parameter Import (`?import=...`)

**Process**:

1. Parse import URL from query parameter
2. Fetch network data from URL
3. Import network to workspace
4. Remove import parameter from URL
5. Navigate to imported network

**Error Cases**:

- Invalid URL → Error message, no import, render current network
- Network fetch failure → Error message, no import, render current network
- Invalid CX format → Error message, no import, render current network

**Combined Import Logic**:

- If both URL networkId and import parameter exist:
  - Import network from import parameter first
  - Then attempt to load networkId if not in workspace
  - Apply selection states to imported network

## Search Parameter Management

### Consumed Parameters (Removed After Processing)

**UI State**:

- `left`, `right`, `bottom`: Panel states
- `activeTableBrowserTab`: Table browser tab index
- `activeNetworkViewTab`: Network view tab index
- `activeNetworkView`: Active network view

**Network State**:

- `selectedNodes`: Selected node IDs
- `selectedEdges`: Selected edge IDs
- `filterFor`, `filterBy`, `filterRange`: Filter configuration

**Import**:

- `import`: Network import URL

**Behavior**:

- Search query params are consumed on initial load
- They set the initial state of the app
- Then are removed from the URL
- User actions that edit the initial state do not update any query parameters

## Navigation Behavior

### Browser Navigation

**Back/Forward Buttons**:

- Back/forward buttons sync to the networks being switched
- There is no syncing between the undo/redo stack
- Preserve UI panel states

**History Management**:

- User deletes network → Do not re-add the network when pressing back button (remove history entry)
- User switches between networks → Add history entry
- Panel state changes → Do not add history entries

### Programmatic Navigation

**Network Switching**:

```typescript
navigate(`/${workspaceId}/networks/${networkId}`)
```

**Workspace Switching**:

```typescript
navigate(`/${newWorkspaceId}/networks/${networkId}`)
```

**Error Navigation**:

```typescript
navigate('/error', { replace: true })
```

## Error Handling

### Network Loading Errors

**Behavior**:

- Show error message to user
- Stay on current network or render current network
- Do not redirect to error page
- Allow user to retry or navigate away

### Workspace Errors

**Behavior**:

- Create new workspace if current workspace is corrupted
- Redirect to new workspace
- Preserve user data where possible

### Critical Errors

**Behavior**:

- Redirect to `/error` page
- Reset workspace state
- Provide recovery options

## State Synchronization

### URL to Store Synchronization

**Initial Load**:

1. Parse route parameters
2. Load workspace and network data
3. Apply search parameters to UI state
4. Remove consumed search parameters
5. Update stores with loaded data

**Navigation**:

1. Update route parameters
2. Load new network data
3. Update stores
4. Preserve UI state where appropriate

### Store to URL Synchronization

**User Actions**:

- Network switching → Update route
- Workspace switching → Update route
- Panel state changes → Do not update search parameters (consumed only)
- Selection changes → Do not update search parameters (consumed only)

## Implementation Guidelines

### Component Responsibilities

**AppShell**:

- Handle root route initialization
- Process import parameters
- Manage workspace loading
- Handle authentication
- Check for updates in NDEx (check networkId in NDEx and check timestamps)
- Import networks from URLs/other sources

**WorkspaceEditor**:

- Handle workspace-specific routes
- Manage network loading
- Restore UI state from search parameters
- Handle network switching
- Swap current network based on route parameters

### Navigation Hooks

**useUrlNavigation**:

```typescript
const { navigateToNetwork, updateSearchParams } = useUrlNavigation()
```

**useNavigateToNetwork**:

```typescript
const navigateToNetwork = ({
  workspaceId,
  networkId,
  replace = false,
  search = ''
}) => void
```

### Search Parameter Restoration

**Selection States**:

```typescript
const restoreSelectionStates = (networkId: IdType): void => {
  const selectedNodeStr = search.get(SelectionStates.SelectedNodes) ?? ''
  const selectedEdgeStr = search.get(SelectionStates.SelectedEdges) ?? ''
  const selectedNodes: IdType[] = selectedNodeStr.split(' ')
  const selectedEdges: IdType[] = selectedEdgeStr.split(' ')
  exclusiveSelect(networkId, selectedNodes, selectedEdges)
}
```

**Filter States**:

```typescript
const restoreFilterStates = (): void => {
  const filterFor = search.get(FilterUrlParams.FILTER_FOR)
  const filterBy = search.get(FilterUrlParams.FILTER_BY)
  const filterRange = search.get(FilterUrlParams.FILTER_RANGE)
  // Apply filter configuration
}
```

**UI States**:

```typescript
const restoreTableBrowserTabState = (): void => {
  const tableBrowserTab = search.get('activeTableBrowserTab')
  if (tableBrowserTab != null) {
    setActiveTableBrowserIndex(Number(tableBrowserTab))
  }
}

const restoreNetworkViewTabState = (): void => {
  const networkViewTab = search.get('activeNetworkViewTab')
  if (networkViewTab != null) {
    const tabIndex = Number(networkViewTab)
    if (!isNaN(tabIndex) && tabIndex >= 0) {
      setNetworkViewTabIndex(tabIndex)
    }
  }
}
```

## Component Responsibility Status

The current responsibilities of each component and their purpose in fulfilling the routing requirements

- **AppShell.tsx**: Initialize workspace, UI state, process search params (including activeNetworkViewTab)
- **AppShell.tsx**: Check for updates in NDEx (check networkId in NDEx and check timestamps)
- **AppShell.tsx**: Import networks from URLs/other sources
- **UrlNavigation Hook**: Navigate to different networks/routes
- **NetworkTabs.tsx**: Display network view tabs (no longer manages URL parameters)
- **ShareNetworkButton.tsx**: Generate URLs to share networks (includes activeNetworkViewTab)
- **FilterPanel.tsx**: Set filters for interaction network
- **Error.tsx**: Reset workspace, navigate to new workspace
- **UpdateNetworkDialog.tsx**: Navigate to network after deleting it, retrieving update from NDEx
- **LoadWorkspaceDialog.tsx**: Navigate to root and load workspace from NDEx
- **ResetLocalWorkspace.tsx**: Navigate to root after deleting workspace
- **CheckboxFilter.tsx**: Update search params

## Open Questions

### currentNetworkId vs Route Params

- Do we let the store model dictate what is rendered, vs do we let route params determine what is rendered?
- Leaning towards the route parameters

### Value of currentNetworkId

- Apps don't automatically redirect to the current document
- Going to figma.com/chatgpt.com/youtube.com doesn't automatically go to the "current document/chat/video"
- Consider removing currentNetworkId dependency

### Combined Import Scenarios

- What if a user has `/:workspaceId/networks/:networkId?import=...`?
- Assume import both where networkId is not in the workspace
- How will all the query params work for import? Do we import the network and apply the selection states to that imported network?

## Testing Requirements

### Route Testing

- Test all route combinations
- Verify redirect behavior
- Test error scenarios
- Validate parameter handling
- Test workspace ID ignoring behavior

### Navigation Testing

- Test browser back/forward
- Test programmatic navigation
- Verify history management
- Test import scenarios
- Test combined import scenarios

### State Testing

- Verify URL-to-store synchronization
- Test store-to-URL synchronization
- Validate search parameter consumption
- Test error recovery
- Test workspace creation/loading

### Import Testing

- Test URL import scenarios
- Test query parameter import scenarios
- Test combined import scenarios
- Test error handling for failed imports
- Test network loading from NDEx

## Performance Considerations

### Lazy Loading

- Implement route-based code splitting
- Lazy load network components
- Optimize bundle size for different routes

### Caching

- Cache workspace and network data
- Implement intelligent preloading
- Optimize network requests

### Memory Management

- Clean up unused network data
- Implement proper component unmounting
- Manage browser history size
