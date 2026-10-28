# SelectMenu Feature

## Overview

The `SelectMenu` feature implements the **Select** toolbar menu, between
**Edit** and **Layout**. It follows Cytoscape Desktop's Select menu (#834):

| Row                           | What it does                                            | Enabled when                  |
| ----------------------------- | ------------------------------------------------------- | ----------------------------- |
| Select All Nodes              | Selects every node; the edge selection is kept          | the network is loaded         |
| Select All Edges              | Selects every edge; the node selection is kept          | the network is loaded         |
| Deselect All Nodes            | Deselects every node; the edge selection is kept        | the network is loaded         |
| Deselect All Edges            | Deselects every edge; the node selection is kept        | the network is loaded         |
| Select All (Ctrl/⌘+A)         | Selects every node and edge                             | the network is loaded         |
| Deselect All                  | Clears the selection                                    | the network is loaded         |
| Hide Selected Nodes and Edges | Hides the selection and the edges of the selected nodes | something is selected         |
| Show All                      | Removes every node and edge visibility bypass           | a visibility bypass hides one |

The menu itself is disabled while the workspace has no network, like Edit.
The menu is flat: no submenus. Service apps cannot add rows to it (there is
no `Select` root in `RootMenu`), and the App API is unchanged.

## Architecture

- `index.tsx` — the `SelectMenu` component: builds the rows, renders the
  `DropdownMenu`, installs the Ctrl/⌘+A shortcut.
- `SelectMenuItems.tsx` — the rows. Each one subscribes to the stores it
  needs for its enabled state, and only while the menu is open, since a
  closed menu renders no rows.
- `selectTarget.ts` — the network the menu acts on: the active network view
  (a Hierarchy Viewer subnetwork once its pane was clicked), else the current
  network. The STYLE and FILTER tabs pick their network the same way.
- `useSelectAllShortcut.ts` — the Ctrl/⌘+A shortcut.
- `src/data/select/selectCommands.ts` — the commands: plain functions over
  the stores, with no React, each returning false (and changing nothing) when
  the network, its view model or its style is not loaded.
- `src/models/NetworkModel/impl/hideSelection.ts` and
  `src/models/VisualStyleModel/impl/visibilityBypass.ts` — the pure parts:
  what Hide Selected hides, and whether a style hides anything.

## Behavior

### Selection

- The selection commands replace the network's selection through
  `ViewModelStore.exclusiveSelect`, in every view of the network.
- As in Cytoscape Desktop, **selecting all includes hidden elements**. Delete
  Selected Nodes (Edit menu) then deletes hidden nodes too, as it does in
  Cytoscape Desktop.
- Selection changes do not mark the network modified.
- Selecting never shows a hidden element in the canvas. The renderer's
  selection sync (`NetworkPanel/CyjsRenderer/syncCySelection.ts`) only selects
  and unselects; it used to call Cytoscape.js's `show()`, whose element-level
  `display: element` overrode the visibility bypasses until the next reload.

### Hide Selected Nodes and Edges

As in Cytoscape Desktop (`HideUtils` in cytoscape-impl):

- The selected nodes, **every edge connected to them** (selected or not) and
  the selected edges get a `none` visibility bypass. The bypasses are added
  to the network's other visibility bypasses, so earlier hidden elements stay
  hidden.
- **Everything hidden is deselected**, the edges of the hidden nodes
  included, so nothing hidden stays selected.
- The bypasses belong to the network's active visual style and are saved with
  it, like any bypass (the STYLE tab shows them).

### Show All

- Removes every node and edge visibility bypass of the network, whoever wrote
  it: Hide Selected, a FILTER tab filter in show mode, the Hierarchy Viewer's
  `filterWidgets` filter, or a bypass set by hand in the STYLE tab. Elements
  that a mapping or a default hides stay hidden, as in Cytoscape Desktop.
- Leaves the selection alone.
- Releases the other writers of visibility, so neither claims to hide
  something it no longer hides:
  - a FILTER tab filter applied in show mode: its `appliedWorkspaceFilters`
    record is dropped, and the FILTER tab's status line stops reporting its
    run (a record in select mode stays, since it hides nothing). A pending
    "Apply when filter changes" run of the network is cancelled, so an edit
    made just before Show All cannot hide elements again 300 ms later;
  - the subnetwork's `filterWidgets` filter: it is switched off, as applying
    a FILTER tab filter does.

### Tables and counts

Hiding changes no table or count, as in Cytoscape Desktop: the table browser
lists every row when nothing is selected, hidden rows included, and the
workspace panel's `N: x (y) / E: x (y)` counts all elements and the selected
ones. Since Hide Selected deselects what it hides, the table and the
selected counts stop showing the hidden elements at once.

### Undo and the modified flag

None of the commands creates an undo entry (applying a FILTER tab filter
creates none either). Hide Selected and Show All change style bypasses that
are saved with the network, so without an undo entry to do it they call
`setNetworkModified` themselves; Show All does so only when it removed a
bypass.

### Ctrl/⌘+A

- Ctrl+A or ⌘A runs Select All on the menu's network, on every platform; the
  menu shows the platform's form (`⌘A` on macOS, `Ctrl+A` elsewhere).
- It acts only while the network canvas has the keyboard: nothing has focus
  (clicking the canvas, which is not focusable, leaves the focus on the body)
  or the focus is inside a network renderer. A text field, the table
  browser, an open menu or a dialog keeps its own Ctrl/⌘+A.
- When it acts, it prevents the browser from selecting the page's text.
- The row names both forms for assistive technology (`aria-keyshortcuts="Control+A Meta+A"`, the menu item model's `keyShortcuts`).

## Testing

- `selectCommands.test.ts`, `hideSelection.test.ts`,
  `visibilityBypass.test.ts` — the commands and the pure helpers.
- `SelectMenu.spec.tsx`, `useSelectAllShortcut.test.ts` — the rows, their
  enabled states, the target network, the shortcut.
- `FilterTab.spec.tsx` — the status line clears when Show All releases a
  filter.
- `test/playwright/select-menu.spec.ts` — end to end.

## Future Improvements

- More of Cytoscape Desktop's Select menu: invert selection, first
  neighbors, adjacent edges, hide unselected, show selected.
- Undo for selection and visibility changes.
- Command palette entries (#663).
