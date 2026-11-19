# LayoutMenu Feature

## Overview

The `LayoutMenu` feature implements the **Layout** toolbar menu. It provides access to graph layout algorithms (e.g., force-directed, grid, hierarchical), to algorithms registered by apps, and to a layout option editor. It coordinates between the layout engine, network data, view models, and the renderer to apply layouts and keep them undoable.

## Architecture

- **UI Component**
  - `index.tsx` (`LayoutMenu`): Renders the **Layout** button, builds the list of layout algorithms, and launches layouts or the layout option editor.

- **Supporting Components and Helpers**
  - `LayoutOptionDialog.tsx`: Dialog for editing layout parameters (per engine/algorithm) via `LayoutSelector` and the shared `ParameterForm` (`src/features/ParameterForm/`). Dragging its title moves it; it opens centered each time. The drag goes through `PointerDraggable` (`src/components/PointerDraggable.tsx`), which keeps up with the pointer where react-draggable's `<Draggable>` lost moves (#901).
  - `LayoutSelector.tsx`: `Select` control for choosing layout engine and algorithm. Its option value is the JSON-encoded `[engine, algorithm]` pair (`encodeLayoutSelection` / `decodeLayoutSelection`), never a joined string: engine and algorithm names are free text (`Cytoscape.js`, an app id, the qualified `<appId>::<id>` of an app algorithm).
  - `ValueEditor/*`: Editors for individual layout options (`StringEditor`, `NumberEditor`, `BooleanEditor`, `ListEditor`).
  - `runEngineLayout` (`src/models/LayoutModel/impl/runEngineLayout.ts`): The one way a host path invokes `engine.apply`. Claims the single layout run with `LayoutStore.startLayout` and refuses (logs a warning, returns `false`, starts nothing) when a layout already runs (#982); passes the network id; and contains a synchronous throw or a rejected promise (logged, `isRunning` reset) so a failing engine never leaves the running flag stuck. A run settles once: whatever the engine reports after its first completion or failure is logged and ignored, so a late rejection cannot lower the flag of the next layout, and an `afterLayout` that throws has the flag lowered right then. The optional `onFailed` lets a caller that waits on the run settle (the Sub Network Viewer). The App API's `applyLayout` applies the same once-only rule. Used by the menu rows, the option dialog's Apply, `applyDefaultLayout.ts`, the floating toolbar's `ApplyLayoutButton`, and the initial default layouts in `useRegisterNetwork` and `WorkspaceEditor` (it lives under models so the data layer can import it; the store functions are passed in).
  - `runLayoutWhenIdle` (`src/data/hooks/stores/runLayoutWhenIdle.ts`): For layouts that must not be dropped: the default layout of a network loaded without positions (`useRegisterNetwork`, `WorkspaceEditor`, the Sub Network Viewer) and an App API `applyLayout` call made with `waitIfBusy: true`. Starts the layout at once when none runs or waits; otherwise it joins one app-wide FIFO queue and starts on its turn, one microtask after the layout before it ends. While layouts wait, `LayoutStore.layoutQueued` keeps a freed slot for them: `startLayout` refuses every start except the queue's own claim (`startLayout(id, { fromQueue: true })`, handed to each waiter as `claim`), so nothing can jump ahead of a waiting layout. With `networkId`, a waiter stops when that network leaves the NetworkStore, even if one with the same id comes back; a waiter that starts lays out the network as it is then, not as it was when it began waiting.
  - `applyDefaultLayout.ts`: Runs the preferred (default) layout, shared with the floating toolbar.

- **Stores & Models**
  - `LayoutStore`: Provides available `LayoutEngine` instances (built-in engines plus one synthetic engine per app that registered layouts) and controls `isRunning` state. `startLayout(networkId)` is the check-and-set every layout start goes through; `setIsRunning(false)` ends the run.
  - `NetworkStore`, `WorkspaceStore`: Supply current and active networks.
  - `ViewModelStore`: Provides node positions and update APIs.
  - `NetworkSummaryStore`: Used to detect HCX/hierarchy networks.
  - `RendererFunctionStore`: Provides the laid-out network's own `fit` function (`getFunction` with the network id).
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
3. `runEngineLayout` claims the run with `startLayout(networkId)` (which raises `isRunning`; see [One layout at a time](#one-layout-at-a-time)) and invokes the engine's `apply` with:
   - Nodes, edges
   - `afterLayout` callback
   - Algorithm-specific configuration
   - The id of the network being laid out (built-in engines ignore it; app engines need it to build the run context)
4. `afterLayout`:
   - Captures previous node positions from the `NetworkView`.
   - Calls `updateNodePositions` in `ViewModelStore` with new positions.
   - Pushes an `UndoCommandType.APPLY_LAYOUT` entry to `UndoStore` with `[prevPositions, newPositions]`.
   - Sets `isRunning` to `false`.
   - Sets `fitTarget` to the laid-out network to trigger a post-layout `fit()`.
5. A `useEffect` on `fitTarget` calls that network's `fit` in the default renderer via `RendererFunctionStore.getFunction(DEFAULT_RENDERER_ID, 'fit', networkId)`, aligning its viewport with the new layout. The renderer-wide `fit` slot holds whichever canvas registered last, so it never stands in for the laid-out network's own (#964); a network with no canvas yet is not fitted.
6. If `apply` throws or its promise rejects (an app engine rejects on any failure), `runEngineLayout` logs it and resets `isRunning`; `afterLayout` is never reached, so nothing moves and no undo entry is recorded.

`layout:started` / `layout:completed` events are dispatched only by the Layout API's `applyLayout`, not by the menu paths.

### One layout at a time

Only one layout runs at a time, across all networks (#982). Two layouts on the same network used to both run: the faster one applied first and the slower one (Cosmos returns after a fixed timer) overwrote it, both were recorded as undo steps, and the first to finish lowered the shared running flag, hiding "Applying layout..." while the other still ran.

- **Enforced where layouts start**, not only in the UI. `LayoutStore.startLayout(networkId)` checks and raises the flag in one synchronous step and returns `false` while a layout runs. `runEngineLayout` and the App API's `applyLayout` both go through it: a refused `runEngineLayout` logs a warning and starts nothing; a refused `applyLayout` returns `fail(APP16 LAYOUT_ALREADY_RUNNING)`. A refused run never lowers the flag, so it cannot cut the running layout's indicator short.
- **UI triggers are disabled while `isRunning`**: Apply Default Layout, the core and app rows (tooltip "A layout is already running"), the option dialog's Apply, the floating toolbar's `ApplyLayoutButton`, and the Layout Tools scaling slider (`Scaling.tsx` claims the run too, since scaling while a layout runs would be overwritten by its result). Layout Tools and Settings... stay enabled; they start nothing.
- **Automatic layouts wait for their turn.** `useRegisterNetwork`, `WorkspaceEditor` and the Sub Network Viewer use `runInitialLayoutWhenIdle`. On its turn, the initial layout checks whether the network still needs positions. A service can replace the network under the same ID and supply positions during the wait, including for a subnetwork with no workspace summary. The initial layout then skips the replacement. Explicit App API layout requests keep their turn.
- Network registration and workspace loading choose the initial algorithm and check the configured size limit when the layout gets its turn. Both use the current node and edge counts.
- A waiting layout leaves the queue as soon as it claims the running slot. Once it finishes, a `layout:completed` listener can start another layout immediately if the queue is empty.
- The running state stays a boolean: with every start going through `startLayout`, only the run's owner lowers it.
- **Global for now, per-network later is reserved.** The conflict #982 fixes is per network (positions, undo stacks and fit are all per network), so the guard could be per network. It is global because Cytoscape.js layouts run on the main thread and cannot overlap anyway; the gain would come with layouts in Workers or slow app engines. The public docs (`Api.md`, `ErrorCodes.md` APP16, the api-types changelog) promise only that two layouts never run on the same network and say a later version may run layouts on different networks at once, so moving to a per-network set of running networks would loosen the rule without a breaking change. That move needs every end-of-run path to name its network, and the Cosmos engine to stop sharing one module-level container across runs.
- A modal "Applying layout..." dialog was considered and rejected: it would not cover the App API or the automatic paths, and `DIALOG_DISMISS_POLICY.md` requires a Cancel or Close button, which needs layout cancellation.

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
