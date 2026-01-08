# Console Tab Implementation Plan

## Goal

Add a bottom-console tab that lets users type textual commands to manipulate Cytoscape Web (change styles, import networks, select and move nodes) while staying consistent with the existing `WorkspaceEditor` layout and Zustand stores.

## Current Layout Notes

- `src/features/Workspace/WorkspaceEditor.tsx` uses Allotment to split left/center/right with the bottom pane dedicated to `TableBrowser` + table-loader dialogs. Bottom visibility is driven by `ui.panels[Panel.BOTTOM]`.
- `TableBrowser` manages its own tabs (nodes/edges) via `ui.tableUi.activeTabIndex`.
- Cytoscape.js rendering lives in `src/features/NetworkPanel/CyjsRenderer/CyjsRenderer.tsx`, which syncs with stores (`ViewModelStore`, `VisualStyleStore`, `TableStore`) and registers renderer functions via `RendererFunctionStore`.
- Network import and store bootstrapping flows are in `src/features/AppShell.tsx` (URL import, NDEx import) and `src/data/hooks/useLoadCyNetwork.ts`.

## UX Plan

- Convert the current bottom area into a tabbed surface with two top-level tabs: `Tables` (existing `TableBrowser` experience) and a new `Console`.
- Console tab UI:
  - Scrollable history showing previous commands and results (success/error text).
  - Single-line text field with Enter-to-run, plus Run/Clear buttons and optional command hints/help link.
  - Keep panel resizable via existing Allotment pane; respect bottom panel open/close state.
- Preserve current node/edge table tabs when the `Tables` tab is active; remember the last active bottom-level tab in UI state.

## Command Design (start with `view` namespace)

- **General form**: `<namespace> <command> [param=value ...]`. Unknown namespaces/params return friendly errors and a `help` suggestion.
- **help**: `help` or `help namespace` lists available namespaces/commands and param hints.
- **view fit content**: Fit all nodes and edges into the view. Implementation: call renderer fit via `RendererFunctionStore.getFunction('cyjs','fit', networkId)`.
- **view fit selected**: Fit only selected nodes/edges. Implementation: register a renderer helper that fits the current selection (fallback to full fit if no selection).
- **view update**: Repaint the active view. Implementation: expose a `repaint`/`refresh` function via `RendererFunctionStore` that triggers a Cytoscape redraw (e.g., re-run style apply or invalidate cached style state).

## Command Design (`network` namespace: `add`)

- **network add**: Add nodes and edges to an existing network, mirroring Cytoscape Command semantics for subnetworks.
  - **Arguments**
    - `network=current|[column:value|network name]`: Target network. Default/current when blank; resolve by name or ID (we do not expose SUID, so use network ID/name from `NetworkStore`).
    - `nodeList=[nodeColumn:value|node name,...]|all|selected|unselected`: Nodes to include. `selected/unselected/all` refer to selection in the current network view. `COLUMN:VALUE` filters rows in `TableStore`; bare values match the name column.
    - `edgeList=[edgeColumn:value|edge name,...]|all|selected|unselected`: Edges to include, same matching rules as `nodeList`.
  - **Behavior**
    - Source of rows is the active network (or specified network if we add a `source` param later); target is `network` argument.
    - Collect matching node/edge IDs from tables/selection; add to target network via `NetworkStore.addNodes/addEdges` and corresponding table rows via `TableStore`.
    - Preserve view model entries (`ViewModelStore.addNodeViews/addEdgeViews`) and mark target network modified; push undo entries.
    - If IDs already exist in the target, skip or return a warning in console output.

## Command Design (namespace: `node` command: `list`)

- **node list**: Return a list of node IDs associated with the specified network, honoring Cytoscape Command-style filtering.

  - **Arguments**
    - `network=current|[column:value|network name]`: Network selection. Default/current when blank; resolve by name or ID (no SUID, so use network ID/name from `NetworkStore`).
    - `nodeList=[nodeColumn:value|node name,...]|all|selected|unselected`: Which nodes to list. `selected/unselected/all` respect current selection; `COLUMN:VALUE` filters rows in `TableStore`; bare values match the name column. Support comma-separated multiple values.
  - **Behavior**

    - Resolve the target network; gather nodes per filter; return their IDs (and optionally names if name column exists) in the console output.
    - If nothing matches, return an empty list with a warning-level message.

    Example output:

    ```
      node list
      Found 6 nodes
      → Node id: 5991 [O75534]
      → Node id: 5989 [Q2T9J0]
      → Node id: 5987 [Q8TD16]
      → Node id: 5985 [O96008]
      → Node id: 5983 [Q969Z0]
      → Node id: 5981 [O00217]
    ```

## Command Design (namespace: `node` command: `list properties`)

- **node list properties**: List node properties that can be updated via commands. Initial scope focuses on position properties; future scope will include visual style properties.

  - **Arguments**
    - `network=current|[column:value|network name]` (optional): Network selection; defaults to current.
    - `nodeList=[nodeColumn:value|node name,...]|all|selected|unselected` (optional): Filter nodes when listing applicable properties (helpful for showing current values alongside property names in the future). For `nodeList` using prefix `id:value` should match node ids
  - **Behavior**

    - Returns a list of supported editable properties for nodes. Initial supported properties:

      - `X Location` Gets/Sets X location of node
      - `Y Location` Gets/Sets Y location of node

    - Future: extend this list with visual style-related properties (e.g., size, color) once style setters are exposed in the command system.

## Command Design (namespace: `node` command: `set properties`)

- **node set properties**: Set the value of one or more properties for the specified nodes.

  - **Arguments**
    - `bypass=true|false`: When true, locks a visual property (analogous to the “Bypass” column) so mappings are overridden. For position fields, this simply applies the value; for future style fields, bypass means explicit overrides.
    - `network=current|[column:value|network name]`: Target network; defaults to current. (We do not expose SUID; use network ID or name.)
    - `nodeList=[nodeColumn:value|node name,...]|all|selected|unselected`: Node selection. `selected/unselected/all` reflect current selection; `COLUMN:VALUE` filters table rows; bare values match the name column; comma-separated values are supported.
    - `propertyList=<string>`: Comma-separated property names. Use `node list properties` for discoverability. Initial supported: `X Location`, `Y Location`, `Z Location` (maps to x/y/z position fields).
    - `valueList=<string>`: Comma-separated values aligned to `propertyList` entries.
  - **Behavior**

    - Resolve network and nodes per filters; apply each property/value pair to the matching nodes. For x/y/z, update node positions in `ViewModelStore` (and persist if required). For future style properties, apply via style setters (bypass when requested).
    - If counts mismatch between `propertyList` and `valueList`, return an error. If no nodes match, return a warning. If an unknown property is passed, return an error and list supported properties.

    Example output:

    ```
    node set properties nodeList=selected propertyList="X Location" valueList=0
      Setting properties for node Q96HN2 (SUID: 5965)
      Node X Location set to 0
      Setting properties for node Q9C0C9 (SUID: 5873)
      Node X Location set to 0
    ```

## Execution Pipeline

- New feature folder `src/features/Console` with:
  - `ConsoleTab.tsx` (UI + history list + input), using a small Zustand `ConsoleStore` for history, pending state, and active bottom tab index.
  - `commandParser.ts` to normalize user input into a typed command enum/payload with basic validation and helpful errors.
  - `commandExecutor.ts` to dispatch parsed commands to existing stores/hooks; all commands return structured results for history rendering.
- Add a lightweight service/helper for network import to reuse `AppShell` logic (avoid duplication): shared util that accepts NDEx UUID or URL and returns populated models + side effects.
- Surface errors to both the console log and `MessageStore` for consistency with existing notifications.

## State & Integration Changes

- Extend `UiStateStore` with a `bottomPanelUi` (or similar) activeTab index so the bottom tab selection is persisted/restorable; leave `tableUi.activeTabIndex` untouched for node/edge switching.
- Wire `WorkspaceEditor` bottom pane to render a new `BottomPanelTabs` component that hosts the tab bar and conditionally renders `TableBrowser` or the `ConsoleTab`.
- Register any needed renderer helper functions (e.g., for live viewport fit after moves) through `RendererFunctionStore` if direct cyjs access is required; otherwise rely on existing `ViewModelStore` → `CyjsRenderer` synchronization.
- Ensure console-driven mutations mark networks as modified (`WorkspaceStore.setNetworkModified`) and trigger undo stack entries where appropriate.

## Implementation Steps

1. Scaffold console feature: create `src/features/Console` with UI shell, parser, executor, store, and storybook-style mock data if helpful.
2. Add bottom-level tab plumbing: introduce `bottomPanelUi` in `Ui`/`UiStateStore`, migrate `WorkspaceEditor` bottom pane to render tab headers and switch between `TableBrowser` and `ConsoleTab` while keeping existing layouts.
3. Build command parser/executor:
   - Define command types and argument validation.
   - Implement handlers for style, import, select, move, help, and clear, reusing existing hooks/utilities (`fetchNdexSummaries`, `fetchUrlCx`, `useLoadCyNetwork`, `VisualStyleStore`, `ViewModelStore`, `TableStore`, `useUndoStack`).
   - Ensure async commands surface progress/errors in history.
4. Hook side effects: update message/undo/network-modified state, trigger renderer fit when needed, and persist UI state/history as appropriate.
5. Tests and docs: add Jest tests for parser/executor edge cases, a React test for the tab switch and run flow, and a short user-facing help section (docs or in-app help) describing commands and examples.

## Testing/Validation Plan

- Unit tests for parsing/validation of each command shape and error messaging.
- Executor tests with mocked stores to verify store calls for style changes, selection queries, node moves, and network imports (mock fetchers).
- Component test (React Testing Library) to confirm tab switching, running a command updates history, and errors render.
- Manual smoke: run app, import a small NDEx ID via console, tweak styles, select/move nodes, verify undo/redo still works and Cyjs view updates.
