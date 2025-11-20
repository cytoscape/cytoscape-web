# HierarchyViewer Feature

## Overview

The HierarchyViewer is a specialized feature for visualizing and interacting with hierarchical networks. It provides a dual-view interface combining a circle packing visualization of the hierarchy with an interaction network view, enabling users to explore relationships between hierarchical subsystems and their associated interaction networks.

## Architecture

The HierarchyViewer follows a **dual-panel architecture** where:

- **MainPanel** orchestrates the overall layout and manages hierarchy detection
- **CirclePackingPanel** renders the hierarchical structure using D3.js circle packing
- **SubNetworkPanel** displays the interaction network associated with selected subsystems
- **FilterPanel** and **PropertyPanel** provide filtering and property inspection capabilities

## Component Structure

```
HierarchyViewer/
├── components/
│   ├── MainPanel.tsx                    # Main orchestrator component
│   ├── CirclePackingLayout/              # Circle packing visualization
│   │   ├── CirclePackingPanel.tsx       # D3.js-based circle packing renderer
│   │   └── ...
│   ├── SubNetworkPanel.tsx              # Interaction network viewer
│   ├── FilterPanel/                     # Network filtering controls
│   │   ├── FilterPanel.tsx
│   │   ├── CheckboxFilter.tsx
│   │   ├── AttributeSelector.tsx
│   │   └── ModeSelector.tsx
│   ├── PropertyPanel/                   # Node property inspector
│   │   └── PropertyPanel.tsx
│   ├── StyleSelector/                    # Visual style selector
│   │   └── StyleSelector.tsx
│   └── Validation/                      # HCX validation UI
│       ├── HcxValidationErrorButtonGroup.tsx
│       ├── HcxValidationSaveDialog.tsx
│       └── HcxValidationWarningsDialog.tsx
├── store/                                # State management
│   ├── SubNetworkStore.tsx
│   ├── HcxValidatorStore.tsx
│   └── VisualStyleSelectorStore.tsx
├── model/                                # Data models
│   ├── CirclePackingView.ts
│   ├── HcxMetaData.ts
│   └── ...
└── utils/                                # Utility functions
    ├── hierarchyUtil.ts
    ├── filterUtil.ts
    └── subnetworkQueryUtil.ts
```

## Components

### MainPanel

The main orchestrator component that manages the hierarchy viewer layout and state.

**Behavior:**

- Detects if the current network is a hierarchy (HCX format) by checking for HCX metadata in networkAttributes:
  - `ndexSchema: "hierarchy_v0.1"` (required)
  - `HCX::modelFileCount` (required)
  - `HCX::interactionNetworkUUID` (optional - for networks with associated interaction networks)
  - `HCX::interactionNetworkHost` (optional - host for interaction network queries)
- Registers the Circle Packing renderer if hierarchy is detected
- Manages selection state and extracts subsystem information from selected nodes
- Coordinates between Circle Packing view and SubNetwork view
- Handles multiple node selection and validates that selections are from the same branch
- Displays appropriate messages when hierarchy is not detected or no subsystem is selected

**Key Features:**

- Automatic hierarchy detection based on network metadata
- Subsystem selection extraction from table data (nodes with `HCX::members` attribute)
- Query generation for fetching interaction networks using `HCX::interactionNetworkUUID`
- Root network ID and host management

### CirclePackingPanel

A D3.js-based visualization component that renders hierarchical structures as nested circles.

**Behavior:**

- Renders hierarchy as nested circles using D3.js circle packing algorithm
- Supports zoom and pan interactions
- Dynamically shows/hides labels based on zoom level
- Handles node selection (subsystems and leaf nodes)
- Synchronizes selection with SubNetworkPanel
- Applies visual styles from the visual style store
- Provides fit-to-viewport functionality

**Key Features:**

- Zoom-based visibility control (shows labels at appropriate zoom levels)
- Interactive selection (click subsystems to view interactions, click leaf nodes to select)
- Search state integration (expands all when search is active)
- Visual feedback for selected nodes (highlighted borders)
- Tooltip support for hovered elements

### SubNetworkPanel

Displays the interaction network associated with a selected subsystem.

**Behavior:**

- Fetches interaction network data via NDEx query API using the `HCX::interactionNetworkUUID` from the HCX network
- Registers fetched networks to the global network store
- Applies circle packing layout positioning to nodes based on hierarchy positions
- Handles filter configuration from interaction network aspects (not from HCX network)
- Synchronizes selection between hierarchy and interaction network
- Shows processing progress during network loading and registration
- Displays error messages for failed network loads

**Key Features:**

- Async network fetching with React Query
- Progress tracking during network registration
- Web Worker support for layout calculations (with fallback)
- Filter configuration extraction from interaction network's `filterWidgets` opaque aspect
- Bidirectional selection synchronization (hierarchy ↔ interaction network)

**Note:** Filter widgets are only present in interaction networks (those with `interactionNetworkUUID`), not in HCX networks themselves. The `filterWidgets` aspect is an opaque aspect containing filter configurations for the interaction network.

### FilterPanel

Provides filtering capabilities for interaction networks.

**Behavior:**

- Allows filtering by node or edge attributes
- Supports checkbox-based discrete filtering
- Provides two display modes: Selection and Show/Hide
- Integrates with visual style mappings for color coding
- Updates URL parameters for filter state
- Only visible for interaction networks (not main hierarchy or HCX networks)

**Key Features:**

- Attribute selection (node or edge attributes)
- Checkbox filter with select all/clear functionality
- Visual mapping integration (colors from visual styles)
- Display mode selection (Selection vs Show/Hide)
- URL parameter synchronization

**Note:** Filter configurations are extracted from the interaction network's `filterWidgets` opaque aspect. HCX networks do not contain filter widgets - only interaction networks (those referenced by `HCX::interactionNetworkUUID`) can have filter configurations.

### PropertyPanel

Displays properties of selected nodes in the interaction network.

**Behavior:**

- Shows all properties of a single selected node
- Displays property name-value pairs in a scrollable list
- Shows appropriate messages when no node is selected or multiple nodes are selected

**Key Features:**

- Single node property inspection
- Sorted property display
- Node name display from table data

### Validation Components

Components for validating HCX network compliance.

**Behavior:**

- Validates network against HCX specification
- Shows validation warnings and errors
- Provides revalidation functionality
- Warns users when saving invalid HCX networks

## Integration Points

The HierarchyViewer integrates with the following stores and services:

- **NetworkStore** - Network data storage
- **NetworkSummaryStore** - Network metadata and HCX information
- **TableStore** - Node and edge table data
- **ViewModelStore** - Network views and selections
- **VisualStyleStore** - Visual styling information
- **FilterStore** - Filter configurations
- **RendererStore** - Renderer registration (Circle Packing)
- **RendererFunctionStore** - Renderer function registration (fit, etc.)
- **WorkspaceStore** - Current network ID
- **UiStateStore** - UI state (active network view, panel states)
- **UndoStore** - Undo/redo functionality
- **CredentialStore** - NDEx authentication
- **MessageStore** - User notifications

## Design Decisions

1. **Dual-View Architecture**: Separates hierarchy visualization (Circle Packing) from interaction network visualization (SubNetwork) to provide clear separation of concerns and independent interaction models.

2. **Circle Packing for Hierarchy**: Uses D3.js circle packing algorithm to visualize hierarchical structures as nested circles, providing an intuitive representation of parent-child relationships.

3. **Selection Synchronization**: Maintains bidirectional selection synchronization between hierarchy and interaction network, allowing users to explore relationships seamlessly.

4. **Async Network Loading**: Uses React Query for async network fetching with proper loading states and error handling, preventing UI blocking.

5. **Web Worker for Layout**: Offloads heavy layout calculations to Web Workers to prevent UI freezing, with synchronous fallback for compatibility.

6. **Filter Integration**: Extracts filter configurations from interaction network's `filterWidgets` opaque aspect. Only interaction networks (those with `interactionNetworkUUID`) can have filter widgets - HCX networks themselves do not contain filters.

7. **HCX Validation**: Validates networks against HCX specification to ensure compatibility and warn users of potential issues.

8. **Zoom-Based Visibility**: Dynamically shows/hides labels and circles based on zoom level to improve readability and performance.

9. **Progress Tracking**: Provides detailed progress information during network loading and registration to improve user experience.

10. **URL Parameter Integration**: Synchronizes filter state with URL parameters for shareable filter configurations.

## Data Flow

1. **Network Detection**: MainPanel checks networkAttributes for HCX properties:
   - `ndexSchema: "hierarchy_v0.1"` (required)
   - `HCX::modelFileCount` (required)
   - `HCX::interactionNetworkUUID` (optional)
   - `HCX::interactionNetworkHost` (optional)
2. **Hierarchy Building**: CirclePackingPanel builds D3 hierarchy from network data using nodes with `HCX::members` attributes
3. **Subsystem Selection**: User selects subsystem in Circle Packing view
4. **Query Generation**: MainPanel extracts member nodes from `HCX::members` attribute and interaction network UUID from `HCX::interactionNetworkUUID`
5. **Network Fetching**: SubNetworkPanel fetches interaction network via NDEx query using the interaction network UUID
6. **Network Registration**: Fetched network is registered to stores with layout applied
7. **Filter Application**: Filter configurations are extracted from interaction network's `filterWidgets` opaque aspect and applied
8. **Selection Sync**: Selections are synchronized between views

## Future Improvements

1. **Performance Optimization**: Further optimize circle packing rendering for large hierarchies
2. **Error Handling**: Improve error handling and recovery for failed network loads
3. **Accessibility**: Add keyboard navigation and screen reader support
4. **Internationalization**: Add i18n support for all UI text
5. **Layout Options**: Provide alternative layout algorithms for hierarchy visualization
6. **Export Functionality**: Add export capabilities for filtered networks
7. **Batch Operations**: Support batch selection and filtering operations
