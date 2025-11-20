# EditMenu Feature

## Overview

The `EditMenu` feature implements the **Edit** toolbar menu. It provides editing operations that operate on the current network view and selection:

- Deleting selected nodes or edges
- Undoing and redoing network edits

These operations are context-aware and integrate closely with the network, view model, and undo/redo stacks.

## Architecture

- **UI Component**
  - `EditMenu.tsx`: Renders the **Edit** button and a Material-UI `Menu` with menu items.

- **Menu Item Components**
  - `DeleteSelectedNodesMenuItem`: Deletes currently selected nodes.
  - `DeleteSelectedEdgesMenuItem`: Deletes currently selected edges.
  - `UndoMenuItem`: Reverts the last edit command.
  - `RedoMenuItem`: Reapplies a previously undone command.

Each menu item is a thin wrapper that invokes the appropriate store actions and records undo/redo commands.

## Behavior

### Opening and Closing

- Clicking the **Edit** button opens a `Menu` anchored to the button.
- The menu remains open while the user chooses operations and closes on selection or click outside.

### Editing Operations

- **Delete Selected Nodes**
  - Reads the current selection from the view model.
  - Removes selected nodes and incident edges from the network.
  - Records an undo command so the deletion can be reversed.

- **Delete Selected Edges**
  - Similar to node deletion but limited to edges.

- **Undo / Redo**
  - Integrates with the global `UndoStore`.
  - `UndoMenuItem` triggers `undo()`; `RedoMenuItem` triggers `redo()`.
  - These operations affect both network structure and view model (node positions, selection state) depending on the original command.

## Design Decisions

- **Material-UI Menu**
  - MUI `Menu` is sufficient for a shallow, non-nested menu.
  - Keeps Edit menu visually consistent with common application menus.

- **Separation into Menu Items**
  - Each operation lives in its own component, simplifying testing and allowing reuse in other contexts if needed (e.g. context menus).

- **Undo/Redo Integration**
  - All destructive operations are expected to push undo commands to maintain a reversible editing workflow.

## Future Improvements

- Add additional edit operations (duplicate, select all, invert selection, etc.).
- Keyboard shortcuts surfaced alongside menu items.
- Disabled states that reflect when undo/redo stacks are empty.
