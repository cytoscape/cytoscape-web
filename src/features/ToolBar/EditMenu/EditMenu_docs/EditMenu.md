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

- **Keyboard Shortcuts**
  - `useUndoRedoShortcuts.ts`: the Undo and Redo shortcuts, installed by `EditMenu`, and the labels the two rows show.

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

### Undo and Redo Shortcuts

- Ctrl+Z or ⌘Z runs Undo. Ctrl+Shift+Z, ⌘⇧Z or Ctrl+Y runs Redo. Every form works on every platform (platform detection is unreliable, see `isApplePlatform`); the rows show the platform's usual form: `⌘Z` and `⇧⌘Z` on macOS, `Ctrl+Z` and `Ctrl+Y` elsewhere. Ctrl+Y is Cytoscape Desktop's Redo on every OS. ⌘Y is not a shortcut: on macOS it is the browser's History.
- They act on the same network as the rows: the active network view, else the current network.
- They act unless a text field has the focus (it keeps its own undo), a dialog, popover or other MUI modal is open, or the focus is inside an open menu. Unlike Ctrl/⌘+A, a focused button or the table browser does not block them: choosing a row hands the focus back to the Edit button, and Delete Selected Nodes followed by Ctrl/⌘+Z must still undo.
- With nothing to undo or redo they do nothing and leave the key to the browser; otherwise they prevent its default action.
- The focus is followed into open shadow roots, so a text field inside an app's web component keeps its own undo. An app widget that handles one of these keys itself calls `preventDefault()`, and the shortcut skips any event whose default was prevented (see "Host Keyboard Shortcuts" in `src/app-api/api_docs/Api.md`).
- Each row names its shortcuts for assistive technology with `aria-keyshortcuts` (`keyShortcuts` on the menu item model): all the forms that work, not only the one shown.

## Design Decisions

- **Material-UI Menu**
  - MUI `Menu` is sufficient for a shallow, non-nested menu.
  - Keeps Edit menu visually consistent with common application menus.

- **Separation into Menu Items**
  - Each operation lives in its own component, simplifying testing and allowing reuse in other contexts if needed (e.g. context menus).

- **Undo/Redo Integration**
  - All destructive operations are expected to push undo commands to maintain a reversible editing workflow.

## Testing

- `useUndoRedoShortcuts.test.ts` — the key matching, the labels, where the shortcuts act, the target stack.
- `test/playwright/undo-redo.spec.ts` — the menu rows and the shortcuts, end to end.

## Future Improvements

- Add additional edit operations (duplicate, etc.). Selection and visibility
  operations live in the Select menu (`SelectMenu_docs/SelectMenu.md`).
- Shortcuts for the other Edit menu rows.
- Disabled states that reflect when undo/redo stacks are empty.
