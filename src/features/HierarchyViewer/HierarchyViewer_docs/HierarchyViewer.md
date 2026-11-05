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
│   │   ├── memberNames.ts               # Protein-name lookup for member ids
│   │   └── ...
│   ├── SubNetworkPanel.tsx              # Interaction network viewer
│   ├── FilterPanel/                     # Network filtering controls
│   │   ├── FilterPanel.tsx
│   │   ├── CheckboxFilter.tsx
│   │   └── ModeSelector.tsx            # (Removed - see note below)
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
    ├── subnetworkQueryUtil.ts
    └── subsystemName.ts
```

## Components

### MainPanel

The main orchestrator component that manages the hierarchy viewer layout and state.

**Behavior:**

- Detects if the current network is a hierarchy (HCX format) by checking for HCX metadata in networkAttributes:
  - `ndexSchema: "hierarchy_v0.1"` (required)
  - `HCX::modelFileCount` (required)
  - `HCX::interactionNetworkUUID` (optional - for networks with associated interaction networks)
  - `HCX::interactionNetworkHost` (optional - host for interaction network queries). Untrusted: requests to any host other than the configured NDEx host are anonymous, so a private interaction network on another host does not load (see `docs/specifications/EXTERNAL_INPUT_VALIDATION_POLICY.md`, #936)
- Registers the Circle Packing renderer if hierarchy is detected
- Manages selection state and extracts subsystem information from selected nodes
- Names the selected subsystem (`getSubsystemName`) by the attribute the node label is mapped to, else its `name` column, else its node id: HCX files need not have a `name` column (the test fixtures name nodes with `n`), and a null, absent or blank value, or a list with no non-blank item, counts as none
- Coordinates between Circle Packing view and SubNetwork view
- Handles multiple node selection and validates that selections are from the same branch
- Displays appropriate messages when hierarchy is not detected or no subsystem is selected

**Key Features:**

- Automatic hierarchy detection based on network metadata
- Subsystem selection extraction from table data (nodes with `HCX::members` attribute)
- Query generation for fetching interaction networks using `HCX::interactionNetworkUUID`

### CirclePackingPanel

A D3.js-based visualization component that renders hierarchical structures as nested circles.

**Behavior:**

- Renders hierarchy as nested circles using D3.js circle packing algorithm
- Supports zoom and pan interactions
- Dynamically shows/hides labels based on zoom level
- Handles node selection (subsystems and leaf nodes). Labels are drawn over the rings with `pointer-events: none`, so a click or hover on a label reaches the ring underneath
- Supports multi-selection of leaf nodes (enables selecting multiple leaves simultaneously)
- Synchronizes selection with SubNetworkPanel (see [Selecting protein rings](#selecting-protein-rings))
- Highlights the protein rings a search matched (see [Search and protein rings](#search-and-protein-rings))
- Applies visual styles from the visual style store
- Provides fit-to-viewport functionality
- Labels protein rings with protein names (see [Protein ring labels](#protein-ring-labels))
- On initial load with selected leaves (from URL parameters), automatically fits the viewport to show the subsystem containing those leaves

**Key Features:**

- Zoom-based visibility control (shows labels at appropriate zoom levels)
- Interactive selection (click subsystems to view interactions, click leaf nodes to select)
- Multi-selection support for leaf nodes (stores selected leaves as an array)
- Search state integration (expands all when search is active)
- Visual feedback for selected nodes (highlighted borders)
  - Selected subsystems: orange border (`CpDefaults.selectedBorderColor`)
  - Selected leaf nodes: red border (`CpDefaults.leafBorderColor`)
- Tooltip support for hovered elements
- Selection synchronization with subnetwork view
- Initial fit to selected leaves: When loading from URL with `selectedSubnetworkNodes`, automatically expands to and fits the subsystem containing those leaf nodes (runs once on initial load only)
- User click behavior: Normal user clicks on subsystem nodes do not trigger auto-expand/zoom (only happens on initial load from URL)

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

- Shows the one filter the interaction network's `filterWidgets` aspect defines: its attribute and target (nodes or edges) are fixed, and the user can only switch it on and off and pick values (#798)
- Supports checkbox-based discrete filtering
- Uses visibility bypass maps to show/hide filtered elements (replaces show/hide mode)
- Integrates with visual style mappings for color coding
- Updates URL parameters for filter state
- Only visible for interaction networks (not main hierarchy or HCX networks)

**Key Features:**

- Visibility toggle (on/off switch, stored on the filter config)
- Checkbox filter with select all/clear functionality
- Options are the column's distinct values, sorted by type (numbers numerically, `false` before `true`). Elements with a null, absent or blank-string value (`isMissingValue`; clearing a string cell in the table browser writes `''`) share one last option, labelled with a muted, italic `N/A` and stored as `null` in the range (`DiscreteFilterValue`); Select All checks it too
- Visual mapping integration (colors from visual styles)
- Visibility-based filtering (uses visual style bypass maps to control element visibility)
- URL parameter synchronization

**Filtering Implementation:**

- Filters use visibility bypass maps (`setBypassMap`) to control element visibility
- Matching elements are set to `VisibilityType.Element` (visible)
- Non-matching elements are set to `VisibilityType.None` (hidden)
- When no options are selected, all elements are hidden
- Filtering is applied through the visual style store's bypass map mechanism
- The toolbar's Select › Show All, run on the subnetwork, removes these bypasses and switches the filter off, as applying a FILTER tab filter does (`SelectMenu_docs/SelectMenu.md`)

**Note:** Filter configurations are extracted from the interaction network's `filterWidgets` opaque aspect. HCX networks do not contain filter widgets - only interaction networks (those referenced by `HCX::interactionNetworkUUID`) can have filter configurations.

### PropertyPanel

Displays properties of selected nodes in the interaction network.

**Behavior:**

- Shows all properties of a single selected node: one row per node table column, like the Nodes table
- Displays property name-value pairs in a scrollable list
- Shows appropriate messages when no node is selected or multiple nodes are selected
- Values render through `AttributeValue` (formatting in `utils/attributeValueDisplay.ts`): list items are separated by `, `; a null, absent, blank-string or empty-list value shows a muted, italic `N/A`
- A string value (or list item) that is entirely an `http(s)` URL, or an Ensembl gene id with the `ensembl:` prefix (case-insensitive, optional version suffix), renders as a link opening in a new tab. Ensembl ids link to NCBI Gene; more identifier types go in the `IDENTIFIER_LINKS` table

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

### Protein ring labels

When `HCX::members` holds node ids of the interaction network (MuSIC does),
`createTreeLayout` looks their names up in that network
(`resolveMemberNames` in `memberNames.ts`, via `fetchNodeNamesByIds`) and
labels each ring with the name found for its id. A ring whose name is missing
or blank, or a failed lookup, shows the id. `HCX::memberNames` lists are shown
as they are, even when a name looks like a number.

The interaction network and its host come from this hierarchy's own network
summary (`interactionNetworkSource`), never from a shared store. The renderer
is mounted hidden at startup, so it often builds before the summary has
loaded. It waits for the summary and the primary view, and builds again whenever
the interaction network changes or `NetworkTabs` reuses the panel for another
hierarchy. It used to take the network id from `SubNetworkStore`, which
`MainPanel` filled in only after reading the metadata, so after a reload the
startup build looked names up in network `''` and the rings showed numbers
(#933). The lookup returns names keyed by id: reading them back by position
only worked because MuSIC's ids happen to be `0..n-1`.

### Cell View size

`NetworkTabs` reports the size of the box that holds the renderers
(`useContainerSize`), and `CirclePackingPanel` receives it as `initialSize`. The
size follows the real box, but the panel uses it for one thing only: the first
layout of a hierarchy.

- A first build waits until the box is at least 100 px each way
  (`MIN_BOX_SIZE`). After a reload the box can be 0 x 0, or at Allotment's 30 px
  pane minimum, until the panes have been laid out. A smaller box builds nothing
  and draws nothing, and the build runs as soon as the box is large enough.
- A rebuild packs into the size the current layout was built for, so nothing
  moves on screen.
- Resizing a drawn view neither rebuilds nor fits it, because that would throw
  away the user's zoom and pan. `useCenterAnchoredZoom` keeps its center instead.
  The view is fitted again only when the box comes back from below the minimum.

The box was measured only once on mount, so a box that was not laid out yet left
the Cell View blank, or tiny, until the next reload (#935).

### Selecting protein rings

A protein ring is selected by its protein's name (`terminalRingKey`), the one
key the Sub Network Viewer shares with the Cell View. So a click outlines in red
every ring of that protein, in whichever subsystems list it, whether the viewer
is open or not. Only the clicked ring's parent is selected (orange), and that
alone decides which subnetwork is shown. `originalId` is no use as the key: for
a protein ring it is the member id, which the viewer never sees (#931).

A subsystem with several parents is drawn once per path, and only its first
drawing has the node's id. The others are copies, with an id like `110-2d` and
`originalId` set. Clicking a copy, or a ring inside one, selects both ids
(`subsystemSelection`): the original first, since the viewer needs a table row,
and the copy so that the clicked ring's parent gets its orange border. So the
first drawing is orange as well, and the selected node count includes the copy,
which has no row of its own.

The click and the viewer talk through `SubNetworkStore`:

- A click names the protein (`selectedNodes`) and marks it pending
  (`selectedNodesPending`). `SubNetworkPanel` selects it once
  `shownSubNetworkId` names the subnetwork of the subsystem the click selected,
  then clears the mark. That subnetwork usually has yet to load, and may not
  even be mounted, so the mark lives in the store. Waiting on `queryNetworkId`
  instead would write into the previous subnetwork, which it keeps naming during
  the load.
- With nothing pending, a subnetwork arriving keeps the selection it has, such as
  one restored from `selectedSubnetworkNodes` in the URL.
- A ring's own selection is not sent back (`selectedHierarchyNodeNames`). The Cell
  View already shows it, an empty one would clear the border of a protein with no
  node in the subnetwork, and any other would start the expansion meant for an
  initial selection from the URL. A selection made in the viewer itself is sent,
  and outlines the rings of those names.

### Search and protein rings

A protein ring is generated from a subsystem's member list (`HCX::members`
or `HCX::memberNames`) and has no row in the node table. A subsystem with no
children is a terminal ring too, so only the flag tells them apart:
`cyNetDag2tree2` marks these rings with
`D3TreeNode.isMember`. The search can only select table rows, so a query for a
protein selects the subsystems that list it (often the whole chain of
ancestors, root included) and not the ring itself (#930).

The Cell View closes that gap. `SearchBox` records each completed search in the
FilterStore (`search.lastSearch`: network, query, options, selected node ids),
and `findSearchMatchedRings` (`searchMatchedRings.ts`) finds the rings to
highlight:

- only after a search of the hierarchy itself (a search of the Sub Network
  Viewer's network is ignored), and only while the selection is still that
  search's result. Selecting anything else (Select ▸ Deselect All, clearing
  the search) drops the highlight for good: `SearchBox` forgets the search
  once the selection stops matching it, so selecting the same nodes again
  later does not bring the highlight back. Any click on a Cell View circle clears
  `lastSearch` too: when the search selected a single subsystem, clicking one
  of its proteins selects that subsystem again, and the selection alone would
  not change
- only rings directly inside a subsystem the search selected, including every
  copy of a subsystem the hierarchy reaches more than once
- rings whose label matches any token of the query, using the search's own
  Contains/Exact mode (the same Fuse.js options as the table index, through
  `createFuseIndexFromRecords`). The AND operator already decided which
  subsystems were selected

Matched rings get the protein-ring selection border (red). They are not added
to the Sub Network Viewer's selection. The search count still counts nodes,
since rings are not nodes.

Contains matches substrings, so `DR1` also matches a `WDR18` ring. In Exact
mode, a subsystem whose protein list is one comma-separated string column (as
in MuSIC's `Proteins`) does not equal `DR1`, so the search selects no subsystem
and no ring is highlighted.

## Integration Points

The HierarchyViewer integrates with the following stores and services:

- **NetworkStore** - Network data storage
- **NetworkSummaryStore** - Network metadata and HCX information
- **TableStore** - Node and edge table data
- **ViewModelStore** - Network views and selections
- **VisualStyleStore** - Visual styling information
- **FilterStore** - Filter configurations, and the last search (`search.lastSearch`) for highlighting protein rings
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

3. **Selection Synchronization**: Maintains bidirectional selection synchronization between hierarchy and interaction network, allowing users to explore relationships seamlessly. Circle packing panel supports multi-selection of leaf nodes, storing selected leaves as an array for enhanced interaction capabilities.

4. **Async Network Loading**: Uses React Query for async network fetching with proper loading states and error handling, preventing UI blocking.

5. **Web Worker for Layout**: Offloads heavy layout calculations to Web Workers to prevent UI freezing, with synchronous fallback for compatibility.

6. **Filter Integration**: Extracts filter configurations from interaction network's `filterWidgets` opaque aspect. Only interaction networks (those with `interactionNetworkUUID`) can have filter widgets - HCX networks themselves do not contain filters. Filters use visibility bypass maps to control element visibility, replacing the previous show/hide mode approach.

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
2. **Hierarchy Building**: CirclePackingPanel builds D3 hierarchy from network data using nodes with `HCX::members` attributes, once the network summary has loaded, and looks protein names up in the interaction network named by `HCX::interactionNetworkUUID` / `HCX::interactionNetworkHost`
3. **Subsystem Selection**: User selects subsystem in Circle Packing view
4. **Query Generation**: MainPanel extracts member nodes from `HCX::members` attribute and interaction network UUID from `HCX::interactionNetworkUUID`
5. **Network Fetching**: SubNetworkPanel fetches interaction network via NDEx query using the interaction network UUID
6. **Network Registration**: Fetched network is registered to stores with layout applied
7. **Filter Application**: Filter configurations are extracted from interaction network's `filterWidgets` opaque aspect and applied using visibility bypass maps (matching elements set to visible, non-matching set to hidden)
8. **Selection Sync**: Selections are synchronized between views (bidirectional sync between circle packing view and subnetwork view, with multi-selection support for leaf nodes)

## Recent Changes

### Multi-Selection Support (v1.0.5)

- **CirclePackingPanel**: Enhanced to support multi-selection of leaf nodes
  - Changed from single `selectedLeaf` (string) to `selectedLeaves` (array) state
  - Enables selecting multiple leaf nodes simultaneously
  - Improved selection synchronization with subnetwork view

### Visibility-Based Filtering (v1.0.5)

- **CheckboxFilter**: Refactored to use visibility bypass maps instead of show/hide mode
  - Removed show/hide display mode
  - Filters now use `setBypassMap` to control element visibility through the visual style store
  - Matching elements: `VisibilityType.Element` (visible)
  - Non-matching elements: `VisibilityType.None` (hidden)
  - Provides more consistent filtering behavior and better integration with visual styles

- **ModeSelector**: Removed from UI
  - Previously allowed users to choose between SELECT and SHOW_HIDE display modes
  - SHOW_HIDE mode was removed due to architectural issues (see CyjsRenderer documentation for details)
  - Filters now always use SELECT mode; visibility is controlled independently through visibility bypass maps

## Future Improvements

1. **Performance Optimization**: Further optimize circle packing rendering for large hierarchies
2. **Error Handling**: Improve error handling and recovery for failed network loads
3. **Accessibility**: Add keyboard navigation and screen reader support
4. **Internationalization**: Add i18n support for all UI text
5. **Layout Options**: Provide alternative layout algorithms for hierarchy visualization
6. **Export Functionality**: Add export capabilities for filtered networks
7. **Batch Operations**: Support batch selection and filtering operations
