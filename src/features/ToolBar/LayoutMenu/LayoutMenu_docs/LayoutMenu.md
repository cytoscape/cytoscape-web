# LayoutMenu Feature

## Overview

The `LayoutMenu` feature implements the **Layout** toolbar menu. It provides access to graph layout algorithms (e.g., force-directed, grid, hierarchical) and a layout option editor. It coordinates between the layout engine, network data, view models, and the renderer to apply layouts and keep them undoable.

## Architecture

- **UI Component**
  - `LayoutMenu.tsx`: Renders the **Layout** button, builds a list of layout algorithms, and launches layouts or the layout option editor.

- **Supporting Components**
  - `LayoutOptionDialog.tsx`: Draggable dialog for editing layout parameters (per engine/algorithm) via `LayoutSelector` and `ValueEditor` components.
  - `LayoutSelector.tsx`: `Select` control for choosing layout engine and algorithm.
  - `ValueEditor/*`: Editors for individual layout options (`StringEditor`, `NumberEditor`, `BooleanEditor`).

- **Stores & Models**
  - `LayoutStore`: Provides available `LayoutEngine` instances and controls `isRunning` state.
  - `NetworkStore`, `WorkspaceStore`: Supply current and active networks.
  - `ViewModelStore`: Provides node positions and update APIs.
  - `NetworkSummaryStore`: Used to detect HCX/hierarchy networks.
  - `RendererFunctionStore`: Provides a `fit` function for the active renderer.
  - `UndoStore`: Records layout applications as undoable commands.

## Behavior

### Layout Menu Construction

- Builds menu entries by iterating over `layoutEngines` and their `algorithms`.
- Each algorithm contributes a menu item with:
  - `displayName`, `description`, and `type` (for grouping/sorting).
  - `disabled` when:
    - The algorithm defines a `threshold` and the network size exceeds it.
    - Layouts are globally disabled for the current network (e.g., HCX cell view).
- Menu items are grouped by `type` and separated with dividers.

### Applying a Layout

1. User selects a layout algorithm from the menu.
2. `LayoutMenu` retrieves the `LayoutEngine` instance and current `Network`.
3. `setIsRunning(true)` is called to mark layout as in progress.
4. The engine's `apply` method is invoked with:
   - Nodes, edges
   - `afterLayout` callback
   - Algorithm-specific configuration
5. `afterLayout`:
   - Captures previous node positions from the `NetworkView`.
   - Calls `updateNodePositions` in `ViewModelStore` with new positions.
   - Pushes an `UndoCommandType.APPLY_LAYOUT` entry to `UndoStore` with `[prevPositions, newPositions]`.
   - Sets `isRunning` to `false`.
   - Increments `layoutCounter` to trigger a post-layout `fit()`.
6. A `useEffect` on `layoutCounter` calls the renderer's `fit` function via `RendererFunctionStore`, aligning the viewport with the new layout.

### Layout Option Editor

- The "Layout Option Editor" entry (via `LayoutOptionDialog`) lets users edit algorithm parameters:
  - `LayoutSelector` chooses engine + algorithm.
  - `ValueEditor` components expose per-option editors (string, number, boolean).
  - A "Set as default" checkbox allows saving chosen options as defaults.
- Options are stored and applied per layout engine/algorithm and can be reused when layouts are run from the menu.

### HCX / Hierarchy-Safe Behavior

- When the active view is an HCX cell view, layout operations are disabled to avoid breaking hierarchical visualizations.
- In this case, the menu renders disabled items wrapped in a tooltip explaining why layouts are not available.

## Design Decisions

- **Separation of Option Editing and Execution**
  - Running a layout is a single-click action; editing options is done in a dedicated dialog.
  - This keeps UX simple while still supporting advanced tuning.

- **Undoable Layouts**
  - Every layout run records previous positions, enabling full undo/redo.

- **Renderer-Agnostic Fit**
  - Uses `RendererFunctionStore` to call a generic `fit` function, rather than coupling directly to `CyjsRenderer`.

- **Type-Based Grouping**
  - Layout algorithms are grouped by `type` and sorted alphabetically for discoverability.

## Future Improvements

- Per-network layout presets and recent layout history.
- Visual preview or descriptions for layout types.
- Progress feedback for long-running layouts.
