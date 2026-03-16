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
