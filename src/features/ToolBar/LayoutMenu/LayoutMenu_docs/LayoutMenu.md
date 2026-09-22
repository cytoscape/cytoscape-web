# LayoutMenu Feature

## Overview

The `LayoutMenu` feature implements the **Layout** toolbar menu. It provides access to graph layout algorithms (e.g., force-directed, grid, hierarchical), to algorithms registered by apps, and to a layout option editor. It coordinates between the layout engine, network data, view models, and the renderer to apply layouts and keep them undoable.

## Architecture

- **UI Component**
  - `index.tsx` (`LayoutMenu`): Renders the **Layout** button, builds the list of layout algorithms, and launches layouts or the layout option editor.

- **Supporting Components and Helpers**
  - `LayoutOptionDialog.tsx`: Draggable dialog for editing layout parameters (per engine/algorithm) via `LayoutSelector` and the shared `ParameterForm` (`src/features/ParameterForm/`).
  - `LayoutSelector.tsx`: `Select` control for choosing layout engine and algorithm. Its option value is the JSON-encoded `[engine, algorithm]` pair (`encodeLayoutSelection` / `decodeLayoutSelection`), never a joined string: engine and algorithm names are free text (`Cytoscape.js`, an app id, the qualified `<appId>::<id>` of an app algorithm).
  - `ValueEditor/*`: Editors for individual layout options (`StringEditor`, `NumberEditor`, `BooleanEditor`, `ListEditor`).
  - `runEngineLayout.ts`: The one way a host UI path invokes `engine.apply`. Sets `isRunning`, passes the network id, and contains a synchronous throw or a rejected promise (logged, `isRunning` reset) so a failing engine never leaves the running flag stuck. Used by the menu rows, the option dialog's Apply, `applyDefaultLayout.ts`, and the floating toolbar's `ApplyLayoutButton`.
  - `applyDefaultLayout.ts`: Runs the preferred (default) layout, shared with the floating toolbar.

- **Stores & Models**
  - `LayoutStore`: Provides available `LayoutEngine` instances (built-in engines plus one synthetic engine per app that registered layouts) and controls `isRunning` state.
  - `NetworkStore`, `WorkspaceStore`: Supply current and active networks.
  - `ViewModelStore`: Provides node positions and update APIs.
  - `NetworkSummaryStore`: Used to detect HCX/hierarchy networks.
  - `RendererFunctionStore`: Provides a `fit` function for the active renderer.
  - `UndoStore`: Records layout applications as undoable commands.
  - `app-api/core/appLayoutEngine.ts`: The adapter behind app-registered algorithms (`'layout-algorithm'` resources); the menu only reads `isAppLayoutEnabled` and `getAppLayoutMeta` from it.

## Behavior

### Layout Menu Construction

The menu is, in order:

1. **Apply Default Layout** — runs `LayoutStore.preferredLayout`.
2. Divider.
3. **Core algorithms** — every algorithm of every built-in engine (`engine.appId === undefined`), grouped by `type`, each group sorted alphabetically by label, a divider between groups. An item is `disabled` when the algorithm defines a `threshold` and the network size (nodes + edges) exceeds it.
4. Divider.
5. **Third-party block** (present only when non-empty):
   - **App algorithms** — every algorithm of every app engine (`engine.appId` set), one row each, sorted by label with the app id as the tiebreak. There is deliberately no `order`/gravity option (#734): related layouts from one app stay together through a shared label prefix. A row is `disabled` above its `threshold` or when the app's `isEnabled(apis)` snapshot returns `false`; the snapshot is taken only while the menu is open, with one per-app API object per app (`buildPerAppApis`). Test id: `layout-menu-item-<appId>-<localId>`.
   - **Service apps** routed to the Layout root (`useServiceAppMenu(RootMenu.Layout)`), after the app algorithms.
6. Divider (only with the block).
7. **Layout Tools** (`layout-menu-layout-tools`) and **Settings...** (`layout-menu-settings`).

Core rows carry the test id `layout-menu-item-<engine>-<algorithm>`.

### Applying a Layout

1. User selects a layout algorithm from the menu.
2. `LayoutMenu` retrieves the `LayoutEngine` instance and current `Network`, and calls `runEngineLayout`.
3. `runEngineLayout` sets `isRunning(true)` and invokes the engine's `apply` with:
   - Nodes, edges
   - `afterLayout` callback
   - Algorithm-specific configuration
   - The id of the network being laid out (built-in engines ignore it; app engines need it to build the run context)
4. `afterLayout`:
   - Captures previous node positions from the `NetworkView`.
   - Calls `updateNodePositions` in `ViewModelStore` with new positions.
   - Pushes an `UndoCommandType.APPLY_LAYOUT` entry to `UndoStore` with `[prevPositions, newPositions]`.
   - Sets `isRunning` to `false`.
   - Increments `layoutCounter` to trigger a post-layout `fit()`.
5. A `useEffect` on `layoutCounter` calls the renderer's `fit` function via `RendererFunctionStore`, aligning the viewport with the new layout.
6. If `apply` throws or its promise rejects (an app engine rejects on any failure), `runEngineLayout` logs it and resets `isRunning`; `afterLayout` is never reached, so nothing moves and no undo entry is recorded.

`layout:started` / `layout:completed` events are dispatched only by the Layout API's `applyLayout`, not by the menu paths.

### Layout Option Editor

- The "Settings..." entry (via `LayoutOptionDialog`) lets users edit algorithm parameters:
  - `LayoutSelector` chooses engine + algorithm, app algorithms included (its clickable element carries `data-testid="layout-selector-combobox"`; a `dropDown` parameter is a combobox too, so specs must not pick by role).
  - The algorithm's `editables` — an ordered array of the shared parameter spec (`docs/specifications/APP_PARAMETERS_SPECIFICATION.md`), each with a `name` that keys its live value in `algorithm.parameters` — render through the shared `ParameterForm` (`src/features/ParameterForm/`): fields in array order, `groups` as nested fieldsets, `text` / `dropDown` / `radio` / `checkBox` / column pickers, validation messages under the field. Test ids: `layout-parameter-field-<name>`, `layout-parameter-group-<path>`.
  - A "Set as default" checkbox makes the selection the preferred layout; app algorithms can be the default too, and `LayoutStore` falls back to the built-in default when the app is disabled.
- The selection is resolved against the store on every render: if the selected algorithm disappears while the dialog is open (an app disabled), the dialog shows the preferred layout instead of dereferencing a missing algorithm.
- The Apply button is disabled above the algorithm's `threshold`, re-enabled below it, and disabled while a stored value fails validation (`useParameterErrors`).
- A `text` field commits only a valid draft: `setLayoutOption(engine, algorithm, name, value)` receives a value typed by the declaration (number, boolean or string) and updates `parameters[name]` — editables never change. `setLayoutOption` refuses a key that is not a declared editable or not already in `parameters` (Cosmos keeps its values under `parameters.simulation`, a pre-existing gap), and re-points `preferredLayout` when the edited algorithm is the default, so Apply Default Layout runs the edited values.
- `ValueEditor/*` is no longer used here; it stays for the node and edge creation dialogs.

### HCX / Hierarchy-Safe Behavior

- When the active view is an HCX cell view, layout operations are disabled to avoid breaking hierarchical visualizations.
- In this case, the menu renders disabled items (core and app rows alike) wrapped in a tooltip explaining why layouts are not available.

## Design Decisions

- **Separation of Option Editing and Execution**
  - Running a layout is a single-click action; editing options is done in a dedicated dialog.
  - This keeps UX simple while still supporting advanced tuning.

- **Undoable Layouts**
  - Every layout run records previous positions, enabling full undo/redo.

- **Renderer-Agnostic Fit**
  - Uses `RendererFunctionStore` to call a generic `fit` function, rather than coupling directly to `CyjsRenderer`.

- **Type-Based Grouping**
  - Core layout algorithms are grouped by `type` and sorted alphabetically for discoverability.

- **App algorithms are ordinary engines**
  - Apps register through the App API (`resource.registerLayout`), and the host adapts them into `LayoutStore`; the menu needs no app-specific code path beyond the block placement. Sorting the block by label (no gravity) avoids the cross-app coordination Cytoscape Desktop's `MENU_GRAVITY` requires.

## Future Improvements

- Per-network layout presets and recent layout history.
- Visual preview or descriptions for layout types.
- Progress feedback for long-running layouts.
