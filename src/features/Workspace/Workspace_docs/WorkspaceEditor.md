# WorkspaceEditor Feature

## Overview

The WorkspaceEditor component is the main workspace interface that provides a resizable panel layout for network visualization and management. It handles network loading, modification tracking, layout application, and coordinates multiple panels and stores.

## Architecture

The WorkspaceEditor follows a **container component pattern** where:

- **WorkspaceEditor** is the main container that orchestrates layout and network management
- It uses Allotment for resizable panel layouts
- It coordinates with multiple Zustand stores for state management
- It uses React Router's `<Outlet />` for nested routing
- It subscribes to store changes to detect network modifications

## Component Structure

```
WorkspaceEditor/
├── WorkspaceEditor.tsx          # Main container component
└── WorkspaceEditor_docs/        # Documentation
```

## Components

### WorkspaceEditor

The main workspace editor component that provides layout and network management.

**Behavior:**

- **Layout Management:**
  - Left Panel: Network browser and layout tools (collapsible, max 450px when open, 18px when closed)
  - Center Pane: Network renderer (via `<Outlet />` and `NetworkPanel`)
  - Bottom Panel: Table browser (resizable, 20% default, up to 90% of window height)
  - Right Panel: Side panel with additional tools (collapsible)

- **Network Loading:**
  - Loads network data, summaries, visual styles, tables, views, and opaque aspects
  - Handles network switching when URL parameter changes
  - Uses loading ref to prevent concurrent loads
  - Shows error state if network fails to load

- **Modification Tracking:**
  - Monitors view model changes (excluding selection state)
  - Monitors visual style changes
  - Sets `networkModified` flag when changes are detected
  - Only tracks modifications if network is not already marked as modified

- **Layout Application:**
  - Automatically applies default layout to networks without layouts
  - Fits viewport after layout is applied
  - Updates network summary with `hasLayout: true` after layout
  - Sets network as unmodified after layout completes

- **HCX Validation:**
  - Validates HCX networks on load
  - Shows warning message if network is not valid HCX
  - Stores validation result in HCX validator store

- **Window Resize Handling:**
  - Updates table browser width on window resize
  - Ensures table browser adapts to window size changes

**Layout Structure:**

```
┌─────────────────────────────────────────────────────────┐
│ Toolbar (from AppShell)                                  │
├──────────┬───────────────────────────────┬──────────────┤
│          │                               │              │
│  Left    │      Center Pane              │   Right     │
│  Panel   │   (Network Renderer)          │   Panel     │
│          │                               │   (optional) │
│          │                               │              │
├──────────┴───────────────────────────────┴──────────────┤
│          Bottom Panel (Table Browser)                     │
└───────────────────────────────────────────────────────────┘
```

**Design Decisions:**

1. **Loading Prevention:** Uses `isLoadingRef` to prevent concurrent network loads, avoiding race conditions and duplicate API calls

2. **Modification Detection:** Excludes selection state (selectedNodes, selectedEdges) from modification detection because selection changes are temporary UI state, not network modifications

3. **Layout Application:** Automatically applies default layout to networks without layouts to ensure networks are always viewable

4. **Viewport Fitting:** Fits viewport after layout application to ensure network is visible and centered

5. **HCX Validation:** Validates HCX networks on load to provide early feedback about network compatibility

6. **Panel State Management:** Uses UI state store for panel visibility, allowing panels to be controlled from other components

7. **Lazy Loading:** Uses React.lazy for heavy components (NetworkPanel, TableBrowser, forms) to improve initial load time

8. **Store Subscriptions:** Uses Zustand store subscriptions to reactively detect changes rather than polling

## Integration Points

The WorkspaceEditor integrates with the following stores and services:

- **WorkspaceStore** - Workspace data, current network ID, network modification flags
- **NetworkStore** - Network data
- **NetworkSummaryStore** - Network summaries
- **UiStateStore** - UI state (panels, active network view, visual style options)
- **ViewModelStore** - Network views and node positions
- **VisualStyleStore** - Visual styles
- **TableStore** - Node and edge tables
- **LayoutStore** - Layout engines and running state
- **MessageStore** - User notifications
- **UndoStore** - Undo/redo stacks
- **OpaqueAspectStore** - Opaque aspects
- **RendererFunctionStore** - Renderer functions (fit, etc.)
- **HcxValidatorStore** - HCX validation results
- **CredentialStore** - Authentication tokens
- **useLoadCyNetwork** - Network loading hook
- **useLoadNetworkSummaries** - Summary loading hook
- **useWorkspaceManager** - Workspace management
- **useNetworkViewManager** - Network view management
- **useTableManager** - Table management
- **useNetworkSummaryManager** - Summary management
- **useHierarchyViewerManager** - Hierarchy viewer management
- **useAppManager** - External app management

## Network Loading Flow

1. **URL Parameter Change:** React Router detects network ID change in URL
2. **Loading Check:** Check if already loading (prevent concurrent loads)
3. **Load Summary:** Fetch network summary from NDEx or cache
4. **Load Network Data:** Fetch full network data (network, tables, styles, views)
5. **Populate Stores:** Update all stores with loaded data
6. **Validate HCX:** If HCX network, validate and store result
7. **Apply Layout:** If no layout, apply default layout
8. **Update Current Network:** Set current network ID in workspace
9. **Error Handling:** Set error state if loading fails

## Modification Detection Flow

1. **Store Subscription:** Subscribe to ViewModelStore and VisualStyleStore changes
2. **Change Detection:** Compare current and previous values (excluding selection state for view model)
3. **Modification Check:** Check if network is already marked as modified
4. **Set Flag:** If changed and not already modified, set `networkModified` flag

## Layout Application Flow

1. **Check Layout:** Check if network summary has `hasLayout: true`
2. **Select Default:** Get default layout based on network size and threshold
3. **Find Engine:** Find layout engine matching default layout
4. **Apply Layout:** Call engine.apply with nodes, edges, and callback
5. **Update Positions:** Update node positions in view model
6. **Fit Viewport:** Call fit function to center network
7. **Update Summary:** Update summary with `hasLayout: true`
8. **Reset Modified:** Set network as unmodified (layout is not a user modification)

## Design Decisions

1. **Exclude Selection from Modifications:** Selection state changes (selectedNodes, selectedEdges) don't count as network modifications because they're temporary UI state

2. **Automatic Layout:** Networks without layouts automatically get default layouts to ensure they're always viewable

3. **Loading Prevention:** Prevents concurrent loads using ref to avoid race conditions and duplicate API calls

4. **Error State:** Sets `failedToLoad` state to allow UI to show error messages

5. **Store Subscriptions:** Uses Zustand subscriptions for reactive change detection rather than polling or manual checks

6. **Lazy Loading:** Heavy components are lazy-loaded to improve initial render time

7. **Panel Dimensions:** Tracks allotment dimensions for child components that need layout information

## Testing Considerations

- WorkspaceEditor has `data-testid="workspace-editor"` for Playwright testing
- Left panel states have `data-testid="workspace-editor-left-panel-closed"` and `data-testid="workspace-editor-left-panel-open"`
- Open left panel button has `data-testid="workspace-editor-open-left-panel-button"`
- Center pane has `data-testid="workspace-editor-center-pane"`
- Bottom pane has `data-testid="workspace-editor-bottom-pane"`
- Right pane has `data-testid="workspace-editor-right-pane"`
- Table browser loading has `data-testid="workspace-editor-table-browser-loading"`
- Network loading can be tested by changing URL parameters
- Panel state can be tested by checking panel visibility
- Modification detection can be tested by making changes and checking networkModified flag

## Future Improvements

1. **Loading Indicators:** Add loading indicators during network load operations

2. **Error Recovery:** Add retry mechanisms for failed network loads

3. **Layout Progress:** Show progress indicators during layout application

4. **Modification Undo:** Allow undoing modifications that were auto-detected

5. **Panel Persistence:** Persist panel sizes and states across sessions

6. **Concurrent Load Handling:** Better handling of rapid network switches (debouncing, cancellation)

7. **Network Preloading:** Preload adjacent networks for faster switching

