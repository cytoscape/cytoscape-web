# CyjsRenderer Feature

## Overview

The `CyjsRenderer` feature is the core network visualization engine for Cytoscape Web. It wraps **Cytoscape.js** in a React component, rendering node-link diagrams from the application’s network, view model, and visual style stores. It is responsible for:

- Creating and managing the Cytoscape.js instance
- Mapping application visual styles to Cytoscape.js styles
- Applying view models (node positions, selections, visibility)
- Handling user interactions (selection, dragging, hover)
- Synchronizing viewport and selections back to global state
- Rendering network annotations on a canvas overlay

`CyjsRenderer` is used by the `NetworkPanel` as the default renderer for network views.

## Architecture

The feature is split into three main parts:

- **`CyjsRenderer.tsx`**: React component that owns the Cytoscape.js lifecycle and connects to Zustand stores
- **`cyjsFactoryUtil.ts`**: Transforms application node/edge data into Cytoscape.js elements
- **`cyjsRenderUtil.ts`**: Maps visual styles to Cytoscape.js styles and applies view models
- **`annotations/`**: Canvas-based annotation renderer layered on top of the Cytoscape viewport
- **`registerCyExtensions.ts`**: Registers custom Cytoscape.js extensions (e.g., export, layouts)

This separation keeps the React component focused on orchestration while delegating data and style transformation to utilities.

## Component Behavior (`CyjsRenderer.tsx`)

### Inputs

- **`network?: Network`**: The network to render
- **`displayMode?: DisplayMode`**: How to visualize selection
  - `SELECT`: Standard selection highlighting
  - `SHOW_HIDE`: Show selected elements and hide others
- **`hasTab?: boolean`**: Whether the renderer lives in a tabbed context (affects sizing/behavior in `NetworkPanel`)

### Local State & Refs

- **Cytoscape instance and container**
  - `cy`: Cytoscape Core instance
  - `cyContainer`: DOM ref for the Cytoscape container
  - `isInitialized`: prevents duplicate initialization
  - `isViewCreated`: avoids redundant style updates during initial render

- **Interaction state**
  - `dragStartPosition`: remembers node positions at the start of a drag (for undo/redo)
  - `hoveredElement`, `lastHoveredElement`: track hover state for nodes/edges
  - `subSelectedEdges`: for show/hide mode when highlighting sub-selections
  - `clickSelection`: distinguishes click-based selection from filter-based selection

- **View and style state**
  - `cyStyle`: Cytoscape style array generated from `VisualStyle`
  - `renderedId`: last rendered network id, used to detect when a full re-render is needed
  - `nodesMoved`: throttles or prevents unnecessary fit operations after the user changes layout
  - `viewportChangeHandlerRef`: keeps a handle to the viewport listener so it can be temporarily removed during undo/redo
  - `bgColor`: background color derived from `VisualStyle` (network background)

### Store Integration

`CyjsRenderer` reads from and writes to several global stores:

- **ViewModelStore**
  - `getViewModel`, `setViewModel`: network view model (node positions, selections, viewport)
  - `exclusiveSelect`, `toggleSelected`, `setNodePosition`: selection and layout updates

- **VisualStyleStore / UiStateStore**
  - `visualStyles[id]`: visual style for the current network
  - `visualEditorProperties`: visual editor options (e.g., lock node size)

- **TableStore / NetworkSummaryStore**
  - `tables[id]`: node/edge tables for attributes
  - `summaries[id]`: network summary metadata

- **RendererFunctionStore / RendererStore**
  - `setRendererFunction`: registers the renderer’s `renderNetwork` function for external use
  - `setViewport`, `getViewport`: syncs Cytoscape viewport with global renderer state

- **LayoutStore**
  - `isRunning`: indicates when a layout algorithm is active for this network

- **UndoStore**
  - `postEdit`: pushes undo/redo commands when node positions change

- **AppConfigContext**
  - `debug`: enables debug logging for verbose instrumentation

### Rendering Flow

The core **`renderNetwork(forceFit = true)`** function is responsible for:

1. **Guard conditions**
   - Skip if `cy` is not ready
   - Skip if the currently rendered network matches the requested network and the node/edge counts are unchanged

2. **Reset Cytoscape instance**
   - Clear event listeners
   - Remove all elements within a batch

3. **Prepare data**
   - Build `NetworkViewSources` combining:
     - `network`, `networkView`
     - `nodeTable`, `edgeTable`
     - `visualStyle`

4. **Apply visual style**
   - Call `VisualStyleFn.applyVisualStyle` to produce an updated `NetworkView`
   - Extract `nodeViews` and `edgeViews`

5. **Add elements**
   - Use `addCyElements` (from `cyjsFactoryUtil.ts`) to convert `NetworkView` into Cytoscape nodes/edges
   - Apply transformed node/edge properties (shape, label rotation, etc.)

6. **Apply view model**
   - Use `createCyjsDataMapper` and `applyViewModel` (from `cyjsRenderUtil.ts`) to
     - Map view model properties to Cytoscape data fields
     - Ensure calculated properties (label positions, arrow shapes) are represented

7. **Viewport handling**
   - Restore saved viewport from `RendererStore` when available
   - Otherwise, perform a fit on first render (`forceFit`), but avoid subsequent fits when the user has moved nodes
   - Listen for zoom/pan events and update global viewport state

8. **Interaction event handlers**
   - Box selection and tap selection
   - Node drag/dragfree for position updates and undo/redo commands
   - Mouseover/mouseout for hover highlighting

9. **Annotations**
   - Use `CxToCyCanvas` and `CX_ANNOTATIONS_KEY` to render CX annotations onto a canvas overlay
   - Track `annotationLayers` so old layers can be removed when switching networks

### Selection & Display Modes

`displayMode` influences how selection is visualized:

- **SELECT**:
  - Selected nodes/edges are highlighted using style mappings
  - Non-selected elements remain visible but visually distinct

- **SHOW_HIDE**:
  - Selected nodes and their incident edges remain visible
  - Other nodes/edges can be hidden or dimmed
  - `subSelectedEdges` is used to highlight edges connected to the selected node(s)

### Undo/Redo for Node Movement

When the user drags nodes:

1. `dragStartPosition` records initial positions by node id
2. On drag end, the renderer compares original vs final positions
3. If positions changed, `postEdit` is called with an `UndoCommandType` for node movement
4. View model updates propagate to stores and can be undone/redone

## Utility Behavior

### `cyjsFactoryUtil.ts`

- **NodeShapeMapping**
  - Maps application-level `NodeShapeType` values to Cytoscape.js shape strings (e.g., `RoundRectangle → roundrectangle`)

- **Transform functions**
  - `transformNodeProperties`
    - Converts node visual properties to Cytoscape-friendly values
    - Special cases:
      - Label rotation: degrees → radians
      - Node shape: mapped via `NodeShapeMapping`
  - `transformEdgeProperties`
    - Converts edge visual properties
    - Special cases:
      - Edge label rotation: degrees → radians

- **Element creation**
  - Builds `CyNode` and `CyEdge` objects from `NodeView` and `EdgeView`
  - Includes view model and visual properties in `data` payload
  - Adds nodes/edges to the Cytoscape instance

### `cyjsRenderUtil.ts`

- **Special visual property handlers** (`vpHandlers`)
  - Node label position
    - Computes alignment, margins, and justification via `computeNodeLabelPosition`
    - Stores them as special data fields for Cytoscape style
  - Edge arrow shapes
    - Handles source/target arrow shape and fill
    - Maps unsupported `Arrow` shape to `Triangle` for Cytoscape

- **`createCyjsDataMapper`**
  - Iterates visual properties and applies `vpHandlers` and default mappings
  - Produces style data that Cytoscape.js can consume

- **`applyViewModel`**
  - Applies `NetworkView` properties (positions, data) onto Cytoscape elements
  - Ensures that view-level properties (e.g., visibility, selection) are reflected in the Cytoscape graph

## Design Decisions

### Single Source of Truth for State

- Network topology, view model, and visual style live in global stores
- CyjsRenderer reads from these stores and pushes changes back (positions, selection, viewport)
- Keeps Cytoscape.js in sync with the rest of the application and supports undo/redo

### Separation of Concerns

- React component focuses on orchestration and lifecycle
- Utilities in `cyjsFactoryUtil.ts` and `cyjsRenderUtil.ts` handle data and style transformation
- Annotations are isolated in the `annotations/` subfolder

### Performance Considerations

- Uses **batch operations** (`cy.startBatch` / `cy.endBatch`) when rebuilding graphs
- Skips expensive full re-renders when node/edge counts and network id haven&apos;t changed
- Avoids repeated `fit` calls after the user interacts with the network
- Debouncing is used in several places to limit update frequency (e.g., layout/viewport updates)

### Compatibility Decisions

- Maps unsupported visual properties (e.g., `Arrow` arrow shape) to supported values (`Triangle`)
- Converts degrees to radians for label rotation
- Uses custom data fields for complex properties like label positioning

## Future Improvements

- Refactor the early return before hooks in `CyjsRenderer` (currently a known lint rule violation) by splitting the component into smaller pieces or using conditional rendering wrappers
- Extract complex event-handler logic (selection, dragging) into dedicated hooks to improve testability
- Improve annotation layering and lifecycle management
- Add richer debugging tools for style/view mapping (e.g., dev overlay)
- Consider virtualized rendering or level-of-detail strategies for extremely large networks

