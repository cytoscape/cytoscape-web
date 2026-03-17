# Changelog

All notable changes to `@cytoscape-web/api-types` are documented here.

## 1.0.0-beta.0 (2026-03-17)

### Added — Phase 3.6 (Graph Traversal API)

- 10 read-only graph query methods on `ElementApi`:
  `getNodeIds`, `getEdgeIds`, `getConnectedEdges`, `getConnectedNodes`,
  `getOutgoers`, `getIncomers`, `getSuccessors`, `getPredecessors`,
  `getRoots`, `getLeaves`

### Changed

- Version bumped from `0.1.0-alpha.4` to `1.0.0-beta.0` (pre-beta milestone)

## 0.1.0-alpha.4 (2026-03-16)

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

## 0.1.0-alpha.2 (2026-03-11)

### Added — Phase 1f (Event Bus)

- `CyWebEvents` interface with typed detail shapes for all 8 events
- `CyWebEventMap` for `window.addEventListener` overloads
- Ambient `WindowEventMap` augmentation for typed event listeners
- `cywebapi:ready` event type

## 0.1.0-alpha.1 (2026-03-10)

### Added — Phase 1a–1e (Domain APIs)

- 10 domain API interfaces: `ElementApi`, `NetworkApi`, `SelectionApi`,
  `ViewportApi`, `TableApi`, `VisualStyleApi`, `LayoutApi`, `ExportApi`,
  `WorkspaceApi`, and `CyWebApiType` (composite)
- `ApiResult<T>`, `ApiSuccess<T>`, `ApiFailure`, `ApiError`, `ApiErrorCode`,
  `ok()`, `fail()` utility types and functions
- `AppContext`, `CyAppWithLifecycle` types
- Model re-exports: `IdType`, `Network`, `Node`, `Edge`, `Table`,
  `VisualStyle`, `NetworkView`, `NetworkSummary`, `Cx2`, etc.
- `cyweb/*` module declarations for all Module Federation remotes
- `Window.CyWebApi` ambient augmentation

## 0.1.0-alpha.0 (2026-03-09)

### Added

- Initial package scaffolding with tsup build
- Phase 0 foundation types (`ApiResult<T>`, `AppContext`, element types)
