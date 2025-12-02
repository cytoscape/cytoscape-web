# FloatingToolBar Feature

## Overview

The FloatingToolBar is a UI component that provides quick access to common network operations. It appears as a floating toolbar positioned at the bottom-right of the network viewport, containing buttons for layout application, viewport fitting, opening networks in Cytoscape Desktop, and sharing networks.

## Architecture

The FloatingToolBar follows a **component composition pattern** where:

- **FloatingToolBar** is the main container component that orchestrates all button components
- Each button is a **self-contained component** that handles its own state and interactions

## Component Structure

```
FloatingToolBar/
├── FloatingToolBar.tsx          # Main container component
├── ApplyLayoutButton.tsx        # Button to apply layout algorithms
├── FitButton.tsx                # Button to fit network to viewport
├── OpenInCytoscapeButton.tsx    # Button to open network in Cytoscape Desktop
├── ShareNetworkButton.tsx       # Button to share network via URL
└── index.tsx                    # Public exports
```

## Components

### FloatingToolBar

The main container component that renders all toolbar buttons.

**Behavior:**

- Automatically disables `ApplyLayoutButton` when `rendererId === 'circlePacking'` (circle packing renderer doesn't support layouts)
- Passes props down to child button components
- Renders with absolute positioning at bottom-right of viewport

**Styling:**

- Positioned absolutely at bottom-right of viewport
- Semi-transparent background for visual separation
- Border and border-radius for visual separation

### ApplyLayoutButton

Button that applies the default layout algorithm to the network.

**Behavior:**

- Applies the default layout algorithm to network nodes and edges
- Automatically fits the network to viewport after layout is applied
- Creates undo command for the layout operation
- Shows tooltip with layout name when enabled
- Shows disabled tooltip when disabled

### FitButton

Button that fits the network view to the viewport.

**Behavior:**

- Fits the network view to the viewport
- Prioritizes network-specific fit behavior over renderer-specific fit
- Uses active network view if available, otherwise uses current network
- Shows tooltip when enabled or disabled

### OpenInCytoscapeButton

Button that opens the network in Cytoscape Desktop application.

**Behavior:**

- Checks if Cytoscape Desktop is available
- Collects all network data (network, visual style, summary, table, view model, etc.)
- Exports network to CX2 format
- Opens in Cytoscape Desktop via NDEx client
- Disabled when Cytoscape Desktop is not available
- Tooltip text reflects feature availability status

### ShareNetworkButton

Button that copies a shareable URL to the clipboard.

**Behavior:**

- Generates shareable URL with current UI state and selection
- Encodes panel states, table browser tab, and network view as URL parameters
- Encodes selected nodes/edges for the main network (limited to 300 items to avoid URL length issues)
- **Target Network ID Resolution:**
  - Uses `targetNetworkId` prop if provided (typically from subnetwork viewer)
  - Otherwise, uses `activeNetworkView` from UI state if it differs from `currentNetworkId` (typically when viewing a subnetwork tab in main network panel)
  - This ensures the correct network view is encoded regardless of where the button is used
- When the effective target network ID represents a subnetwork (interaction network with ID containing `_`):
  - Encodes `activeNetworkView` parameter with the subnetwork ID
  - Encodes `selectedSubnetworkNodes` parameter with selected nodes in the subnetwork
  - Encodes `selectedSubnetworkEdges` parameter with selected edges in the subnetwork
  - Both main network and subnetwork selections can be encoded simultaneously
- Copies URL to clipboard
- Shows success message after copying
- Disabled for local networks (must be saved to NDEx first)

**Subnetwork Detection:**

- Subnetworks are identified by network IDs containing an underscore (`_`)
- Format: `hierarchyId_subsystemId`
- Only subnetworks (not hierarchy networks) will have their selection encoded as `selectedSubnetworkNodes`/`selectedSubnetworkEdges`

**Usage Context:**

- **From Main Network Panel**: When viewing a subnetwork tab, automatically detects and includes the subnetwork view in the URL via `activeNetworkView` from UI state
- **From Subnetwork Viewer**: Uses `targetNetworkId` prop to explicitly specify the subnetwork being viewed
- Both contexts produce identical URLs with the same `activeNetworkView` parameter, ensuring consistent sharing behavior

## Integration Points

The FloatingToolBar components integrate with the following stores and services:

- **LayoutStore** - Layout algorithms and engines
- **NetworkStore** - Network data
- **NetworkSummaryStore** - Network summaries and NDEx status
- **OpaqueAspectStore** - Opaque aspects for Cytoscape export
- **RendererFunctionStore** - Renderer functions (fit, etc.)
- **TableStore** - Table data
- **UiStateStore** - UI state (panels, active network view, visual style options)
- **ViewModelStore** - Network views and node positions
- **VisualStyleStore** - Visual styles
- **WorkspaceStore** - Current network ID and workspace data
- **MessageStore** - User notifications
- **UndoStore** - Undo/redo functionality

## Design Decisions

1. **Fit After Layout**: `ApplyLayoutButton` automatically fits the network after layout is applied to ensure the network is visible.

2. **Network-Specific Fit Priority**: `FitButton` prioritizes network-specific fit functions, allowing different viewports to have independent fit behavior.

3. **Selection Encoding Limit**: `ShareNetworkButton` limits selection encoding to 300 items per network (main network and subnetwork separately) to avoid URL length issues.

4. **Dual Network Selection Support**: `ShareNetworkButton` can encode selections for both the main network (`selectedNodes`/`selectedEdges`) and a subnetwork (`selectedSubnetworkNodes`/`selectedSubnetworkEdges`) simultaneously when the effective target network ID represents a subnetwork.

5. **Automatic Subnetwork Detection**: `ShareNetworkButton` automatically detects when viewing a subnetwork by checking `activeNetworkView` from UI state when `targetNetworkId` is not provided, ensuring consistent URL generation from both main network panel and subnetwork viewer contexts.

6. **Feature Availability Check**: `OpenInCytoscapeButton` checks feature availability before enabling, providing better UX.

7. **Disabled State for Local Networks**: `ShareNetworkButton` is disabled for local networks, guiding users to save to NDEx first.

## Future Improvements

1. **Error Handling**: Add better error handling for failed operations
2. **Accessibility**: Improve ARIA labels and keyboard navigation
3. **Internationalization**: Add i18n support for tooltips and messages
