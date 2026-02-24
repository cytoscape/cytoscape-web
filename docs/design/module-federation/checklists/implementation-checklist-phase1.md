# Implementation Checklist — Phase 1: Facade Hook Implementation

> Track progress for Phase 1 (all sub-phases). Mark `[x]` when complete. Run verification after each step.
>
> Phase 0 checklist: [implementation-checklist-phase0.md](implementation-checklist-phase0.md)

---

## Phase 1a: Element API

_Design: facade-api-specification.md §1.5.1, §3.1, §3.1.1, §3.9.1_

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

- [ ] Create `src/app-api/core/elementApi.ts` — framework-agnostic; coordinates stores via `.getState()`; no React imports
- [ ] Create `src/app-api/useElementApi.ts` — thin React hook: `export const useElementApi = (): ElementApi => elementApi`
- [ ] Implement `createNode(networkId, position, options?)` → `ApiResult<{nodeId}>`
- [ ] Implement `createEdge(networkId, sourceId, targetId, options?)` → `ApiResult<{edgeId}>`
- [ ] Implement `deleteNodes(networkId, nodeIds)` → `ApiResult<{deletedNodeCount, deletedEdgeCount}>`
- [ ] Implement `deleteEdges(networkId, edgeIds)` → `ApiResult<{deletedEdgeCount}>`
- [ ] Implement `getNode(networkId, nodeId)` → `ApiResult<NodeData>`
- [ ] Implement `getEdge(networkId, edgeId)` → `ApiResult<EdgeData>`
- [ ] Implement `generateNextNodeId(networkId)` → `IdType`
- [ ] Implement `generateNextEdgeId(networkId)` → `IdType`
- [ ] **`moveEdge` internal infrastructure:**
  - [ ] Add `moveEdge()` function to `src/models/NetworkModel/impl/networkImpl.ts`
  - [ ] Verify barrel export in `src/models/NetworkModel/index.ts`
  - [ ] Add `moveEdge` to `NetworkUpdateActions` in `src/models/StoreModel/NetworkStoreModel.ts`
  - [ ] Add `moveEdge` action to `src/data/hooks/stores/NetworkStore.ts`
  - [ ] Add `MOVE_EDGES` to `UndoCommandType` in `src/models/StoreModel/UndoStoreModel.ts`
  - [ ] Add undo/redo handlers in `src/data/hooks/useUndoStack.tsx`
- [ ] Implement `moveEdge(networkId, edgeId, newSourceId, newTargetId)` → `ApiResult<void>` in `core/elementApi.ts`
- [ ] Create `src/app-api/core/elementApi.test.ts` — plain Jest tests for all core methods (no `renderHook`)
- [ ] Create `src/app-api/useElementApi.test.ts` — trivial hook test: verifies hook returns core `elementApi` object
- [ ] Modify `src/app-api/index.ts` — uncomment `useElementApi` export
- [ ] Modify `src/app-api/types/AppContext.ts` — uncomment `element: ElementApi`
- [ ] Modify `webpack.config.js` — add `'./ElementApi': './src/app-api/useElementApi.ts'`

### Verification

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="elementApi"` passes
- [ ] `npm run build` succeeds

---

## Phase 1b: Network API

_Design: facade-api-specification.md §1.5.2, §3.2, §3.9.2_

### Pre-read files

| File                                        | Lines | Purpose                                                        |
| ------------------------------------------- | ----- | -------------------------------------------------------------- |
| `src/data/task/useCreateNetworkFromCx2.tsx` | 127   | CX2 → CyNetwork creation, side effects (workspace, navigation) |
| `src/data/task/useCreateNetwork.tsx`        | 236   | Edge list → CyNetwork creation                                 |
| `src/data/hooks/useDeleteCyNetwork.ts`      | 171   | Network deletion (10-store cleanup)                            |
| `src/models/CxModel/impl/validator.ts`      | —     | `validateCX2()` function                                       |

### Deliverables

- [ ] Create `src/app-api/core/networkApi.ts` — framework-agnostic; coordinates stores via `.getState()`; no React imports
- [ ] Create `src/app-api/useNetworkApi.ts` — thin React hook: `export const useNetworkApi = (): NetworkApi => networkApi`
- [ ] Implement `createNetworkFromEdgeList(props)` → `ApiResult<{networkId, cyNetwork}>`
- [ ] Implement `createNetworkFromCx2(props)` → `ApiResult<{networkId, cyNetwork}>` (with `validateCX2` call)
- [ ] Implement `deleteNetwork(networkId, options?)` → `ApiResult<void>`
- [ ] Implement `deleteCurrentNetwork(options?)` → `ApiResult<void>`
- [ ] Implement `deleteAllNetworks()` → `ApiResult<void>`
- [ ] Modify `src/data/task/useCreateNetworkFromCx2.tsx` — add optional `navigate` and `addToWorkspace` parameters
- [ ] Create `src/app-api/core/networkApi.test.ts` — plain Jest tests for all core methods (no `renderHook`)
- [ ] Create `src/app-api/useNetworkApi.test.ts` — trivial hook test: verifies hook returns core `networkApi` object
- [ ] Modify `src/app-api/index.ts` — uncomment `useNetworkApi` export
- [ ] Modify `src/app-api/types/AppContext.ts` — uncomment `network: NetworkApi`
- [ ] Modify `webpack.config.js` — add `'./NetworkApi': './src/app-api/useNetworkApi.ts'`

### Verification

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="networkApi"` passes
- [ ] `npm run build` succeeds

---

## Phase 1c: Selection + Viewport

_Design: facade-api-specification.md §1.5.3, §1.5.7, §3.3, §3.7, §3.9.3, §3.9.7_

### Pre-read files

| File                                             | Lines | Purpose                                          |
| ------------------------------------------------ | ----- | ------------------------------------------------ |
| `src/models/StoreModel/ViewModelStoreModel.ts`   | 165   | Selection methods, `getViewModel`, `NetworkView` |
| `src/data/hooks/stores/ViewModelStore.ts`        | 354   | Store implementation                             |
| `src/data/hooks/stores/RendererFunctionStore.ts` | 64    | `getFunction('cyjs', 'fit', networkId)`          |
| `src/models/StoreModel/RendererStoreModel.ts`    | 36    | `ViewPort`, `getViewport`                        |

### Deliverables

- [ ] Create `src/app-api/core/selectionApi.ts` — framework-agnostic; coordinates `ViewModelStore` via `.getState()`; no React imports
- [ ] Create `src/app-api/useSelectionApi.ts` — thin React hook: `export const useSelectionApi = (): SelectionApi => selectionApi`
- [ ] Implement `exclusiveSelect(networkId, nodeIds, edgeIds)` → `ApiResult<void>`
- [ ] Implement `additiveSelect(networkId, ids)` → `ApiResult<void>`
- [ ] Implement `additiveUnselect(networkId, ids)` → `ApiResult<void>`
- [ ] Implement `toggleSelected(networkId, ids)` → `ApiResult<void>`
- [ ] Implement `getSelection(networkId)` → `ApiResult<{selectedNodes, selectedEdges}>`
- [ ] Create `src/app-api/core/selectionApi.test.ts` — plain Jest tests for all core methods (no `renderHook`)
- [ ] Create `src/app-api/useSelectionApi.test.ts` — trivial hook test: verifies hook returns core `selectionApi` object
- [ ] Create `src/app-api/core/viewportApi.ts` — framework-agnostic; coordinates `RendererFunctionStore` + `ViewModelStore` via `.getState()`; no React imports
- [ ] Create `src/app-api/useViewportApi.ts` — thin React hook: `export const useViewportApi = (): ViewportApi => viewportApi`
- [ ] Implement `fit(networkId)` → `Promise<ApiResult<void>>`
- [ ] Implement `getNodePositions(networkId, nodeIds)` → `ApiResult<Map<IdType, [number, number, number?]>>`
- [ ] Implement `updateNodePositions(networkId, positions)` → `ApiResult<void>`
- [ ] Create `src/app-api/core/viewportApi.test.ts` — plain Jest tests for all core methods (no `renderHook`)
- [ ] Create `src/app-api/useViewportApi.test.ts` — trivial hook test: verifies hook returns core `viewportApi` object
- [ ] Modify `src/app-api/index.ts` — uncomment both exports
- [ ] Modify `src/app-api/types/AppContext.ts` — uncomment `selection`, `viewport`
- [ ] Modify `webpack.config.js` — add `'./SelectionApi'`, `'./ViewportApi'`

### Verification

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="selectionApi|viewportApi"` passes
- [ ] `npm run build` succeeds

---

## Phase 1d: Table + Visual Style

_Design: facade-api-specification.md §1.5.4, §1.5.5, §3.4, §3.5, §3.9.4, §3.9.5_

### Pre-read files

| File                                             | Lines | Purpose                                               |
| ------------------------------------------------ | ----- | ----------------------------------------------------- |
| `src/models/StoreModel/TableStoreModel.ts`       | 107   | All table mutation methods, `CellEdit`, `TableRecord` |
| `src/data/hooks/stores/TableStore.ts`            | 397   | Store implementation, null-safety inconsistencies     |
| `src/models/StoreModel/VisualStyleStoreModel.ts` | 120   | All VS methods — zero null-checks                     |
| `src/data/hooks/stores/VisualStyleStore.ts`      | 337   | Store implementation                                  |

### Deliverables

- [ ] Create `src/app-api/core/tableApi.ts` — framework-agnostic; coordinates `TableStore` via `.getState()`; no React imports
- [ ] Create `src/app-api/useTableApi.ts` — thin React hook: `export const useTableApi = (): TableApi => tableApi`
- [ ] Implement `getValue`, `getRow`, `createColumn`, `deleteColumn`, `setValue`, `setValues`, `editRows`, `setColumnName`, `applyValueToElements`
- [ ] Create `src/app-api/core/tableApi.test.ts` — plain Jest tests for all core methods (no `renderHook`)
- [ ] Create `src/app-api/useTableApi.test.ts` — trivial hook test: verifies hook returns core `tableApi` object
- [ ] Create `src/app-api/core/visualStyleApi.ts` — framework-agnostic; coordinates `VisualStyleStore` via `.getState()`; no React imports
- [ ] Create `src/app-api/useVisualStyleApi.ts` — thin React hook: `export const useVisualStyleApi = (): VisualStyleApi => visualStyleApi`
- [ ] Implement `setDefault`, `setBypass`, `deleteBypass`, `createDiscreteMapping`, `createContinuousMapping`, `createPassthroughMapping`, `removeMapping`
- [ ] Create `src/app-api/core/visualStyleApi.test.ts` — plain Jest tests for all core methods (no `renderHook`)
- [ ] Create `src/app-api/useVisualStyleApi.test.ts` — trivial hook test: verifies hook returns core `visualStyleApi` object
- [ ] Modify `src/app-api/index.ts` — uncomment both exports
- [ ] Modify `src/app-api/types/AppContext.ts` — uncomment `table`, `visualStyle`
- [ ] Modify `webpack.config.js` — add `'./TableApi'`, `'./VisualStyleApi'`

### Verification

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="tableApi|visualStyleApi"` passes
- [ ] `npm run build` succeeds

---

## Phase 1e: Layout + Export

_Design: facade-api-specification.md §1.5.6, §1.5.8, §3.6, §3.8, §3.9.6, §3.9.8_

### Pre-read files

| File                                     | Lines | Purpose                                         |
| ---------------------------------------- | ----- | ----------------------------------------------- |
| `src/models/LayoutModel/LayoutEngine.ts` | 30    | `LayoutEngine.apply()` — callback-based API     |
| `src/data/hooks/stores/LayoutStore.ts`   | 65    | `layoutEngines`, `preferredLayout`, `isRunning` |
| `src/models/CxModel/impl/exporter.ts`    | —     | `exportCyNetworkToCx2()` pure function          |
| `src/data/hooks/useRegisterNetwork.ts`   | —     | Reference layout execution flow (lines 130–155) |

### Deliverables

- [ ] Create `src/app-api/core/layoutApi.ts` — framework-agnostic; new coordination logic (see facade-api-spec § 3.6); dispatches `layout:started` / `layout:completed` events; no React imports
- [ ] Create `src/app-api/useLayoutApi.ts` — thin React hook: `export const useLayoutApi = (): LayoutApi => layoutApi`
- [ ] Implement `applyLayout(networkId, options?)` → `Promise<ApiResult<void>>` (new coordination logic)
- [ ] Implement `getAvailableLayouts()` → `ApiResult<LayoutAlgorithmInfo[]>`
- [ ] Create `src/app-api/core/layoutApi.test.ts` — plain Jest tests; layout event dispatch verified
- [ ] Create `src/app-api/useLayoutApi.test.ts` — trivial hook test: verifies hook returns core `layoutApi` object
- [ ] Create `src/app-api/core/exportApi.ts` — framework-agnostic; multi-store CyNetwork assembly + exporter call; no React imports
- [ ] Create `src/app-api/useExportApi.ts` — thin React hook: `export const useExportApi = (): ExportApi => exportApi`
- [ ] Implement `exportToCx2(networkId, options?)` → `ApiResult<Cx2>` (6-store CyNetwork assembly)
- [ ] Create `src/app-api/core/exportApi.test.ts` — plain Jest tests for all core methods (no `renderHook`)
- [ ] Create `src/app-api/useExportApi.test.ts` — trivial hook test: verifies hook returns core `exportApi` object
- [ ] Modify `src/app-api/core/index.ts` — assemble all 8 domain objects into `CyWebApi`; assign to `window.CyWebApi` in `src/init.tsx`
- [ ] Modify `src/app-api/index.ts` — uncomment both exports
- [ ] Modify `src/app-api/types/AppContext.ts` — uncomment `layout`, `export`; all fields now required
- [ ] Modify `webpack.config.js` — add `'./LayoutApi'`, `'./ExportApi'`; mark legacy stores `@deprecated`
- [ ] Update `src/app-api/api_docs/Api.md` — complete facade hook documentation

### Verification

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="layoutApi|exportApi"` passes
- [ ] `npm run build` succeeds

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
| `src/init.tsx`                                    | —     | Where `initEventBus()` and `cywebapi:ready` will be added   |

### Deliverables

- [ ] Create `src/app-api/event-bus/CyWebEvents.ts` — `CyWebEvents` interface + `CyWebEventMap` type
- [ ] Create `src/app-api/event-bus/dispatchCyWebEvent.ts` — generic `dispatchCyWebEvent<K>` helper
- [ ] Create `src/app-api/event-bus/initEventBus.ts` — Zustand subscriptions for 6 store-based events
  - [ ] `network:created` / `network:deleted` — WorkspaceStore `networkIds` (Set diff)
  - [ ] `network:switched` — WorkspaceStore `currentNetworkId`
  - [ ] `selection:changed` — ViewModelStore current view with `shallowEqual`
  - [ ] `style:changed` — VisualStyleStore `visualStyles` (per-property diff)
  - [ ] `data:changed` — TableStore `tables` (per-table diff with `rowIds`)
- [ ] Create `src/app-api/useCyWebEvent.ts` — React hook: `useEffect` + `addEventListener` + cleanup
- [ ] Modify `src/init.tsx`:
  - [ ] Import and call `initEventBus()` after `window.CyWebApi = CyWebApi`
  - [ ] Dispatch `cywebapi:ready` as the final initialization step
- [ ] Modify `src/app-api/core/layoutApi.ts` — add `dispatchCyWebEvent('layout:started', ...)` before layout and `dispatchCyWebEvent('layout:completed', ...)` after *(requires Phase 1e)*
- [ ] Modify `webpack.config.js` — add `'./EventBus': './src/app-api/useCyWebEvent.ts'`

### Tests

- [ ] Create `src/app-api/event-bus/initEventBus.test.ts` — plain Jest, mock `window.dispatchEvent`
  - [ ] `network:created` — add one ID; add multiple IDs simultaneously
  - [ ] `network:deleted` — remove one ID; remove multiple IDs
  - [ ] `network:switched` — ID changes; same ID (no event); `previousId` is `''` on first switch
  - [ ] `selection:changed` — nodes change; edges change; same reference (no event via `shallowEqual`)
  - [ ] `style:changed` — single property changes; no-op mutation (no event)
  - [ ] `data:changed` — single row change; bulk change; schema-only change (`rowIds: []`)
  - [ ] Startup suppression — no `network:created` events fired during `initEventBus()` itself
- [ ] Create `src/app-api/useCyWebEvent.test.ts` — `renderHook` from `@testing-library/react`
  - [ ] Handler fires when matching event dispatched on `window`
  - [ ] Handler not called for non-matching event type
  - [ ] Listener removed on unmount (handler not called after)
  - [ ] Handler reference change causes re-subscription
- [ ] Add layout event tests to `src/app-api/core/layoutApi.test.ts` *(after Phase 1e)*
  - [ ] `layout:started` dispatched before layout executes
  - [ ] `layout:completed` dispatched after positions committed
  - [ ] Neither event dispatched when `applyLayout` fails before starting
- [ ] Add `cywebapi:ready` smoke test to `src/init.test.ts` (or app initialization test file)
  - [ ] `cywebapi:ready` fired after `window.CyWebApi` is assigned

### Verification

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="initEventBus|useCyWebEvent"` passes
- [ ] `npm run build` succeeds
- [ ] Manual: open DevTools Event Listeners panel — confirm `selection:changed` fires on node click

---

## Final Verification (All Phase 1 Steps Complete)

- [ ] `npm run lint` — zero errors
- [ ] `npm run test:unit` — all tests pass
- [ ] `npm run build` — production build succeeds
- [ ] All 10 webpack `exposes` entries present: `ApiTypes`, `ElementApi`, `NetworkApi`, `SelectionApi`, `ViewportApi`, `TableApi`, `VisualStyleApi`, `LayoutApi`, `ExportApi`, `EventBus`
- [ ] All `AppContext.apis` fields uncommented and typed
- [ ] Legacy 12 store exposures + 2 task hook exposures still present (backward compatible)
- [ ] `src/app-api/api_docs/Api.md` covers all 8 facade hooks + event bus
- [ ] `src/app-api/core/` contains zero React imports (`import.*from 'react'` absent in all `core/*.ts` files)
- [ ] `cywebapi:ready` dispatched on `window` after full initialization
- [ ] `hello-world/HelloPanel` `SelectionCounter` reacts to selection via `useCyWebEvent`

---

## Quick Reference: Facade Method → Internal Target

| Facade Method               | Internal Source                                         | Return                                                           | Phase |
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
| `applyLayout`               | **New coordination:** `LayoutEngine.apply()` + callback | `Promise<ok()>`                                                  | 1e    |
| `getAvailableLayouts`       | `LayoutStore.layoutEngines` read                        | `ok(infos)`                                                      | 1e    |
| `exportToCx2`               | `exportCyNetworkToCx2()` + 6-store assembly             | `ok(cx2)`                                                        | 1e    |
