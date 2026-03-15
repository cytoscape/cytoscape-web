# Implementation Checklist — Phase 3: Sample Code and Developer Documentation

> Track progress for Phase 3. Mark `[x]` when complete.
>
> Phase 2 checklist: [implementation-checklist-phase2.md](implementation-checklist-phase2.md)

_Goal: Make it easy for third-party developers to build, test, and publish Cytoscape Web apps._

**Dependency note:** Requires Phase 2 to be complete. `ResourceApi`, `AppIdContext`, `AppContextApis`, per-app factory pattern, and all example app migrations must be in place.

---

## Step 3.0: App Developer Guide

### 3.0.1 — Create standalone App Developer Guide

- [ ] Create `cytoscape-web-app-examples/docs/APP_DEVELOPER_GUIDE.md`
- [ ] Cover: prerequisites (Node.js LTS, host repo, workspace setup)
- [ ] Cover: clone both repos, `npm install`, `npm run dev`, verify at `localhost:5500`
- [ ] Cover: copy `project-template/`, rename, change federation name/port
- [ ] Cover: register app in `apps.local.json`
- [ ] Cover: verify in browser (App Settings → enable → see panel/menu)
- [ ] Cover: first API call (`useWorkspaceApi().getWorkspaceInfo()`)
- [ ] Cover: first event listener (`useCyWebEvent('network:switched', ...)`)
- [ ] Cover: context menu registration in `mount()` via `context.apis.contextMenu`
- [ ] Cover: deploy considerations (production URL, `apps.json`)

### 3.0.2 — Update examples root README

- [ ] Replace `components` pattern with `resources[]` as primary in App Entry Point section
- [ ] Mark `components` as deprecated backward-compatible fallback
- [ ] Add `useAppContext()` section for in-component API access
- [ ] Add link to App Developer Guide
- [ ] Update "Which Example to Read" table

### 3.0.3 — Align tsconfig setup documentation

- [ ] Align `packages/api-types/README.md` and `examples/README.md` to recommend the same approach
- [ ] Recommend `"types": ["@cytoscape-web/api-types"]` in `compilerOptions`

### 3.0.4 — Create Migration Guide

- [ ] Create `cytoscape-web-app-examples/docs/MIGRATION_GUIDE.md`
- [ ] Document `components[]` → `resources[]` mapping (`ComponentType.Panel` → `slot: 'right-panel'`, etc.)
- [ ] Document `useContextMenuApi()` → `useAppContext().apis.contextMenu`
- [ ] Document `cyweb/ContextMenuApi` import → `cyweb/AppIdContext` import
- [ ] Document individual component exposes no longer needed (only `./AppConfig`)
- [ ] Include before/after code examples

---

## Step 3.1: API Reference Documentation

### 3.1.1 — Add ResourceApi section to Api.md

- [ ] Add full `ResourceApi` section following existing format
- [ ] Document types: `ResourceSlot`, `PanelHostProps`, `MenuItemHostProps`
- [ ] Document types: `RegisterPanelOptions`, `RegisterMenuItemOptions`, `RegisterResourceEntry`
- [ ] Document types: `RegisteredResourceInfo`, `ResourceVisibilityResult`, `ResourceDeclaration`
- [ ] Document all 9 methods: `getSupportedSlots`, `registerPanel`, `unregisterPanel`, `registerMenuItem`, `unregisterMenuItem`, `unregisterAll`, `registerAll`, `getRegisteredResources`, `getResourceVisibility`
- [ ] Include declarative (`resources[]`) and imperative (`mount()`) usage examples

### 3.1.2 — Add RESOURCE_NOT_FOUND to error codes table

- [ ] Add `ResourceNotFound` / `'RESOURCE_NOT_FOUND'` to error codes table in Api.md

### 3.1.3 — Document AppIdContext / useAppContext()

- [ ] Add section for `useAppContext()` from `cyweb/AppIdContext`
- [ ] Document return type: `AppContext | null`
- [ ] Document `AppContextApis` (extends `CyWebApiType` with `resource` and per-app `contextMenu`)
- [ ] Include usage example

### 3.1.4 — Update App Lifecycle section for AppContextApis

- [ ] Change `AppContext.apis` type from `CyWebApiType` to `AppContextApis`
- [ ] Add `resources?: ResourceDeclaration[]` to `CyAppWithLifecycle` listing
- [ ] Update example to use `resources[]` pattern instead of `ComponentType`
- [ ] Note `AppContextApis` extends `CyWebApiType` with `resource` and per-app `contextMenu`

### 3.1.5 — Document window.CyWebApi resource limitation

- [ ] Add note: `window.CyWebApi.resource` is `undefined`
- [ ] Clarify: `ResourceApi` is only available via `AppContext.apis.resource` in `mount()` or `useAppContext()`

---

## Step 3.2: Enriched Examples

### 3.2.1 — Migrate network-workflows to Phase 2

- [ ] Replace `components[]` with `resources[]` + `lazy()` imports in `NetworkWorkflowsApp.tsx`
- [ ] Remove individual exposes from `webpack.config.js` (keep only `'./AppConfig'`)
- [ ] Verify all 3 components render correctly via `resources[]`

### 3.2.2 — Add ViewportApi example to hello-world

- [ ] Create `hello-world/src/components/ViewportSection.tsx`
- [ ] Demo: "Fit to viewport" button (`viewportApi.fit()`)
- [ ] Demo: display/update node positions (`getNodePositions()`, `updateNodePositions()`)

### 3.2.3 — Add TableApi example to hello-world

- [ ] Create `hello-world/src/components/TableSection.tsx`
- [ ] Demo: read row from node table (`tableApi.getRow()`)
- [ ] Demo: set cell value (`tableApi.setValue()`)
- [ ] Demo: create column (`tableApi.createColumn()`)

### 3.2.4 — Add ExportApi example to hello-world

- [ ] Create `hello-world/src/components/ExportSection.tsx`
- [ ] Demo: "Export to CX2" button (`exportApi.exportToCx2()`)
- [ ] Demo: display CX2 JSON or trigger download

### 3.2.5 — Add ElementApi example to hello-world

- [ ] Create `hello-world/src/components/ElementSection.tsx`
- [ ] Demo: create node with `bypass` (visual property override)
- [ ] Demo: create edge between selected nodes
- [ ] Demo: delete selected elements

### 3.2.6 — Integrate new sections into HelloPanel

- [ ] Import and render ViewportSection, TableSection, ExportSection, ElementSection
- [ ] Add MUI Dividers between sections
- [ ] Total: 11 example sections (0–10)

### 3.2.7 — Update hello-world README

- [ ] Add Example 7 (ViewportApi), Example 8 (TableApi), Example 9 (ExportApi), Example 10 (ElementApi)
- [ ] Update API coverage table to show 100% coverage
- [ ] Update project structure section

### 3.2.8 — Add window.CyWebApi usage example

- [ ] Add "Non-React / Vanilla JS" section to Developer Guide
- [ ] Cover: waiting for `cywebapi:ready` event
- [ ] Cover: `window.CyWebApi.network.createNetworkFromEdgeList()` example
- [ ] Cover: event subscription via `window.addEventListener`

---

## Step 3.3: Starter Template Overhaul

### 3.3.1 — Fix id/federation name mismatch

- [ ] Align `TemplateApp.tsx` `id` with `webpack.config.js` federation `name`
- [ ] Choose consistent placeholder (e.g., `'myApp'`) with clear TODO comment

### 3.3.2 — Add TODO markers

- [ ] Add `// TODO: Change app id and name` to `TemplateApp.tsx`
- [ ] Add `// TODO: Change federation name and port` to `webpack.config.js`
- [ ] Add `// TODO: Change package name` to `package.json`

### 3.3.3 — Update project-template README

- [ ] Document id/federation name must match
- [ ] Add `@cytoscape-web/api-types` setup for standalone projects
- [ ] Add links to hello-world for advanced patterns
- [ ] Note `resources[]` as recommended approach

---

## Step 3.4: Package Documentation

### 3.4.1 — Fix api-types README typo

- [ ] Fix `api.network.getCurrentNetwork()` → `api.workspace.getCurrentNetworkId()`

### 3.4.2 — Create CHANGELOG.md

- [ ] Create `packages/api-types/CHANGELOG.md`
- [ ] Document: `0.1.0-alpha.0` (Phase 0), `alpha.1-3` (Phase 1), `alpha.4` (Phase 2)
- [ ] Add placeholder for future stable `0.1.0`

---

## Step 3.5: Cross-cutting Updates

### 3.5.1 — Update examples CLAUDE.md

- [ ] Update CyApp Config section: `resources[]` as primary, `components` as deprecated
- [ ] Note `remotes.d.ts` no longer needed with `@cytoscape-web/api-types`
- [ ] Mark raw store imports as deprecated in API Usage Patterns section

### 3.5.2 — Rewrite patterns/README.md

- [ ] Replace all deprecated raw store patterns with App API hook patterns
- [ ] Add patterns for: ViewportApi, TableApi, ExportApi, ElementApi, ResourceApi, ContextMenuApi

### 3.5.3 — Clean up design/apps/README.md

- [ ] Remove references to non-existent `simple-menu/`, `simple-panel/`

---

## Final Verification

### Build & Test

- [ ] `npm run build` succeeds (host)
- [ ] `npm run test:unit` passes (host)
- [ ] `npm run build` succeeds (all example apps)
- [ ] `npx tsc --noEmit` passes (all example apps)

### Manual Testing

- [ ] hello-world: all 11 sections functional (ViewportApi, TableApi, ExportApi, ElementApi added)
- [ ] network-workflows: resources[] pattern, all 3 components render
- [ ] project-template: panel + menu item + context menu work from template

### Documentation Review

- [ ] Api.md covers all implemented APIs including ResourceApi
- [ ] App Developer Guide: new developer can create working app from scratch
- [ ] Migration Guide: Phase 1 app can be migrated to Phase 2 following the guide
- [ ] hello-world README matches all example sections
