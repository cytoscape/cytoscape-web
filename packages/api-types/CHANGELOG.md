# Changelog

All notable changes to `@cytoscape-web/api-types` are documented here.

## 1.0.0-beta.4 (unpublished)

### Changed

- **BREAKING — `'apps-menu'` entries are plain data, not components.**
  `RegisterMenuItemOptions` lost `component`, `closeOnAction`, `errorFallback`
  and `title`; it now takes `label` (required), `tooltip`, `icon` (an image
  URI — http(s), `data:image`, or a root-relative host asset path, exactly as
  for a `'search-bar'` provider; never a component — an SVG is painted by the
  host in the row's text color, a raster image shown as-is), `onClick(apis)` and
  `isEnabled(apis)`, alongside the unchanged `order`/`group`/`requires`. The
  host renders every entry itself as a standard menu row, so no app can change
  the shared dropdown's size, font or colors. `MenuItemHostProps` is gone with
  the component it described. Registering with a `component` now fails with
  `APP9` and a migration message. Move an old component's action into
  `onClick`; move its form or other UI into `apis.dialog.open({ render })` (or
  a `'modal-launcher'` registration) called from `onClick`. `'right-panel'`
  registrations are unchanged.

### Added

- **Dialog API** — `AppContextApis.dialog` (`DialogApi`, `OpenDialogOptions`,
  `DialogRenderProps`). `apis.dialog.open({ title, render, id?, maxWidth?,
  fullWidth? })` shows a modal whose frame (title bar, Close "X", dismissal
  policy, error and Suspense boundaries) the host owns and whose body the app
  renders; `render` receives `close`. `close(dialogId?)` closes one dialog, or
  the app's most recent one. Per-app: dialogs are closed automatically when
  the app is disabled. The escape hatch for `'apps-menu'` items that need
  custom UI. Not on `window.CyWebApi`.
- **SVG icons are tinted by the host; raster icons are shown unchanged.** The
  `icon` of a `'search-bar'` provider and of an `'apps-menu'` entry follows one
  rule: an SVG (`data:image/svg+xml`, or a path ending in `.svg`) is painted as
  a CSS mask in the surrounding text color — only its shape matters, it follows
  the light/dark theme and the disabled state, multi-color SVG artwork renders
  as a monochrome silhouette, and a cross-origin http(s) SVG needs CORS
  headers. A raster image (PNG, JPEG, ...) keeps its colors; ship one to keep a
  logo's colors. An inlined SVG `data:` URI is the easy choice for a glyph.
- **`ResourceApi.getResourceVisibility(id, slot?)`** takes an optional slot,
  since ids are unique per slot rather than per app.
- **Escape closes app dialogs.** Both `'modal-launcher'` modals and Dialog API
  dialogs now close on Escape (the backdrop stays inert), through the same
  path as `requestClose` / `close` and the host's Close "X".
- **`'modal-launcher'` resource slot** (#690). Apps register modal dialog
  content the host renders inside its own React tree — host theme, error
  isolation, Suspense for lazy chunks, and the host's dialog shell with its
  button-only dismissal policy and structural Close "X". New types
  `RegisterModalOptions` and `ModalHostProps`; `ResourceSlot` and
  `ResourceDeclaration`/`RegisterResourceEntry` gained the slot; and
  `ResourceApi` gained `registerModal`, `unregisterModal`, and the
  imperative `openModal(id)` / `closeModal(id)` — callable from app logic
  with no mounted component (a search provider's `onSubmit`, a menu
  action). Open modals survive the launching component's unmount and are
  closed automatically on app deactivation; `unregisterModal` and
  `unregisterAll` close what they remove.
- **`'search-bar'` resource slot** (#688 — landed after the entries below
  were written). `RegisterNetworkSearchProviderOptions`,
  `NetworkSearchQuery`, `NetworkSearchOptionsHostProps`; `ResourceApi`
  gained `registerNetworkSearchProvider` / `unregisterNetworkSearchProvider`.
- **Readiness promise.** `CyWebApi.whenReady()` resolves with the API once
  startup completes (immediately if already ready); `CyWebApi.isReady()`
  returns the current boolean. Wraps the one-shot `cywebapi:ready` event.
- **Scoped current-network API.** `CyWebApi.forNetwork(networkId?)` returns
  the network-scoped domains (`element`, `table`, `selection`, `viewport`,
  `visualStyle`, `export`) with `networkId` pre-bound, so it need not be
  passed on every call. `layout` is included but carries only its
  network-scoped method, `applyLayout`; read the available algorithms from
  the top-level `layout.getAvailableLayouts()`. Omit the argument to target
  the current network, resolved at call time. New type `ScopedCyWebApi`.
- **Visual Style read API.** `VisualStyleApi` was previously write-only; it
  now exposes `getVisualProperties`, `getDefault`, `getBypass`,
  `getBypasses`, and `getMapping` (all returning `ApiResult`).
- **`VisualStyleApi.setDefaults(networkId, defaults)`** applies many
  visual-property defaults in one all-or-nothing validated call.
- **`VisualStyleApi.setBypasses(networkId, elementIds, bypasses)`** applies
  many visual-property bypasses to a set of elements in one all-or-nothing
  validated call.
- **Batch element creation.** `ElementApi.createNodes(networkId, specs)` and
  `createEdges(networkId, specs)` create many elements in one operation that
  records a single undo entry. New types `NodeSpec`, `EdgeSpec`,
  `BatchCreateOptions`.
- **`ElementApi.getNodes(networkId, nodeIds?)`** — batch node read; unknown
  ids are reported in `missing` instead of failing the call.
- **`SelectionApi.clearSelection(networkId)`** convenience.
- **`TableApi` id round-tripping.** `getTable` and `exportTableToTsv` include
  the element id by default (new `includeId` option); an exported node TSV
  now round-trips through `importTableFromTsv` with no manual id handling.
  `importTableFromTsv` gained a `skippedCells` result field.
- **`AppCodes.COLUMN_NOT_FOUND` (`APP10`).**

### Changed — BREAKING

- `SelectionApi.additiveSelect` / `additiveDeselect` / `toggleSelected` now
  take `(networkId, nodeIds, edgeIds)` — separate arrays — instead of a
  single merged `ids` array. `additiveUnselect` is renamed
  `additiveDeselect`.
- `VisualStyleApi.removeMapping` is renamed `deleteMapping`.
- `VisualStyleApi.createContinuousMapping(networkId, vpName, options)`
  replaces the nine-argument positional form
  (`CreateContinuousMappingOptions`).
- `TableApi.setColumnName` is renamed `renameColumn`.
- `ExportApi.exportToCx2` now returns the canonical `Cx2` model type instead
  of a loose `any[]` alias.
- `ElementApi.generateNextNodeId` / `generateNextEdgeId` now return
  `ApiResult<{ nodeId }>` / `ApiResult<{ edgeId }>` instead of a bare string.
- `ElementApi.getConnectedEdges` results now include each edge's `id`.
- `NetworkApi.createNetworkFromEdgeList` / `createNetworkFromNodeList` now
  default `addToWorkspace` to `true` (matching `createNetworkFromCx2`).
- `ResourceApi.getSupportedSlots` / `getRegisteredResources` /
  `getResourceVisibility` now return `ApiResult` instead of raw values.
- `WorkspaceApi.getNetworkList` is renamed `getNetworks` and returns
  `{ networks }`; `LayoutApi.getAvailableLayouts` returns `{ layouts }` —
  collection getters now uniformly wrap their result in a named object.
- `ViewportApi.getNodePositions` takes an optional `nodeIds` (all nodes when
  omitted) and returns `{ positions, missing }`.
- `ElementApi.getEdges` carries attributes, accepts an optional `edgeIds`
  filter, and returns `{ edges, missing }`.
- `ElementApi.deleteNodes` / `deleteEdges` results gained a `missing` field
  listing requested ids that did not exist.

### Fixed

- Context menu removal is now scoped to the owning app — one app can no
  longer remove another app's item by guessing its id.
- `useCyWebEvent` no longer re-registers its window listener when a fresh
  inline handler is passed each render (handler held in a ref).

- Create-time `options.bypass` on `createNode` / `createEdge` is now
  validated (property existence, node/edge scope, value type) before the
  element is created.
- `tableApi.deleteColumn` / `renameColumn` / `getValue` now report
  `COLUMN_NOT_FOUND` for a missing column instead of silently succeeding.
- `createColumn` validates its default value against the declared type.
- `importTableFromTsv` no longer coerces unparseable numeric/boolean cells
  to `0` / `false` — they are skipped and reported.
- The "always returns `ApiResult`, never throws" contract now holds across
  the whole surface.

## 1.0.0-beta.3 (2026-07-16)

### Added

- `ElementApi.getEdges(networkId)` — read all edge IDs and endpoints in one
  call without an additional `getEdge()` round-trip per edge
- `NetworkApi.createNetworkFromNodeList(...)` — create an induced or explicit
  subnetwork from a node subset while preserving IDs, attributes, columns, and
  node positions
- `TableApi.getColumns(networkId, tableType)` — read table schema without
  materializing table rows
- `network:changed` event with added/removed node and edge IDs

### Changed — BREAKING

- **`ApiErrorCode` (flat enum) removed.** Replaced by domain-grouped code
  catalogs — `ElementCodes`, `TableCodes`, `StyleCodes`, `AppCodes` — each
  a `Record<string, { code, severity, message }>` mirroring a
  diagnostic-style error model. `ApiError` gains a `severity` field whose
  value is `error` or `warning`; `ApiError.cx2Code` (an interim field from a prior
  beta) is removed now that the primary `code` carries the precise
  identity directly.
- Codes that enforce a CX2 validation requirement now use the CX2 code
  string itself as `error.code` (e.g. `FK1`, `BV1`, `MI3`) instead of a
  coarse category. Codes with no CX2 equivalent (workspace/registry/
  runtime concepts) use a new `APP1`–`APP9` namespace.
- `fail()` signature changed: `fail(codeDef, ...templateArgs)` replaces
  `fail(code, message, cx2Code?)`. External apps constructing `ApiError`
  values directly (uncommon) must update to the new shape.
- Boundary validation now rejects invalid element attributes, table schemas and
  values, visual style values, bypass targets/scopes, and mapping
  sources/bounds that earlier prereleases could accept.
- `NetworkApi.deleteNetwork()` now uses the shared network-deletion
  orchestrator. `DeleteNetworkOptions.navigate` remains in the type for source
  compatibility but no longer changes behavior: deleting the current network
  always repairs `currentNetworkId`, while deleting a non-current network does
  not switch networks.

**Old → new code mapping** (old `ApiErrorCode` member → new catalog entry):

| Old                                                       | New                                                                                                                                                                                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NetworkNotFound` (`NETWORK_NOT_FOUND`)                   | `AppCodes.NETWORK_NOT_FOUND` (`APP1`)                                                                                                                                                                                                       |
| `NodeNotFound` (`NODE_NOT_FOUND`)                         | `ElementCodes.NODE_NOT_FOUND` (`GL1`)                                                                                                                                                                                                       |
| `EdgeNotFound` (`EDGE_NOT_FOUND`)                         | `ElementCodes.EDGE_NOT_FOUND` (`GL2`)                                                                                                                                                                                                       |
| `ElementNotFound` (`ELEMENT_NOT_FOUND`)                   | removed — bypass-target checks now return `StyleCodes.BYPASS_TARGET_NOT_FOUND` (`BV1`) directly                                                                                                                                             |
| `InvalidInput` (`INVALID_INPUT`)                          | `AppCodes.INVALID_INPUT` (`APP9`) for the residual generic case; many call sites now return a precise code instead (`FK1`, `FK2`, `A6`, `A8`, `A1`, `AC6`, `BV1`, `BV2`, `BV5`, `MC1`, `MI1`, `MI2`, `MI3`, `V7`, `VP1`–`VP10`, `N3`, `E6`) |
| `InvalidCx2` (`INVALID_CX2`)                              | `AppCodes.INVALID_CX2` (`APP8`)                                                                                                                                                                                                             |
| `OperationFailed` (`OPERATION_FAILED`)                    | `AppCodes.OPERATION_FAILED` (`APP3`)                                                                                                                                                                                                        |
| `LayoutEngineNotFound` (`LAYOUT_ENGINE_NOT_FOUND`)        | `AppCodes.LAYOUT_ENGINE_NOT_FOUND` (`APP4`)                                                                                                                                                                                                 |
| `FunctionNotAvailable` (`FUNCTION_NOT_AVAILABLE`)         | `AppCodes.FUNCTION_NOT_AVAILABLE` (`APP5`)                                                                                                                                                                                                  |
| `NoCurrentNetwork` (`NO_CURRENT_NETWORK`)                 | `AppCodes.NO_CURRENT_NETWORK` (`APP2`)                                                                                                                                                                                                      |
| `ContextMenuItemNotFound` (`CONTEXT_MENU_ITEM_NOT_FOUND`) | `AppCodes.CONTEXT_MENU_ITEM_NOT_FOUND` (`APP6`)                                                                                                                                                                                             |
| `ResourceNotFound` (`RESOURCE_NOT_FOUND`)                 | `AppCodes.RESOURCE_NOT_FOUND` (`APP7`)                                                                                                                                                                                                      |

See [ErrorCodes.md](https://github.com/cytoscape/cytoscape-web/blob/development/src/app-api/api_docs/ErrorCodes.md)
for the full catalog, one entry per code.

### Changed

- `ElementApi.createNode()` and `createEdge()` now return the complete created
  element data in addition to its ID. `deleteNodes()` and `deleteEdges()` now
  return the complete deleted element data in addition to deletion counts.
- `TableApi.importTableFromTsv()` now returns `skippedRows`, listing TSV key
  values that did not match an element in the target network.
- `data:changed` event details now include required `addedColumns` and
  `removedColumns` arrays. A rename is reported as one removed and one added
  column.
- `VisualStyleApi.createDiscreteMapping()` accepts an optional mapping-entry
  record. `createContinuousMapping()` accepts optional `controlPoints`,
  `ltMinVpValue`, and `gtMaxVpValue` arguments.

### Fixed

- TSV imports merge cells into existing rows instead of replacing unrelated
  attributes, use batched `setValues()` updates, and report unmatched keys
- Table column creation, deletion, and rename stay synchronized with Table
  Browser display configuration; mapping sources follow renames and mappings
  referencing deleted columns are removed
- Network deletion consistently clears related network, table, view, style,
  summary, undo, filter, opaque-aspect, validation, and per-network UI state
- Layout engine dynamic-import failures, synchronous throws, and callback
  failures resolve as `ApiFailure` and reset the layout-running state
- Discrete mapping creation commits mapping entries synchronously

## 1.0.0-beta.2 (2026-03-18)

### Added — Step 3.7 (TSV Table I/O)

- `getTable(networkId, tableType, options?)` — bulk read with column metadata
- `exportTableToTsv(networkId, tableType, options?)` — serialize table to TSV string
- `importTableFromTsv(networkId, tableType, tsvText, options?)` — parse TSV and write to table
- New types: `ColumnInfo`, `GetTableOptions`, `ExportTableToTsvOptions`, `ImportTableFromTsvOptions`

## 1.0.0-beta.1 (2026-03-17)

### Changed

- Republished the beta milestone with version and documentation alignment; no
  additional public API change from `1.0.0-beta.0`

## 1.0.0-beta.0 (2026-03-17)

### Added — Phase 3.6 (Graph Traversal API)

- 10 read-only graph query methods on `ElementApi`:
  `getNodeIds`, `getEdgeIds`, `getConnectedEdges`, `getConnectedNodes`,
  `getOutgoers`, `getIncomers`, `getSuccessors`, `getPredecessors`,
  `getRoots`, `getLeaves`

### Changed

- Version bumped from `0.1.0-alpha.4` to `1.0.0-beta.0` (pre-beta milestone)

## 0.1.0-alpha.4 (2026-03-15)

### Added — Phase 2 (App Resource Registration)

- `ResourceSlot`, `ResourceApi`, `ResourceDeclaration`, `RegisterPanelOptions`,
  `RegisterMenuItemOptions`, `RegisteredResourceInfo`, `ResourceVisibilityResult`
- `AppContextApis` interface — per-app API shape extending `CyWebApiType` with
  required `resource` and `contextMenu` fields
- `PanelHostProps`, `MenuItemHostProps` — host-injected prop types for plugin
  components rendered in right-panel and apps-menu slots
- `RegisterResourceEntry` for batch `registerAll()` calls
- `RESOURCE_NOT_FOUND` error code added to `ApiErrorCode`
- `cyweb/AppIdContext` module declaration in `mf-declarations.d.ts`
- `cyweb/ContextMenuApi` module declaration **removed** (hook deleted in Phase 2)

### Changed

- `CyWebApiType` now explicitly does NOT include `resource` (window-safe type)
- `AppContext.apis` typed as `AppContextApis` (mount-safe, includes `resource` +
  per-app `contextMenu`)
- `CyAppWithLifecycle` gains optional `resources?: ResourceDeclaration[]` for
  declarative registration

## 0.1.0-alpha.3 (2026-03-12)

### Added — Phase 1g–1h

- `ContextMenuApi`, `ContextMenuItemConfig`, `ContextMenuHandlerContext`,
  `ContextMenuTarget` types for context menu registration
- `cyweb/ContextMenuApi` module declaration (later removed in alpha.4)

### Changed

- Updated `AppContext` with `CyAppWithLifecycle` type

## 0.1.0-alpha.2 (2026-03-12)

### Added — Phase 1f (Event Bus)

- `CyWebEvents` interface with typed detail shapes for all 8 events
- `CyWebEventMap` for `window.addEventListener` overloads
- Ambient `WindowEventMap` augmentation for typed event listeners
- `cywebapi:ready` event type

## 0.1.0-alpha.1 (2026-03-10)

### Added — Phase 1a–1e (Domain APIs)

- 9 domain API interfaces: `ElementApi`, `NetworkApi`, `SelectionApi`,
  `ViewportApi`, `TableApi`, `VisualStyleApi`, `LayoutApi`, `ExportApi`,
  and `WorkspaceApi`, plus `CyWebApiType` (composite)
- `ApiResult<T>`, `ApiSuccess<T>`, `ApiFailure`, `ApiError`, `ApiErrorCode`,
  `ok()`, `fail()` utility types and functions
- `AppContext`, `CyAppWithLifecycle` types
- Model re-exports: `IdType`, `Network`, `Node`, `Edge`, `Table`,
  `VisualStyle`, `NetworkView`, `NetworkSummary`, `Cx2`, etc.
- `cyweb/*` module declarations for all Module Federation remotes
- `Window.CyWebApi` ambient augmentation

## 0.1.0-alpha.0 (2026-02-26)

### Added

- Initial package scaffolding with tsup build
- Phase 0 foundation types (`ApiResult<T>`, `AppContext`, element types)
