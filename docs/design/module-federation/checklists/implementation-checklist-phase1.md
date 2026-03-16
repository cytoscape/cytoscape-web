# Implementation Checklist — Phase 1: App API Hook Implementation

> Track progress for Phase 1 (all sub-phases). Mark `[x]` when complete. Run verification after each step.
>
> Phase 0 checklist: [implementation-checklist-phase0.md](implementation-checklist-phase0.md)

---

## Phase 1a: Element API

_Design: app-api-specification.md §1.5.1, §3.1, §3.1.1, §3.10.1_

### Pre-read files

| File                                          | Lines | Purpose                                                      |
| --------------------------------------------- | ----- | ------------------------------------------------------------ |
| `src/data/hooks/useCreateNode.ts`             | 226   | `CreateNodeResult`, `CreateNodeOptions`, hook implementation |
| `src/data/hooks/useCreateEdge.ts`             | 255   | `CreateEdgeResult`, `CreateEdgeOptions`, hook implementation |
| `src/data/hooks/useDeleteNodes.ts`            | 271   | `DeleteNodesResult`, `DeleteNodesOptions`, cascade deletes   |
| `src/data/hooks/useDeleteEdges.ts`            | 240   | `DeleteEdgesResult`, `DeleteEdgesOptions`                    |
| `src/models/NetworkModel/impl/networkImpl.ts` | 284   | For `moveEdge` — Cytoscape.js headless core                  |
| `src/models/StoreModel/UndoStoreModel.ts`     | 59    | `UndoCommandType`, `Edit` interface                          |

### Deliverables

- [x]Create `src/app-api/core/elementApi.ts` — framework-agnostic; coordinates stores via `.getState()`; no React imports
- [x]Create `src/app-api/useElementApi.ts` — thin React hook: `export const useElementApi = (): ElementApi => elementApi`
- [x]Implement `createNode(networkId, position, options?)` → `ApiResult<{nodeId}>`
- [x]Implement `createEdge(networkId, sourceId, targetId, options?)` → `ApiResult<{edgeId}>`
- [x]Implement `deleteNodes(networkId, nodeIds)` → `ApiResult<{deletedNodeCount, deletedEdgeCount}>`
- [x]Implement `deleteEdges(networkId, edgeIds)` → `ApiResult<{deletedEdgeCount}>`
- [x]Implement `getNode(networkId, nodeId)` → `ApiResult<NodeData>`
- [x]Implement `getEdge(networkId, edgeId)` → `ApiResult<EdgeData>`
- [x]Implement `generateNextNodeId(networkId)` → `IdType`
- [x]Implement `generateNextEdgeId(networkId)` → `IdType`
- [x]**`moveEdge` internal infrastructure:**
  - [x]Add `moveEdge()` function to `src/models/NetworkModel/impl/networkImpl.ts`
  - [x]Verify barrel export in `src/models/NetworkModel/index.ts`
  - [x]Add `moveEdge` to `NetworkUpdateActions` in `src/models/StoreModel/NetworkStoreModel.ts`
  - [x]Add `moveEdge` action to `src/data/hooks/stores/NetworkStore.ts`
  - [x]Add `MOVE_EDGES` to `UndoCommandType` in `src/models/StoreModel/UndoStoreModel.ts`
  - [x]Add undo/redo handlers in `src/data/hooks/useUndoStack.tsx`
- [x]Implement `moveEdge(networkId, edgeId, newSourceId, newTargetId)` → `ApiResult<void>` in `core/elementApi.ts`
- [x]Create `src/app-api/core/elementApi.test.ts` — plain Jest tests for all core methods (no `renderHook`)
- [x]Create `src/app-api/useElementApi.test.ts` — trivial hook test: verifies hook returns core `elementApi` object
- [x]Modify `src/app-api/index.ts` — uncomment `useElementApi` export
- [x]Modify `src/app-api/types/AppContext.ts` — uncomment `element: ElementApi`
- [x]Modify `webpack.config.js` — add `'./ElementApi': './src/app-api/useElementApi.ts'`

### Verification

- [x]`npm run lint` passes
- [x]`npm run test:unit -- --testPathPattern="elementApi"` passes
- [x]`npm run build` succeeds

---

## Phase 1b: Network API

_Design: app-api-specification.md §1.5.2, §3.2, §3.10.2_

### Pre-read files

| File                                        | Lines | Purpose                                                        |
| ------------------------------------------- | ----- | -------------------------------------------------------------- |
| `src/data/task/useCreateNetworkFromCx2.tsx` | 127   | CX2 → CyNetwork creation, side effects (workspace, navigation) |
| `src/data/task/useCreateNetwork.tsx`        | 236   | Edge list → CyNetwork creation                                 |
| `src/data/hooks/useDeleteCyNetwork.ts`      | 171   | Network deletion (10-store cleanup)                            |
| `src/models/CxModel/impl/validator.ts`      | —     | `validateCX2()` function                                       |

### Deliverables

- [x]Create `src/app-api/core/networkApi.ts` — framework-agnostic; coordinates stores via `.getState()`; no React imports
- [x]Create `src/app-api/useNetworkApi.ts` — thin React hook: `export const useNetworkApi = (): NetworkApi => networkApi`
- [x]Implement `createNetworkFromEdgeList(props)` → `ApiResult<{networkId, cyNetwork}>`
- [x]Implement `createNetworkFromCx2(props)` → `ApiResult<{networkId, cyNetwork}>` (with `validateCX2` call)
- [x]Implement `deleteNetwork(networkId, options?)` → `ApiResult<void>`
- [x]Implement `deleteCurrentNetwork(options?)` → `ApiResult<void>`
- [x]Implement `deleteAllNetworks()` → `ApiResult<void>`
- [x]Modify `src/data/task/useCreateNetworkFromCx2.tsx` — add optional `navigate` and `addToWorkspace` parameters
- [x]Create `src/app-api/core/networkApi.test.ts` — plain Jest tests for all core methods (no `renderHook`)
- [x]Create `src/app-api/useNetworkApi.test.ts` — trivial hook test: verifies hook returns core `networkApi` object
- [x]Modify `src/app-api/index.ts` — uncomment `useNetworkApi` export
- [x]Modify `src/app-api/types/AppContext.ts` — uncomment `network: NetworkApi`
- [x]Modify `webpack.config.js` — add `'./NetworkApi': './src/app-api/useNetworkApi.ts'`

### Verification

- [x]`npm run lint` passes
- [x]`npm run test:unit -- --testPathPattern="networkApi"` passes
- [x]`npm run build` succeeds

---

## Phase 1c: Selection + Viewport

_Design: app-api-specification.md §1.5.3, §1.5.7, §3.3, §3.7, §3.10.3, §3.10.7_

### Pre-read files

| File                                             | Lines | Purpose                                          |
| ------------------------------------------------ | ----- | ------------------------------------------------ |
| `src/models/StoreModel/ViewModelStoreModel.ts`   | 165   | Selection methods, `getViewModel`, `NetworkView` |
| `src/data/hooks/stores/ViewModelStore.ts`        | 354   | Store implementation                             |
| `src/data/hooks/stores/RendererFunctionStore.ts` | 64    | `getFunction('cyjs', 'fit', networkId)`          |
| `src/models/StoreModel/RendererStoreModel.ts`    | 36    | `ViewPort`, `getViewport`                        |

### Deliverables

- [x]Create `src/app-api/core/selectionApi.ts` — framework-agnostic; coordinates `ViewModelStore` via `.getState()`; no React imports
- [x]Create `src/app-api/useSelectionApi.ts` — thin React hook: `export const useSelectionApi = (): SelectionApi => selectionApi`
- [x]Implement `exclusiveSelect(networkId, nodeIds, edgeIds)` → `ApiResult<void>`
- [x]Implement `additiveSelect(networkId, ids)` → `ApiResult<void>`
- [x]Implement `additiveUnselect(networkId, ids)` → `ApiResult<void>`
- [x]Implement `toggleSelected(networkId, ids)` → `ApiResult<void>`
- [x]Implement `getSelection(networkId)` → `ApiResult<{selectedNodes, selectedEdges}>`
- [x]Create `src/app-api/core/selectionApi.test.ts` — plain Jest tests for all core methods (no `renderHook`)
- [x]Create `src/app-api/useSelectionApi.test.ts` — trivial hook test: verifies hook returns core `selectionApi` object
- [x]Create `src/app-api/core/viewportApi.ts` — framework-agnostic; coordinates `RendererFunctionStore` + `ViewModelStore` via `.getState()`; no React imports
- [x]Create `src/app-api/useViewportApi.ts` — thin React hook: `export const useViewportApi = (): ViewportApi => viewportApi`
- [x]Implement `fit(networkId)` → `Promise<ApiResult<void>>`
- [x]Implement `getNodePositions(networkId, nodeIds)` → `ApiResult<{positions: PositionRecord}>`
- [x]Implement `updateNodePositions(networkId, positions)` → `ApiResult<void>`
- [x]Create `src/app-api/core/viewportApi.test.ts` — plain Jest tests for all core methods (no `renderHook`)
- [x]Create `src/app-api/useViewportApi.test.ts` — trivial hook test: verifies hook returns core `viewportApi` object
- [x]Modify `src/app-api/index.ts` — uncomment both exports
- [x]Modify `src/app-api/types/AppContext.ts` — uncomment `selection`, `viewport`
- [x]Modify `webpack.config.js` — add `'./SelectionApi'`, `'./ViewportApi'`

### Verification

- [x]`npm run lint` passes
- [x]`npm run test:unit -- --testPathPattern="selectionApi|viewportApi"` passes
- [x]`npm run build` succeeds

---

## Phase 1d: Table + Visual Style

_Design: app-api-specification.md §1.5.4, §1.5.5, §3.4, §3.5, §3.10.4, §3.10.5_

### Pre-read files

| File                                             | Lines | Purpose                                               |
| ------------------------------------------------ | ----- | ----------------------------------------------------- |
| `src/models/StoreModel/TableStoreModel.ts`       | 107   | All table mutation methods, `CellEdit`, `TableRecord` |
| `src/data/hooks/stores/TableStore.ts`            | 397   | Store implementation, null-safety inconsistencies     |
| `src/models/StoreModel/VisualStyleStoreModel.ts` | 120   | All VS methods — zero null-checks                     |
| `src/data/hooks/stores/VisualStyleStore.ts`      | 337   | Store implementation                                  |

### Deliverables

- [x]Create `src/app-api/core/tableApi.ts` — framework-agnostic; coordinates `TableStore` via `.getState()`; no React imports
- [x]Create `src/app-api/useTableApi.ts` — thin React hook: `export const useTableApi = (): TableApi => tableApi`
- [x]Implement `getValue`, `getRow`, `createColumn`, `deleteColumn`, `setValue`, `setValues`, `editRows`, `setColumnName`, `applyValueToElements`
- [x]Create `src/app-api/core/tableApi.test.ts` — plain Jest tests for all core methods (no `renderHook`)
- [x]Create `src/app-api/useTableApi.test.ts` — trivial hook test: verifies hook returns core `tableApi` object
- [x]Create `src/app-api/core/visualStyleApi.ts` — framework-agnostic; coordinates `VisualStyleStore` via `.getState()`; no React imports
- [x]Create `src/app-api/useVisualStyleApi.ts` — thin React hook: `export const useVisualStyleApi = (): VisualStyleApi => visualStyleApi`
- [x]Implement `setDefault`, `setBypass`, `deleteBypass`, `createDiscreteMapping`, `createContinuousMapping`, `createPassthroughMapping`, `removeMapping`
- [x]Create `src/app-api/core/visualStyleApi.test.ts` — plain Jest tests for all core methods (no `renderHook`)
- [x]Create `src/app-api/useVisualStyleApi.test.ts` — trivial hook test: verifies hook returns core `visualStyleApi` object
- [x]Modify `src/app-api/index.ts` — uncomment both exports
- [x]Modify `src/app-api/types/AppContext.ts` — uncomment `table`, `visualStyle`
- [x]Modify `webpack.config.js` — add `'./TableApi'`, `'./VisualStyleApi'`

### Verification

- [x]`npm run lint` passes
- [x]`npm run test:unit -- --testPathPattern="tableApi|visualStyleApi"` passes
- [x]`npm run build` succeeds

---

## Phase 1e: Layout + Export

_Design: app-api-specification.md §1.5.6, §1.5.8, §3.6, §3.8, §3.10.6, §3.10.8_

### Pre-read files

| File                                     | Lines | Purpose                                         |
| ---------------------------------------- | ----- | ----------------------------------------------- |
| `src/models/LayoutModel/LayoutEngine.ts` | 30    | `LayoutEngine.apply()` — callback-based API     |
| `src/data/hooks/stores/LayoutStore.ts`   | 65    | `layoutEngines`, `preferredLayout`, `isRunning` |
| `src/models/CxModel/impl/exporter.ts`    | —     | `exportCyNetworkToCx2()` pure function          |
| `src/data/hooks/useRegisterNetwork.ts`   | —     | Reference layout execution flow (lines 130–155) |

### Deliverables

- [x]Create `src/app-api/core/layoutApi.ts` — framework-agnostic; new coordination logic (see app-api-spec § 3.6); dispatches `layout:started` / `layout:completed` events; no React imports
- [x]Create `src/app-api/useLayoutApi.ts` — thin React hook: `export const useLayoutApi = (): LayoutApi => layoutApi`
- [x]Implement `applyLayout(networkId, options?)` → `Promise<ApiResult<void>>` (new coordination logic)
- [x]In `applyLayout`, record `UndoCommandType.APPLY_LAYOUT` via `postEdit` using pre/post layout positions
- [x]Implement `getAvailableLayouts()` → `ApiResult<LayoutAlgorithmInfo[]>`
- [x]Create `src/app-api/core/layoutApi.test.ts` — plain Jest tests; layout event dispatch + undo recording verified
- [x]Create `src/app-api/useLayoutApi.test.ts` — trivial hook test: verifies hook returns core `layoutApi` object
- [x]Create `src/app-api/core/exportApi.ts` — framework-agnostic; multi-store CyNetwork assembly + exporter call; no React imports
- [x]Create `src/app-api/useExportApi.ts` — thin React hook: `export const useExportApi = (): ExportApi => exportApi`
- [x]Implement `exportToCx2(networkId, options?)` → `ApiResult<Cx2>` (6-store CyNetwork assembly)
- [x]Create `src/app-api/core/exportApi.test.ts` — plain Jest tests for all core methods (no `renderHook`)
- [x]Create `src/app-api/useExportApi.test.ts` — trivial hook test: verifies hook returns core `exportApi` object
- [x]Modify `src/app-api/core/index.ts` — assemble all 8 domain objects into `CyWebApi`; assign to `window.CyWebApi` in `src/init.tsx`
- [x]Modify `src/app-api/index.ts` — uncomment both exports
- [x]Modify `src/app-api/types/AppContext.ts` — uncomment `layout`, `export`; all fields now required
- [x]Modify `webpack.config.js` — add `'./LayoutApi'`, `'./ExportApi'`; mark legacy stores `@deprecated`
- [x]Update `src/app-api/api_docs/Api.md` — complete app API hook documentation

### Verification

- [x]`npm run lint` passes
- [x]`npm run test:unit -- --testPathPattern="layoutApi|exportApi"` passes
- [x]`npm run build` succeeds

---

## Phase 1f: Workspace API

_Design: app-api-specification.md §1.5.10, §3.9_

### Pre-read files

| File                                                           | Lines | Purpose                                                              |
| -------------------------------------------------------------- | ----- | -------------------------------------------------------------------- |
| `src/data/hooks/stores/WorkspaceStore.ts`                      | —     | `workspace.networkIds`, `workspace.currentNetworkId`, `setCurrentNetworkId`, `setName` |
| `src/models/StoreModel/WorkspaceStoreModel.ts`                 | —     | `Workspace` model shape, `WorkspaceStoreModel` interface             |
| `src/data/hooks/stores/NetworkSummaryStore.ts`                 | —     | `summaries: Record<IdType, NetworkSummary>` — per-network metadata   |
| `src/models/StoreModel/NetworkSummaryStoreModel.ts`            | —     | `NetworkSummary` shape (`name`, `nodeCount`, `edgeCount`, etc.)      |
| `src/models/WorkspaceModel/impl/WorkspaceImpl.ts` (or `Workspace.ts`) | — | `Workspace` data model                                        |

### Deliverables

- [x]Create `src/app-api/core/workspaceApi.ts` — framework-agnostic; reads `WorkspaceStore` + `NetworkSummaryStore` via `.getState()`; no React imports
- [x]Create `src/app-api/useWorkspaceApi.ts` — thin React hook: `export const useWorkspaceApi = (): WorkspaceApi => workspaceApi`
- [x]Implement `getWorkspaceInfo()` → `ApiResult<WorkspaceInfo>` (always succeeds; reads `workspace` from `WorkspaceStore`)
- [x]Implement `getNetworkIds()` → `ApiResult<{ networkIds: IdType[] }>` (shallow copy of `workspace.networkIds`)
- [x]Implement `getNetworkList()` → `ApiResult<WorkspaceNetworkInfo[]>` (join `networkIds` with `summaries`; silently omit missing entries)
- [x]Implement `getNetworkSummary(networkId)` → `ApiResult<WorkspaceNetworkInfo>` (fail `NetworkNotFound` if not in workspace or summary missing)
- [x]Implement `getCurrentNetworkId()` → `ApiResult<{ networkId: IdType }>` (fail `NoCurrentNetwork` when `networkIds.length === 0 || currentNetworkId === ''`)
- [x]Implement `switchCurrentNetwork(networkId)` → `ApiResult` (validate non-empty + membership; call `setCurrentNetworkId`; `network:switched` fires automatically via `initEventBus`)
- [x]Implement `setWorkspaceName(name)` → `ApiResult` (validate `name.trim() !== ''`; call `WorkspaceStore.setName(name.trim())`)
- [x]Create `src/app-api/core/workspaceApi.test.ts` — plain Jest tests for all 7 core methods (mock `WorkspaceStore`, `NetworkSummaryStore`; no `renderHook`)
- [x]Create `src/app-api/useWorkspaceApi.test.ts` — trivial hook test: verifies hook returns core `workspaceApi` object
- [x]Modify `src/app-api/core/index.ts` — add `workspace: workspaceApi` to `CyWebApi`
- [x]Modify `src/app-api/index.ts` — export `useWorkspaceApi`
- [x]Modify `src/app-api/types/index.ts` — export `WorkspaceInfo`, `WorkspaceNetworkInfo`, `WorkspaceApi`
- [x]Modify `src/app-api/types/AppContext.ts` — add `workspace: WorkspaceApi` to `AppContext.apis`
- [x]Modify `webpack.config.js` — add `'./WorkspaceApi': './src/app-api/useWorkspaceApi.ts'`

### Verification

- [x]`npm run lint` passes
- [x]`npm run test:unit -- --testPathPattern="workspaceApi"` passes
- [x]`npm run build` succeeds
- [x]Manual: `window.CyWebApi.workspace.getNetworkList()` returns the current workspace's networks in DevTools console
- [x]Manual: `window.CyWebApi.workspace.switchCurrentNetwork(id)` triggers `network:switched` event (visible in DevTools Event Listeners)

---

## Phase 1g: App Lifecycle

_Design: app-api-specification.md §1.5.9, §2.6 (Phase 1g)_

**Dependency note:** Requires Phase 1f (all `AppContext.apis` fields populated). The host passes
`CyWebApi` — assembled in Phase 1e Step 5.5 and extended in Phase 1f — directly as `AppContext.apis`.

### Pre-read files

| File                                               | Lines | Purpose                                                                              |
| -------------------------------------------------- | ----- | ------------------------------------------------------------------------------------ |
| `src/data/hooks/stores/useAppManager.ts`           | 175   | App loading loop; `registerApp` call site — injection point for lifecycle calls      |
| `src/data/hooks/stores/AppStore.ts`                | 258   | `AppStatus` enum (Active, Error); `add` action                                       |
| `src/app-api/types/AppContext.ts`                  | —     | `AppContext`, `CyAppWithLifecycle` — already defined, need to update `apis` type     |
| `src/app-api/core/index.ts`                        | —     | `CyWebApi` object + `CyWebApiType` interface — passed as `AppContext.apis`           |
| `src/models/AppModel/CyApp.ts`                     | 27    | Base `CyApp` interface — no changes needed (backward-compatible via optional methods)|

### Deliverables

- [x]Modify `src/app-api/types/AppContext.ts`:
  - Replace inline `apis` type with `CyWebApiType` imported from `../core`
  - Add JSDoc noting `apis` is the same object as `window.CyWebApi` at runtime
- [x]Modify `src/data/hooks/stores/useAppManager.ts`:
  - Import `CyAppWithLifecycle` from `../../app-api/types/AppContext`
  - Import `CyWebApi` from `../../app-api/core`
  - After `registerApp(cyApp)`, cast to `CyAppWithLifecycle`; if `mount` is defined, call `await cyApp.mount({ appId: cyApp.id, apis: CyWebApi })`
  - Add `mountedApps` ref to track apps where `mount` was called
  - Add `beforeunload` listener in `useEffect` that calls `unmount()` on all mounted apps
  - When an app's status changes to `AppStatus.Error`, call `unmount()` if it was previously mounted
- [x]Create `src/data/hooks/stores/useAppManager.lifecycle.test.ts` — plain Jest tests (mock `AppStore`, `CyWebApi`):
  - `mount` called with `{ appId, apis: CyWebApi }` when app implements `CyAppWithLifecycle.mount`
  - `mount` NOT called when app has no `mount` method (backward-compatible)
  - Async `mount` (returns Promise) is awaited before marking app as ready
  - `unmount` called when `beforeunload` fires
  - `unmount` called when app status transitions to `AppStatus.Error`
  - `unmount` NOT called for apps that never had `mount` invoked

### Verification

- [x]`npm run lint` passes
- [x]`npm run test:unit -- --testPathPattern="useAppManager.lifecycle"` passes
- [x]`npm run build` succeeds
- [x]Manual: App that logs in `mount()` shows the log when Cytoscape Web loads
- [x]Manual: `AppContext.apis.workspace.getNetworkList()` works inside a `mount()` callback
- [x]Manual: `unmount()` is called when page is refreshed (visible via console log in a test app)

---

## Phase 1a+: Element Bypass Support

_Design: app-api-specification.md §1.5.1 (CreateNodeOptions / CreateEdgeOptions enhancement)_

**Dependency note:** Requires Phase 1a (elementApi) and Phase 1d (visualStyleApi) to be complete.

### Deliverables

- [x]Modify `src/app-api/types/ElementTypes.ts` — re-export `VisualPropertyValueType` (needed for bypass type)
- [x]Modify `src/app-api/core/elementApi.ts`:
  - Add `bypass?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>` to `CreateNodeOptions`
  - Add `bypass?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>` to `CreateEdgeOptions`
  - In `createNode`: after element creation, if `options.bypass` is non-empty, call `visualStyleApi.setBypass(networkId, vpName, [newNodeId], vpValue)` for each entry
  - In `createEdge`: same pattern for the new edge
- [x]Update `src/app-api/core/elementApi.test.ts`:
  - Add test: `createNode` with `bypass` option applies bypass via `setBypass`
  - Add test: `createEdge` with `bypass` option applies bypass via `setBypass`
  - Add test: `createNode` without `bypass` does not call `setBypass`

### Verification

- [x]`npm run lint` passes
- [x]`npm run test:unit -- --testPathPattern="elementApi"` passes
- [x]Manual: create node with `bypass: { nodeBackgroundColor: '#ff0000' }` — node renders red immediately

---

## Phase 1h: Context Menu API

_Design: app-api-specification.md §1.5.11_

**Dependency note:** Requires Phase 1g (App Lifecycle) for the `mount`/`unmount` registration pattern demo. The `ContextMenuItemStore` can be created independently.

### Pre-read files

| File | Lines | Purpose |
| ---- | ----- | ------- |
| `src/features/` context menu components | — | Find existing right-click menu rendering location |
| `src/data/hooks/stores/` (any existing store for reference) | — | Pattern for new store creation |

### Deliverables — Host-side store

- [x]Create `src/data/hooks/stores/ContextMenuItemStore.ts` — Zustand store holding registered items registry
  - `items: RegisteredContextMenuItem[]`
  - `addItem(item: RegisteredContextMenuItem): void`
  - `removeItem(itemId: string): void`
- [x]Create `src/models/StoreModel/ContextMenuItemStoreModel.ts` — TypeScript interface for the store

### Deliverables — App API

- [x]Add `ContextMenuItemNotFound = 'CONTEXT_MENU_ITEM_NOT_FOUND'` to `ApiErrorCode` in `src/app-api/types/ApiResult.ts`
- [x]Create `src/app-api/core/contextMenuApi.ts` — framework-agnostic; coordinates `ContextMenuItemStore` via `.getState()`; no React imports
  - Implement `addContextMenuItem(config)` → `ApiResult<{ itemId: string }>`:
    - Validate `config.label.trim() !== ''` → `fail(InvalidInput)` if empty
    - Generate UUID `itemId`
    - Default `config.targetTypes` to `['node', 'edge']` if omitted
    - Call `ContextMenuItemStore.getState().addItem({...config, itemId})`
    - Return `ok({ itemId })`
  - Implement `removeContextMenuItem(itemId)` → `ApiResult`:
    - Look up item by `itemId` in store
    - If not found → `fail(ContextMenuItemNotFound, ...)`
    - Call `ContextMenuItemStore.getState().removeItem(itemId)`
    - Return `ok()`
- [x]Create `src/app-api/useContextMenuApi.ts` — thin React hook: `export const useContextMenuApi = (): ContextMenuApi => contextMenuApi`
  > **Phase 2 note:** Deleted in Step 2.3. Replaced by `createContextMenuApi(appId)` factory and anonymous singleton.
- [x]Export types `ContextMenuItemConfig`, `ContextMenuTarget`, `ContextMenuApi` via `src/app-api/types/index.ts`
- [x]Create `src/app-api/core/contextMenuApi.test.ts` — plain Jest tests (mock `ContextMenuItemStore`):
  - `addContextMenuItem` with valid label returns `ok({ itemId })`
  - `addContextMenuItem` with empty label returns `fail(InvalidInput)`
  - `addContextMenuItem` defaults `targetTypes` to `['node', 'edge']`
  - `removeContextMenuItem` with known `itemId` removes item and returns `ok()`
  - `removeContextMenuItem` with unknown `itemId` returns `fail(ContextMenuItemNotFound)`
- [x]Create `src/app-api/useContextMenuApi.test.ts` — trivial hook test: verifies hook returns core `contextMenuApi` object
  > **Phase 2 note:** Deleted in Step 2.3 along with `useContextMenuApi.ts`.
- [x]Modify `src/app-api/core/index.ts` — add `contextMenu: contextMenuApi` to `CyWebApi`
- [x]Modify `src/app-api/types/AppContext.ts` — add `contextMenu: ContextMenuApi` to `AppContext.apis` type
- [x]Modify `webpack.config.js` — add `'./ContextMenuApi': './src/app-api/useContextMenuApi.ts'`
  > **Phase 2 note:** Expose removed in Step 2.3. Context menu API is now accessed via `AppContext.apis.contextMenu` (per-app) or `window.CyWebApi.contextMenu` (anonymous singleton).

### Deliverables — Host UI wiring

- [x]Locate existing context menu components in `src/features/` that render node/edge/canvas right-click menus
- [x]Modify those components to read from `ContextMenuItemStore` and render app-registered items below built-in items
- [x]App-registered items call `item.handler({ type, id, networkId })` on click
- [x]Items with `targetTypes` not matching the current target type are filtered out

### Verification

- [x]`npm run lint` passes
- [x]`npm run test:unit -- --testPathPattern="contextMenuApi|ContextMenuItemStore"` passes
- [x]`npm run build` succeeds
- [x]Manual: call `window.CyWebApi.contextMenu.addContextMenuItem({ label: 'Test Item', handler: (t) => console.log(t) })` in DevTools — item appears in node right-click menu
- [x]Manual: call `window.CyWebApi.contextMenu.removeContextMenuItem(itemId)` — item disappears from menu
- [x]Manual: add item in `mount()`, remove in `unmount()` — no orphaned items after app deactivation

---

## Step 2: Event Bus

_Design: [event-bus-specification.md](../specifications/event-bus-specification.md) — full spec including store subscription mapping, edge cases, and test patterns_

**Dependency note:** `layout:started` / `layout:completed` events are dispatched from
`core/layoutApi.ts` (Phase 1e). All other 6 event types depend only on existing stores and can
be implemented at any point after Phase 1, Step 0. Full wiring of layout events requires Phase 1e
to be complete before Step 2 is closed.

### Pre-read files

| File                                              | Lines | Purpose                                                     |
| ------------------------------------------------- | ----- | ----------------------------------------------------------- |
| `src/data/hooks/stores/WorkspaceStore.ts`         | —     | `networkIds`, `currentNetworkId` — source for network events |
| `src/data/hooks/stores/ViewModelStore.ts`         | 354   | Selection state per network view                            |
| `src/data/hooks/stores/VisualStyleStore.ts`       | 337   | Visual style map — source for `style:changed`               |
| `src/data/hooks/stores/TableStore.ts`             | 397   | Table data — source for `data:changed`                      |
| `src/app-api/core/layoutApi.ts`                  | —     | Insert `dispatchCyWebEvent` calls for layout events (1e dep) |
| `src/features/AppShell.tsx`                       | —     | Where `initEventBus()` and `cywebapi:ready` are called (after store hydration) |

### Deliverables

- [x]Create `src/app-api/event-bus/CyWebEvents.ts` — `CyWebEvents` interface + `CyWebEventMap` type
- [x]Create `src/app-api/event-bus/dispatchCyWebEvent.ts` — generic `dispatchCyWebEvent<K>` helper
- [x]Create `src/app-api/event-bus/initEventBus.ts` — Zustand subscriptions for 6 store-based events
  - [x]`network:created` / `network:deleted` — WorkspaceStore `networkIds` (Set diff)
  - [x]`network:switched` — WorkspaceStore `currentNetworkId`
  - [x]`selection:changed` — ViewModelStore current view with `shallowEqual`
  - [x]`style:changed` — VisualStyleStore `visualStyles` (per-property diff)
  - [x]`data:changed` — TableStore `tables` (per-table diff with `rowIds`)
- [x]Create `src/app-api/useCyWebEvent.ts` — React hook: `useEffect` + `addEventListener` + cleanup
- [x]Modify `src/features/AppShell.tsx` (not `src/init.tsx` — stores must hydrate from IndexedDB first):
  - [x]Import and call `initEventBus()` after workspace hydration completes
  - [x]Dispatch `cywebapi:ready` immediately after `initEventBus()`
- [x]Modify `src/app-api/core/layoutApi.ts` — add `dispatchCyWebEvent('layout:started', ...)` before layout and `dispatchCyWebEvent('layout:completed', ...)` after *(requires Phase 1e)*
- [x]Modify `webpack.config.js` — add `'./EventBus': './src/app-api/useCyWebEvent.ts'`

### Tests

- [x]Create `src/app-api/event-bus/initEventBus.test.ts` — plain Jest, mock `window.dispatchEvent`
  - [x]`network:created` — add one ID; add multiple IDs simultaneously
  - [x]`network:deleted` — remove one ID; remove multiple IDs
  - [x]`network:switched` — ID changes; same ID (no event); `previousId` is `''` on first switch
  - [x]`selection:changed` — nodes change; edges change; same reference (no event via `shallowEqual`)
  - [x]`style:changed` — single property changes; no-op mutation (no event)
  - [x]`data:changed` — single row change; bulk change; schema-only change (`rowIds: []`)
  - [x]Startup suppression — no `network:created` events fired during `initEventBus()` itself
- [x]Create `src/app-api/useCyWebEvent.test.ts` — `renderHook` from `@testing-library/react`
  - [x]Handler fires when matching event dispatched on `window`
  - [x]Handler not called for non-matching event type
  - [x]Listener removed on unmount (handler not called after)
  - [x]Handler reference change causes re-subscription
- [x]Add layout event tests to `src/app-api/core/layoutApi.test.ts` *(after Phase 1e)*
  - [x]`layout:started` dispatched before layout executes
  - [x]`layout:completed` dispatched after positions committed
  - [x]Neither event dispatched when `applyLayout` fails before starting
- [x]Add `cywebapi:ready` smoke test to `src/app-api/cywebapi-ready.test.ts`
  - [x]`cywebapi:ready` fired after `window.CyWebApi` is assigned

### Verification

- [x]`npm run lint` passes
- [x]`npm run test:unit -- --testPathPattern="initEventBus|useCyWebEvent"` passes
- [x]`npm run build` succeeds
- [x]Manual: open DevTools Event Listeners panel — confirm `selection:changed` fires on node click

---

## Final Verification (All Phase 1 Steps Complete)

- [x]`npm run lint` — zero errors
- [x]`npm run test:unit` — all tests pass
- [x]`npm run build` — production build succeeds
- [x]All 12 webpack `exposes` entries present: `ApiTypes`, `ElementApi`, `NetworkApi`, `SelectionApi`, `ViewportApi`, `TableApi`, `VisualStyleApi`, `LayoutApi`, `ExportApi`, `WorkspaceApi`, `ContextMenuApi`, `EventBus`
  > **Phase 2 note:** Now 12 entries (not 13): `ContextMenuApi` was removed and `AppIdContext` was added in Phase 2.
- [x]`AppContext.apis` typed as `CyWebApiType` (same object as `window.CyWebApi` at runtime)
- [x]Legacy 12 store exposures + 2 task hook exposures still present (backward compatible)
- [x]`src/app-api/api_docs/Api.md` covers all 10 app API hooks + event bus + lifecycle
- [x]`src/app-api/core/` contains zero React imports (`import.*from 'react'` absent in all `core/*.ts` files)
- [x]`cywebapi:ready` dispatched on `window` after full initialization
- [x]`hello-world/HelloPanel` `SelectionCounter` reacts to selection via `useCyWebEvent`
- [x]Apps implementing `CyAppWithLifecycle.mount()` receive `AppContext` on activation
- [x]Apps implementing `CyAppWithLifecycle.unmount()` are cleaned up on page unload
- [x]Existing apps without lifecycle methods continue to function (backward compatible)
- [x]`createNode` with `bypass` option applies visual property bypasses atomically
- [x]`createEdge` with `bypass` option applies visual property bypasses atomically
- [x]`window.CyWebApi.contextMenu.addContextMenuItem(...)` registers items visible in context menus
- [x]`window.CyWebApi.contextMenu.removeContextMenuItem(itemId)` removes items from context menus
- [x]Context menu items registered in `mount()` and removed in `unmount()` leave no orphaned state

---

## Quick Reference: App API Method → Internal Target

| App API Method               | Internal Source                                         | Return                                                           | Phase |
| --------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- | ----- |
| `createNode`                | `useCreateNode().createNode()`                          | `CreateNodeResult` → `ok({nodeId})`                              | 1a    |
| `createEdge`                | `useCreateEdge().createEdge()`                          | `CreateEdgeResult` → `ok({edgeId})`                              | 1a    |
| `deleteNodes`               | `useDeleteNodes().deleteNodes()`                        | `DeleteNodesResult` → `ok({deletedNodeCount, deletedEdgeCount})` | 1a    |
| `deleteEdges`               | `useDeleteEdges().deleteEdges()`                        | `DeleteEdgesResult` → `ok({deletedEdgeCount})`                   | 1a    |
| `getNode`                   | `NetworkStore` + `TableStore` + `ViewModelStore` reads  | `ok(NodeData)`                                                   | 1a    |
| `getEdge`                   | `NetworkStore` + `TableStore` reads                     | `ok(EdgeData)`                                                   | 1a    |
| `moveEdge`                  | **New:** `NetworkStore.moveEdge()` + `postEdit`         | `ok()`                                                           | 1a    |
| `generateNextNodeId`        | `useCreateNode().generateNextNodeId()`                  | `IdType` (unwrapped)                                             | 1a    |
| `generateNextEdgeId`        | `useCreateEdge().generateNextEdgeId()`                  | `IdType` (unwrapped)                                             | 1a    |
| `createNetworkFromEdgeList` | `useCreateNetwork()()`                                  | `CyNetwork` → `ok({networkId, cyNetwork})`                       | 1b    |
| `createNetworkFromCx2`      | `useCreateNetworkFromCx2()()`                           | `CyNetwork` → `ok({networkId, cyNetwork})`                       | 1b    |
| `deleteNetwork`             | `useDeleteCyNetwork().deleteNetwork()`                  | `void` → `ok()`                                                  | 1b    |
| `deleteCurrentNetwork`      | `useDeleteCyNetwork().deleteCurrentNetwork()`           | `void` → `ok()`                                                  | 1b    |
| `deleteAllNetworks`         | `useDeleteCyNetwork().deleteAllNetworks()`              | `void` → `ok()`                                                  | 1b    |
| `exclusiveSelect`           | `ViewModelStore.exclusiveSelect()`                      | `void` → `ok()`                                                  | 1c    |
| `additiveSelect`            | `ViewModelStore.additiveSelect()`                       | `void` → `ok()`                                                  | 1c    |
| `additiveUnselect`          | `ViewModelStore.additiveUnselect()`                     | `void` → `ok()`                                                  | 1c    |
| `toggleSelected`            | `ViewModelStore.toggleSelected()`                       | `void` → `ok()`                                                  | 1c    |
| `getSelection`              | `ViewModelStore.getViewModel()`                         | `ok({selectedNodes, selectedEdges})`                             | 1c    |
| `fit`                       | `RendererFunctionStore.getFunction('cyjs','fit')`       | `Promise<ok()>`                                                  | 1c    |
| `getNodePositions`          | `ViewModelStore.getViewModel()` → nodeViews             | `ok(positions)`                                                  | 1c    |
| `updateNodePositions`       | `ViewModelStore.updateNodePositions()`                  | `void` → `ok()`                                                  | 1c    |
| `getValue`                  | `TableStore.tables[id]` read                            | `ok({value})`                                                    | 1d    |
| `getRow`                    | `TableStore.tables[id]` read                            | `ok({row})`                                                      | 1d    |
| `createColumn`              | `TableStore.createColumn()`                             | `void` → `ok()`                                                  | 1d    |
| `deleteColumn`              | `TableStore.deleteColumn()`                             | `void` → `ok()`                                                  | 1d    |
| `setValue`                  | `TableStore.setValue()`                                 | `void` → `ok()`                                                  | 1d    |
| `setValues`                 | `TableStore.setValues()`                                | `void` → `ok()`                                                  | 1d    |
| `editRows`                  | `TableStore.editRows()`                                 | `void` → `ok()`                                                  | 1d    |
| `setDefault`                | `VisualStyleStore.setDefault()`                         | `void` → `ok()`                                                  | 1d    |
| `setBypass`                 | `VisualStyleStore.setBypass()`                          | `void` → `ok()`                                                  | 1d    |
| `deleteBypass`              | `VisualStyleStore.deleteBypass()`                       | `void` → `ok()`                                                  | 1d    |
| `createDiscreteMapping`     | `VisualStyleStore.createDiscreteMapping()`              | `void` → `ok()`                                                  | 1d    |
| `createContinuousMapping`   | `VisualStyleStore.createContinuousMapping()`            | `void` → `ok()`                                                  | 1d    |
| `createPassthroughMapping`  | `VisualStyleStore.createPassthroughMapping()`           | `void` → `ok()`                                                  | 1d    |
| `removeMapping`             | `VisualStyleStore.removeMapping()`                      | `void` → `ok()`                                                  | 1d    |
| `applyLayout`               | **New coordination:** `LayoutEngine.apply()` + callback + `postEdit(UndoCommandType.APPLY_LAYOUT)` | `Promise<ok()>`                                                  | 1e    |
| `getAvailableLayouts`       | `LayoutStore.layoutEngines` read                        | `ok(infos)`                                                      | 1e    |
| `exportToCx2`               | `exportCyNetworkToCx2()` + 6-store assembly             | `ok(cx2)`                                                        | 1e    |
| `getWorkspaceInfo`          | `WorkspaceStore.workspace` read                         | `ok(WorkspaceInfo)`                                              | 1f    |
| `getNetworkIds`             | `WorkspaceStore.workspace.networkIds` read              | `ok({networkIds})`                                               | 1f    |
| `getNetworkList`            | `WorkspaceStore.workspace` + `NetworkSummaryStore.summaries` join | `ok(WorkspaceNetworkInfo[])`                             | 1f    |
| `getNetworkSummary`         | `WorkspaceStore.workspace` + `NetworkSummaryStore.summaries` read | `ok(WorkspaceNetworkInfo)`                               | 1f    |
| `getCurrentNetworkId`       | `WorkspaceStore.workspace.currentNetworkId` read        | `ok({networkId})`                                                | 1f    |
| `switchCurrentNetwork`      | `WorkspaceStore.setCurrentNetworkId()` (fires `network:switched` via `initEventBus`) | `ok()`                                    | 1f    |
| `setWorkspaceName`          | `WorkspaceStore.setName(name.trim())`                   | `ok()`                                                           | 1f    |
| `createNode` (bypass)       | `visualStyleApi.setBypass()` called after element creation | `ok({nodeId})` (bypass applied atomically)                    | 1a+   |
| `createEdge` (bypass)       | `visualStyleApi.setBypass()` called after element creation | `ok({edgeId})` (bypass applied atomically)                    | 1a+   |
| `addContextMenuItem`        | `ContextMenuItemStore.addItem()`                        | `ok({itemId})`                                                   | 1h    |
| `removeContextMenuItem`     | `ContextMenuItemStore.removeItem()`                     | `ok()` / `fail(ContextMenuItemNotFound)`                         | 1h    |
