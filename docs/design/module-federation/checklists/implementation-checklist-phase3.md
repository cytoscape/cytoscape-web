# Implementation Checklist — Phase 3: Sample Code and Developer Documentation

> Track progress for Phase 3. Mark `[x]` when complete.
>
> Phase 2 checklist: [implementation-checklist-phase2.md](implementation-checklist-phase2.md)

_Goal: Make it easy for third-party developers to build, test, and publish Cytoscape Web apps._

**Dependency note:** Requires Phase 2 to be complete. `ResourceApi`, `AppIdContext`, `AppContextApis`, per-app factory pattern, and all example app migrations must be in place.

---

## Step 3.0: App Developer Guide

### 3.0.1 — Create standalone App Developer Guide

- [x] Create `cytoscape-web-app-examples/docs/APP_DEVELOPER_GUIDE.md`
- [x] Cover: prerequisites (Node.js LTS, host repo, workspace setup)
- [x] Cover: clone both repos, `npm install`, `npm run dev`, verify at `localhost:5500`
- [x] Cover: copy `project-template/`, rename, change federation name/port
- [x] Cover: register app in `apps.local.json`
- [x] Cover: verify in browser (App Settings → enable → see panel/menu)
- [x] Cover: first API call (`useWorkspaceApi().getWorkspaceInfo()`)
- [x] Cover: first event listener (`useCyWebEvent('network:switched', ...)`)
- [x] Cover: context menu registration in `mount()` via `context.apis.contextMenu`
- [x] Cover: deploy considerations (production URL, `apps.json`)

### 3.0.2 — Update examples root README

- [x] Replace `components` pattern with `resources[]` as primary in App Entry Point section
- [x] Mark `components` as deprecated backward-compatible fallback
- [x] Add `useAppContext()` section for in-component API access
- [x] Add link to App Developer Guide
- [x] Update "Which Example to Read" table

### 3.0.3 — Align tsconfig setup documentation

- [x] Align `packages/api-types/README.md` and `examples/README.md` to recommend the same approach
- [x] Recommend `"types": ["@cytoscape-web/api-types"]` in `compilerOptions`

### 3.0.4 — Create Migration Guide

- [x] Create `cytoscape-web-app-examples/docs/MIGRATION_GUIDE.md`
- [x] Document `components[]` → `resources[]` mapping (`ComponentType.Panel` → `slot: 'right-panel'`, etc.)
- [x] Document `useContextMenuApi()` → `useAppContext().apis.contextMenu`
- [x] Document `cyweb/ContextMenuApi` import → `cyweb/AppIdContext` import
- [x] Document individual component exposes no longer needed (only `./AppConfig`)
- [x] Include before/after code examples

---

## Step 3.1: API Reference Documentation

### 3.1.1 — Add ResourceApi section to Api.md

- [x] Add full `ResourceApi` section following existing format
- [x] Document types: `ResourceSlot`, `PanelHostProps`, `MenuItemHostProps`
- [x] Document types: `RegisterPanelOptions`, `RegisterMenuItemOptions`, `RegisterResourceEntry`
- [x] Document types: `RegisteredResourceInfo`, `ResourceVisibilityResult`, `ResourceDeclaration`
- [x] Document all 9 methods: `getSupportedSlots`, `registerPanel`, `unregisterPanel`, `registerMenuItem`, `unregisterMenuItem`, `unregisterAll`, `registerAll`, `getRegisteredResources`, `getResourceVisibility`
- [x] Include declarative (`resources[]`) and imperative (`mount()`) usage examples

### 3.1.2 — Add RESOURCE_NOT_FOUND to error codes table

- [x] Add `ResourceNotFound` / `'RESOURCE_NOT_FOUND'` to error codes table in Api.md

### 3.1.3 — Document AppIdContext / useAppContext()

- [x] Add section for `useAppContext()` from `cyweb/AppIdContext`
- [x] Document return type: `AppContext | null`
- [x] Document `AppContextApis` (extends `CyWebApiType` with `resource` and per-app `contextMenu`)
- [x] Include usage example

### 3.1.4 — Update App Lifecycle section for AppContextApis

- [x] Change `AppContext.apis` type from `CyWebApiType` to `AppContextApis`
- [x] Add `resources?: ResourceDeclaration[]` to `CyAppWithLifecycle` listing
- [x] Update example to use `resources[]` pattern instead of `ComponentType`
- [x] Note `AppContextApis` extends `CyWebApiType` with `resource` and per-app `contextMenu`

### 3.1.5 — Document window.CyWebApi resource limitation

- [x] Add note: `window.CyWebApi.resource` is `undefined`
- [x] Clarify: `ResourceApi` is only available via `AppContext.apis.resource` in `mount()` or `useAppContext()`

---

## Step 3.2: Enriched Examples

### 3.2.1 — Migrate network-workflows to Phase 2

- [x] Replace `components[]` with `resources[]` + `lazy()` imports in `NetworkWorkflowsApp.tsx`
- [x] Remove individual exposes from `webpack.config.js` (keep only `'./AppConfig'`)
- [x] Verify all 3 components render correctly via `resources[]`

### 3.2.2 — Add ViewportApi example to hello-world

- [x] Create `hello-world/src/components/ViewportSection.tsx`
- [x] Demo: "Fit to viewport" button (`viewportApi.fit()`)
- [x] Demo: display/update node positions (`getNodePositions()`, `updateNodePositions()`)

### 3.2.3 — Add TableApi example to hello-world

- [x] Create `hello-world/src/components/TableSection.tsx`
- [x] Demo: read row from node table (`tableApi.getRow()`)
- [x] Demo: set cell value (`tableApi.setValue()`)
- [x] Demo: create column (`tableApi.createColumn()`)

### 3.2.4 — Add ExportApi example to hello-world

- [x] Create `hello-world/src/components/ExportSection.tsx`
- [x] Demo: "Export to CX2" button (`exportApi.exportToCx2()`)
- [x] Demo: display CX2 JSON or trigger download

### 3.2.5 — Add ElementApi example to hello-world

- [x] Create `hello-world/src/components/ElementSection.tsx`
- [x] Demo: create node with `bypass` (visual property override)
- [x] Demo: create edge between selected nodes
- [x] Demo: delete selected elements

### 3.2.6 — Integrate new sections into HelloPanel

- [x] Import and render ViewportSection, TableSection, ExportSection, ElementSection
- [x] Add MUI Dividers between sections
- [x] Total: 11 example sections (0–10)

### 3.2.7 — Update hello-world README

- [x] Add Example 7 (ViewportApi), Example 8 (TableApi), Example 9 (ExportApi), Example 10 (ElementApi)
- [x] Update API coverage table to show 100% coverage
- [x] Update project structure section

### 3.2.8 — Add window.CyWebApi usage example

- [x] Add "Non-React / Vanilla JS" section to Developer Guide
- [x] Cover: waiting for `cywebapi:ready` event
- [x] Cover: `window.CyWebApi.network.createNetworkFromEdgeList()` example
- [x] Cover: event subscription via `window.addEventListener`

---

## Step 3.3: Starter Template Overhaul

### 3.3.1 — Fix id/federation name mismatch

- [x] Align `TemplateApp.tsx` `id` with `webpack.config.js` federation `name`
- [x] Choose consistent placeholder (e.g., `'myApp'`) with clear TODO comment

### 3.3.2 — Add TODO markers

- [x] Add `// TODO: Change app id and name` to `TemplateApp.tsx`
- [x] Add `// TODO: Change federation name and port` to `webpack.config.js`
- [x] Add `// TODO: Change package name` to `package.json`

### 3.3.3 — Update project-template README

- [x] Document id/federation name must match
- [x] Add `@cytoscape-web/api-types` setup for standalone projects
- [x] Add links to hello-world for advanced patterns
- [x] Note `resources[]` as recommended approach

---

## Step 3.4: Package Documentation

### 3.4.1 — Fix api-types README typo

- [x] Fix `api.network.getCurrentNetwork()` → `api.workspace.getCurrentNetworkId()`

### 3.4.2 — Create CHANGELOG.md

- [x] Create `packages/api-types/CHANGELOG.md`
- [x] Document: `0.1.0-alpha.0` (Phase 0), `alpha.1-3` (Phase 1), `alpha.4` (Phase 2)
- [x] Add placeholder for future stable `0.1.0`

---

## Step 3.5: Cross-cutting Updates

### 3.5.1 — Update examples CLAUDE.md

- [x] Update CyApp Config section: `resources[]` as primary, `components` as deprecated
- [x] Note `remotes.d.ts` no longer needed with `@cytoscape-web/api-types`
- [x] Mark raw store imports as deprecated in API Usage Patterns section

### 3.5.2 — Rewrite patterns/README.md

- [x] Replace all deprecated raw store patterns with App API hook patterns
- [x] Add patterns for: ViewportApi, TableApi, ExportApi, ElementApi, ResourceApi, ContextMenuApi

### 3.5.3 — Clean up design/apps/README.md

- [x] Remove references to non-existent `simple-menu/`, `simple-panel/`

---

## Step 3.6: Graph Traversal API (Pre-Beta)

_Design: [module-federation-design.md § Pre-Beta: Graph Traversal API](../module-federation-design.md)_

Add 10 read-only graph query methods to `ElementApi`, wrapping cytoscape.js
core methods via `getInternalNetworkDataStore()`.

### Types

- [x] Add `ElementApi` method signatures to `src/app-api/types/ElementTypes.ts` or appropriate type file:
  - `getNodeIds(networkId): ApiResult<{ nodeIds: IdType[] }>`
  - `getEdgeIds(networkId): ApiResult<{ edgeIds: IdType[] }>`
  - `getConnectedEdges(networkId, nodeId): ApiResult<{ edges: EdgeData[] }>`
  - `getConnectedNodes(networkId, nodeId): ApiResult<{ nodeIds: IdType[] }>`
  - `getOutgoers(networkId, nodeId): ApiResult<{ nodeIds: IdType[], edgeIds: IdType[] }>`
  - `getIncomers(networkId, nodeId): ApiResult<{ nodeIds: IdType[], edgeIds: IdType[] }>`
  - `getSuccessors(networkId, nodeId): ApiResult<{ nodeIds: IdType[] }>`
  - `getPredecessors(networkId, nodeId): ApiResult<{ nodeIds: IdType[] }>`
  - `getRoots(networkId): ApiResult<{ nodeIds: IdType[] }>`
  - `getLeaves(networkId): ApiResult<{ nodeIds: IdType[] }>`
- [x] Export new types from `src/app-api/types/index.ts`

### Core Implementation

- [x] Implement all 10 methods in `src/app-api/core/elementApi.ts`:
  - Use `getInternalNetworkDataStore(network)` to access cytoscape.js `Core`
  - Validate `networkId` exists (return `fail(NetworkNotFound)`)
  - For node-scoped methods, validate `nodeId` exists (return `fail(NodeNotFound)`)
  - Map cytoscape.js collections to plain ID arrays / `EdgeData` objects
- [x] Verify no React imports in core (framework-agnostic rule)

### Tests

- [x] Add tests to `src/app-api/core/elementApi.test.ts`:
  - `getNodeIds` returns all node IDs
  - `getEdgeIds` returns all edge IDs
  - `getConnectedEdges` returns edges for a given node
  - `getConnectedNodes` returns neighbor node IDs
  - `getOutgoers` / `getIncomers` return directed neighbors
  - `getSuccessors` / `getPredecessors` return transitive closure
  - `getRoots` returns nodes with no incoming edges
  - `getLeaves` returns nodes with no outgoing edges
  - All methods return `fail(NetworkNotFound)` for invalid network
  - Node-scoped methods return `fail(NodeNotFound)` for invalid node

### Documentation

- [x] Add Graph Traversal section to `src/app-api/api_docs/Api.md`
- [x] Update `@cytoscape-web/api-types` package with new types
- [x] Update `guides/architecture-overview.md` Available APIs table if needed

### Verification

- [x] `npm run test:unit` — all tests pass
- [x] `npm run build` — host builds
- [x] `npm run build:api-types` — types package builds
- [x] Manual test: project-template example uses `getConnectedNodes` in context menu

---

## Step 3.7: TSV Table Import/Export API (Pre-Beta)

_Design: [module-federation-design.md § Step 3.7](../module-federation-design.md)_

### Types

- [ ] Add `getTable()` signature to `TableApi` interface in `src/app-api/types/index.ts`
  - Returns `ApiResult<{ columns: Array<{ name: string; type: ValueTypeName }>; rows: Array<Record<string, ValueType>> }>`
  - Options: `{ columns?: string[] }`
- [ ] Add `exportTableToTsv()` signature to `TableApi` interface
  - Returns `ApiResult<{ tsvText: string }>`
  - Options: `{ columns?: string[]; includeTypeHeader?: boolean }`
- [ ] Add `importTableFromTsv()` signature to `TableApi` interface
  - Returns `ApiResult<{ rowCount: number; newColumns: string[] }>`
  - Options: `{ keyColumn?: string }`
- [ ] Edge table export always includes `source` and `target` columns

### Core Implementation

- [ ] Implement `getTable()` in `src/app-api/core/tableApi.ts`:
  - Read all rows from `TableStore` for the given `networkId` and `tableType`
  - Return column metadata (name + type) and row data
  - Optional column filter
- [ ] Implement `exportTableToTsv()`:
  - Delegate to `getTable()`, then serialize columns + rows to TSV string
  - Tab-separated, newline-delimited
  - `includeTypeHeader: true` → `name:string\tdegree:integer` Cytoscape Desktop header format
  - `includeTypeHeader: false` (default) → plain column names
- [ ] Implement `importTableFromTsv()`:
  - Parse header row (detect `:type` annotations if present)
  - Auto-detect types via existing `inferColumnType()` when no type header
  - Create new columns as needed
  - Match rows by `keyColumn` (default: `id`)
  - Use `tableApi.editRows()` internally for bulk write
- [ ] Verify no React imports in core (framework-agnostic rule)

### Tests

- [ ] Add tests to `src/app-api/core/tableApi.test.ts`:
  - `getTable` returns columns with types and all rows
  - `getTable` with `columns` filter returns subset
  - `exportTableToTsv` produces valid TSV (tab-separated, header + data rows)
  - `exportTableToTsv` with `includeTypeHeader: true` adds type annotations
  - Edge table TSV always includes `source` and `target`
  - `importTableFromTsv` creates new columns and writes data
  - `importTableFromTsv` with typed header preserves column types
  - `importTableFromTsv` matches rows by custom `keyColumn`
  - Round-trip: `exportTableToTsv` → `importTableFromTsv` preserves data
  - All methods return `fail(NetworkNotFound)` for invalid network

### Documentation

- [ ] Add TSV I/O section to `src/app-api/api_docs/Api.md` under TableApi
- [ ] Update `@cytoscape-web/api-types` package with new method signatures
- [ ] Update `guides/architecture-overview.md` TableApi description

### Verification

- [ ] `npm run test:unit` — all tests pass
- [ ] `npm run build` — host builds
- [ ] `npm run build:api-types` — types package builds
- [ ] Manual test: export node table → edit TSV → import back → data visible in Table Browser

---

## Final Verification

### Build & Test

- [x] `npm run build` succeeds (host)
- [x] `npm run test:unit` passes (host)
- [x] `npm run build` succeeds (all example apps)
- [x] `npx tsc --noEmit` passes (all example apps)

### Manual Testing

- [x] hello-world: all 11 sections functional (ViewportApi, TableApi, ExportApi, ElementApi added)
- [x] network-workflows: resources[] pattern, all 3 components render
- [x] project-template: panel + menu item + context menu work from template

### Documentation Review

- [x] Api.md covers all implemented APIs including ResourceApi
- [x] App Developer Guide: new developer can create working app from scratch
- [x] Migration Guide: Phase 1 app can be migrated to Phase 2 following the guide
- [x] hello-world README matches all example sections
