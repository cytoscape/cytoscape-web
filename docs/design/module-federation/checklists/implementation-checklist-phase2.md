# Implementation Checklist — Phase 2: App Resource Runtime Registration

> Track progress for Phase 2. Mark `[x]` when complete. Run verification after each step.
>
> Phase 1 checklist: [implementation-checklist-phase1.md](implementation-checklist-phase1.md)

_Design: [app-resource-registration-specification.md](../specifications/app-resource-registration-specification.md) — full spec including slot model, lifecycle, cleanup, and testing patterns_

**Dependency note:** Requires Phase 1g (App Lifecycle) and Phase 1h (Context Menu API) to be complete. `AppContext`, `CyAppWithLifecycle`, `mountApp`/`unmountApp`, `ContextMenuItemStore`, and `contextMenuApi` must all exist before this phase begins.

---

## Step 2.0: Foundation — Types, Models, and Store

_Design: §6.1, §6.5, §8.1, §8.5_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/app-api/types/ApiResult.ts` | Add `ResourceNotFound` error code |
| `src/app-api/types/AppContext.ts` | Existing `AppContext`, `CyAppWithLifecycle` — will be modified |
| `src/app-api/types/index.ts` | Barrel export — will add new app resource types |
| `src/models/AppModel/CyApp.ts` | `CyApp` interface — will make `components` optional, add `resources` |
| `src/models/StoreModel/ContextMenuItemStoreModel.ts` | Reference for store model pattern |
| `src/data/hooks/stores/ContextMenuItemStore.ts` | Reference for store implementation pattern |

### Deliverables — Types

- [x] Create `src/app-api/types/AppResourceTypes.ts`:
  - `ResourceSlot` type: `'right-panel' | 'apps-menu'`
  - `PanelHostProps` interface (empty in first rollout)
  - `MenuItemHostProps` interface (`handleClose: () => void`)
  - `RegisterPanelOptions` interface
  - `RegisterMenuItemOptions` interface (includes `closeOnAction?: boolean`)
  - `RegisterResourceEntry` interface (for batch `registerAll`)
  - `RegisteredResourceInfo` interface (for `getRegisteredResources`)
  - `ResourceVisibilityResult` interface (for `getResourceVisibility`)
  - `ResourceDeclaration` interface (for declarative `resources` field, §6.7.1)
  - `ResourceApi` interface (full public API resource)
- [x] Modify `src/app-api/types/ApiResult.ts` — add `ResourceNotFound = 'RESOURCE_NOT_FOUND'` to `ApiErrorCode`
- [x] Modify `src/app-api/types/index.ts` — re-export all new types from `AppResourceTypes.ts`

### Deliverables — Model

- [x] Create `src/models/AppModel/RegisteredAppResource.ts`:
  - `ResourceSlot` (re-exported from `AppResourceTypes.ts` or duplicated in model layer)
  - `RegisteredAppResource` interface with fields: `id`, `appId`, `slot`, `title?`, `order?`, `group?`, `requires?`, `component: unknown`, `errorFallback?: unknown`, `closeOnAction?: boolean`

### Deliverables — Store Model

- [x] Create `src/models/StoreModel/AppResourceStoreModel.ts`:
  - `AppResourceState` interface: `readonly resources: RegisteredAppResource[]`
  - `AppResourceActions` interface: `upsertResource`, `removeResource`, `hasResource`, `removeAllByAppId`
  - `AppResourceStore` type: `AppResourceState & AppResourceActions`

### Deliverables — Store Implementation

- [x] Create `src/data/hooks/stores/AppResourceStore.ts`:
  - Zustand store with Immer middleware (no persistence — runtime only)
  - `upsertResource(resource)`: insert or replace by `(appId, slot, id)` triple
  - `removeResource(appId, slot, id)`: remove by identity triple
  - `hasResource(appId, slot, id)`: boolean check
  - `removeAllByAppId(appId)`: filter out all resources matching appId
- [x] Create `src/data/hooks/stores/AppResourceStore.spec.ts` — store tests:
  - Upsert inserts on first call
  - Upsert replaces on second call with same identity (preserves array length)
  - `removeResource` removes the correct resource
  - `hasResource` returns true/false correctly
  - `removeAllByAppId` removes only resources for the specified app
  - `removeAllByAppId` does not affect resources from other apps

### Verification (Step 2.0)

- [x] `npm run lint` passes
- [x] `npm run test:unit -- --testPathPattern="AppResourceStore"` passes
- [x] `npm run build` succeeds

---

## Step 2.1: App Cleanup Registry

_Design: §6.4.1_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/data/hooks/stores/appLifecycle.ts` | Existing cleanup logic — will be refactored |
| `src/data/hooks/stores/ContextMenuItemStore.ts` | Will register its cleanup function |

### Deliverables

- [x] Create `src/data/hooks/stores/AppCleanupRegistry.ts`:
  - `registerAppCleanup(fn: (appId: string) => void): void`
  - `cleanupAllForApp(appId: string): void` — calls all registered fns, catches errors per-fn
- [x] Modify `src/data/hooks/stores/AppResourceStore.ts` — add module-level `registerAppCleanup` call:
  `registerAppCleanup((appId) => useAppResourceStore.getState().removeAllByAppId(appId))`
- [x] Modify `src/data/hooks/stores/ContextMenuItemStore.ts`:
  - Add `removeAllByAppId(appId: string)` action (skips items with `appId === undefined`)
  - Add module-level `registerAppCleanup` call
- [x] Modify `src/models/StoreModel/ContextMenuItemStoreModel.ts`:
  - Add `appId?: string` to `RegisteredContextMenuItem`
  - Add `removeAllByAppId(appId: string): void` to `ContextMenuItemActions`
- [x] Modify `src/data/hooks/stores/appLifecycle.ts`:
  - Replace hardcoded per-store cleanup calls with `cleanupAllForApp(appId)` from `AppCleanupRegistry`
- [x] Create `src/data/hooks/stores/AppCleanupRegistry.test.ts`:
  - `cleanupAllForApp` calls all registered functions
  - One failing cleanup does not prevent others from running
  - `cleanupAllForApp` with no registered functions does not throw

### Verification (Step 2.1)

- [x] `npm run lint` passes
- [x] `npm run test:unit -- --testPathPattern="AppCleanupRegistry"` passes
- [x] `npm run build` succeeds

---

## Step 2.2: Core App Resource API

_Design: §6.2.1–§6.2.3, §6.2.5–§6.2.6_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/app-api/core/contextMenuApi.ts` | Reference for factory pattern |
| `src/app-api/core/index.ts` | `CyWebApi` assembly — will be modified |
| `src/data/hooks/stores/AppStore.ts` | `AppStatus` — needed for visibility evaluation |

### Deliverables

- [x] Create `src/app-api/core/resourceApi.ts` — per-app factory:
  - `createResourceApi(appId: string): ResourceApi`
  - `getSupportedSlots()` → `['right-panel', 'apps-menu']`
  - `registerPanel(options)` → `ApiResult<{ resourceId }>`:
    - Validate `id` non-empty
    - Validate `component` is a function (`typeof === 'function'`)
    - Call `useAppResourceStore.getState().upsertResource(...)` (upsert semantics)
    - Return `ok({ resourceId: '${appId}::right-panel::${id}' })`
  - `unregisterPanel(panelId)` → `ApiResult`:
    - Check existence via `hasResource`
    - If not found → `fail(ResourceNotFound)`
    - Call `removeResource`
  - `registerMenuItem(options)` → `ApiResult<{ resourceId }>` (mirrors `registerPanel` with `slot: 'apps-menu'`)
  - `unregisterMenuItem(menuItemId)` → `ApiResult` (mirrors `unregisterPanel`)
  - `unregisterAll()` → `ApiResult`:
    - Call `removeAllByAppId(appId)`
  - `registerAll(entries)` → `ApiResult<{ registered, errors }>`:
    - Iterate entries, delegate to `registerPanel`/`registerMenuItem` per slot
    - Unsupported slots → push to `errors` array, log warning
    - Always return `ok({ registered, errors })`
  - `getRegisteredResources()` → `RegisteredResourceInfo[]`:
    - Filter resources by factory-bound `appId`
  - `getResourceVisibility(id)` → `ResourceVisibilityResult`:
    - Check registration, app-active state, `requires.network`, `requires.selection`
- [x] Create `src/app-api/core/resourceApi.test.ts` — plain Jest tests:
  - `getSupportedSlots` returns `['right-panel', 'apps-menu']`
  - `registerPanel` with valid options returns `ok` with correct `resourceId`
  - `registerPanel` with empty `id` returns `fail(InvalidInput)`
  - `registerPanel` with non-function `component` returns `fail(InvalidInput)`
  - `registerPanel` with same `id` upserts (replaces) — no error
  - `unregisterPanel` with existing panel returns `ok`
  - `unregisterPanel` with unknown panel returns `fail(ResourceNotFound)`
  - `registerMenuItem` mirrors `registerPanel` behavior for `apps-menu` slot
  - `unregisterAll` delegates to `removeAllByAppId` with bound `appId`
  - `registerAll` registers multiple resources; failed entries are skipped but logged
  - `registerAll` with unsupported slot pushes error but does not block others
  - `getRegisteredResources` returns only resources for the bound `appId`
  - `getResourceVisibility` returns correct `hiddenReason` for each case

### Verification (Step 2.2)

- [x] `npm run lint` passes
- [x] `npm run test:unit -- --testPathPattern="resourceApi"` passes
- [x] `npm run build` succeeds

---

## Step 2.3: Context Menu Factory Refactor

_Design: §6.6.0, §6.6.1, §6.6.3, §8.3_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/app-api/core/contextMenuApi.ts` | Existing singleton — refactor to factory + anonymous singleton |
| `src/app-api/useContextMenuApi.ts` | Will be **deleted** |
| `src/app-api/useContextMenuApi.test.ts` | Will be **deleted** |
| `src/app-api/index.ts` | Remove barrel export for `useContextMenuApi` |
| `webpack.config.js` | Remove `'./ContextMenuApi'` expose |
| `packages/api-types/src/mf-declarations.d.ts` | Remove `cyweb/ContextMenuApi` declaration |

### Deliverables — API refactor

- [x] Modify `src/app-api/core/contextMenuApi.ts`:
  - Add shared `validateAndRegister(config, appId?)` helper
  - Add shared `removeItem(itemId)` helper
  - Export `createContextMenuApi(appId: string): ContextMenuApi` — per-app factory, stores `appId` on items
  - Export `contextMenuApi: ContextMenuApi` — anonymous singleton (no `appId`), for `window.CyWebApi` only
- [x] Update `src/app-api/core/contextMenuApi.test.ts`:
  - Factory: `addContextMenuItem` stores `appId` on registered items
  - Factory: `removeContextMenuItem` works as before
  - Anonymous: `addContextMenuItem` stores no `appId` (undefined)
  - `ContextMenuItemStore.removeAllByAppId` removes only items with matching `appId`
  - `removeAllByAppId` does not remove anonymous items (`appId === undefined`)
  - Existing validation preserved: empty label → `fail(InvalidInput)`, omitted `targetTypes` → defaults, unknown `itemId` → `fail(ContextMenuItemNotFound)`

### Deliverables — Delete `useContextMenuApi` hook and expose

- [x] Delete `src/app-api/useContextMenuApi.ts`
- [x] Delete `src/app-api/useContextMenuApi.test.ts`
- [x] Modify `src/app-api/index.ts` — remove `useContextMenuApi` barrel export
- [x] Modify `webpack.config.js` — remove `'./ContextMenuApi'` expose entry
- [x] Modify `packages/api-types/src/mf-declarations.d.ts` — remove `declare module 'cyweb/ContextMenuApi'`

### Deliverables — Documentation updates (§8.3)

- [x] Modify `packages/api-types/README.md`:
  - Remove `useContextMenuApi` import code example
  - Remove `cyweb/ContextMenuApi` row from remotes table
- [x] Modify `src/app-api/api_docs/Api.md`:
  - Remove `cyweb/ContextMenuApi` table row
  - Rewrite ContextMenuApi section to reference `AppContext.apis.contextMenu` and `useAppContext().apis.contextMenu`
- [x] Modify `src/app-api/CLAUDE.md`:
  - Remove `useContextMenuApi.ts` from file-tree listing
  - Remove `'./ContextMenuApi'` from webpack exposes listing
  - Add `AppIdContext.tsx` to file-tree listing
  - Add `'./AppIdContext'` to webpack exposes listing
- [x] Modify `docs/design/module-federation/specifications/app-api-specification.md` — update contextMenuApi/useContextMenuApi references to reflect factory pattern
- [x] Modify `docs/design/module-federation/module-federation-design.md` — update `cyweb/ContextMenuApi` references to new access pattern

### Deliverables — Update Phase 1 checklist (§8.3.1)

- [x] Modify `docs/design/module-federation/checklists/implementation-checklist-phase1.md`:
  - Remove or strike through task for creating `src/app-api/useContextMenuApi.ts`
  - Remove or strike through task for creating `src/app-api/useContextMenuApi.test.ts`
  - Remove `ContextMenuApi` from "12 webpack exposes" final verification item
  - Update `AppContext.apis` verification item: `CyWebApiType` → `AppContextApis`

### Verification (Step 2.3)

- [x] `npm run lint` passes
- [x] `npm run test:unit -- --testPathPattern="contextMenuApi"` passes
- [x] `npm run build` succeeds
- [x] `import { useContextMenuApi } from 'cyweb/ContextMenuApi'` would cause a TypeScript error (module no longer exists)

---

## Step 2.4: AppIdContext and Type Model

_Design: §6.2.4, §6.2.6_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/app-api/types/AppContext.ts` | Will add `AppContextApis` type |
| `src/app-api/core/index.ts` | `CyWebApiType` — verify it does NOT get `resource` field |
| `packages/api-types/src/index.ts` | Window declaration — will be updated |
| `packages/api-types/src/CyWebApi.ts` | Will re-export `AppContextApis` |

### Deliverables

- [x] Create `src/app-api/AppIdContext.tsx`:
  - `AppIdContextValue` interface: `{ readonly appId: string; readonly apis: AppContextApis }`
  - `AppIdContext` via `createContext<AppIdContextValue | null>(null)`
  - `useAppContext()` hook: returns `AppIdContextValue | null`
  - `AppIdProvider` export (the `.Provider`)
- [x] Modify `src/app-api/types/AppContext.ts`:
  - Create `AppContextApis` interface extending `CyWebApiType`:
    - `readonly resource: ResourceApi` (required)
    - `readonly contextMenu: ContextMenuApi` (required — per-app factory instance)
  - Change `AppContext.apis` type from `CyWebApiType` to `AppContextApis`
  - Update JSDoc: `apis` is per-app, NOT the same object as `window.CyWebApi`
- [x] Modify `src/app-api/core/index.ts`:
  - Ensure `CyWebApiType` does NOT include `resource` field
  - `window.CyWebApi` assignment uses the anonymous `contextMenuApi` singleton
- [x] Modify `src/app-api/types/index.ts` — re-export `AppContextApis`
- [x] Modify `packages/api-types/src/index.ts`:
  - Declare `window.CyWebApi` as `CyWebApiType` directly (no `Omit`)
- [x] Modify `packages/api-types/src/CyWebApi.ts`:
  - Re-export `AppContextApis` alongside `CyWebApiType`
  - Update file header comment explaining the two-type model
- [x] Modify `packages/api-types/src/mf-declarations.d.ts`:
  - Add `declare module 'cyweb/AppIdContext'` declaration
- [x] Modify `webpack.config.js` — add `'./AppIdContext': './src/app-api/AppIdContext.tsx'` expose

### Verification (Step 2.4)

- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] `npm run build:api-types` succeeds
- [x] TypeScript check: `AppContext.apis.resource.registerPanel(...)` has no type error
- [x] TypeScript check: `window.CyWebApi.resource` causes a type error

---

## Step 2.5: App Lifecycle Integration

_Design: §6.4.0, §6.4.2–§6.4.3, §6.7.1–§6.7.2_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/data/hooks/stores/useAppManager.ts` | App loading loop — injection point for lifecycle and declarative resources |
| `src/data/hooks/stores/appLifecycle.ts` | `mountApp`, `unmountApp` — will be updated |
| `src/models/AppModel/CyApp.ts` | Add `resources` field, make `components` optional |

### Deliverables — CyApp model changes

- [x] Modify `src/models/AppModel/CyApp.ts`:
  - Mark `components` as optional with `@deprecated` JSDoc
  - Add `resources?: ResourceDeclaration[]` to `CyAppWithLifecycle` (type-only import from `AppResourceTypes.ts`)

### Deliverables — Lifecycle functions

- [x] Modify `src/data/hooks/stores/appLifecycle.ts`:
  - Export `mountApp(cyApp, context, mountedApps)` as specified in §6.4.0:
    - Early return for apps without `mount()` — adds to `mountedApps` immediately
    - Duration warning if `mount()` > 100ms
    - On failure: call `cleanupAllForApp(cyApp.id)`, log error, re-throw
  - Export `unmountApp(cyApp, mountedApps)` as specified in §6.4.3:
    - Skip if not in `mountedApps`
    - Call `cleanupAllForApp(cyApp.id)` BEFORE calling `unmount()` (so UI is clean even if unmount throws)
    - Call `unmount()` if defined, catch and log errors
  - Export `unmountAllApps(appRegistry, mountedApps)` — iterates and delegates to `unmountApp`

### Deliverables — useAppManager integration

- [x] Modify `src/data/hooks/stores/useAppManager.ts`:
  - Import `createResourceApi` and `createContextMenuApi`
  - Construct per-app API object: `{ ...CyWebApi, resource: createResourceApi(cyApp.id), contextMenu: createContextMenuApi(cyApp.id) }`
  - Store per-app apis in `Map<string, AppContextApis>` ref (for `AppIdProvider`)
  - After `registerApp(cyApp)`: if `cyApp.resources` is defined, create a `resourceApi` and register each entry via `registerPanel`/`registerMenuItem` (§6.7.1)
  - Pass per-app API object as `AppContext.apis` to `mountApp`
  - Add `mountedApps` ref (`Set<string>`) to track mounted apps
  - Add `beforeunload` listener calling `unmountAllApps`
  - Guard `CyApp.components` iteration against `undefined` (`app.components ?? []`)

### Deliverables — Tests

- [x] Create or update `src/data/hooks/stores/appLifecycle.test.ts`:
  - `mountApp` calls `mount()` with `{ appId, apis }` when app implements `mount`
  - `mountApp` does NOT call `mount()` when app has no `mount` method
  - `mountApp` adds app to `mountedApps` on success (both with and without `mount`)
  - `mountApp` calls `cleanupAllForApp` when `mount()` throws
  - `mountApp` logs warning when `mount()` takes > 100ms
  - `unmountApp` calls `cleanupAllForApp` BEFORE calling `unmount()`
  - `unmountApp` skips apps not in `mountedApps`
  - `unmountApp` catches and logs errors from `unmount()`
  - Apps without `mount()` are treated as mounted immediately

### Verification (Step 2.5)

- [x] `npm run lint` passes
- [x] `npm run test:unit -- --testPathPattern="appLifecycle"` passes
- [x] `npm run build` succeeds

---

## Step 2.6: PluginErrorBoundary

_Design: §6.3.4_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/features/ErrorHandler/ErrorHandler.tsx` | Existing `react-error-boundary` usage — follow same pattern |

### Deliverables

- [x] Create `src/features/AppManager/PluginErrorBoundary.tsx`:
  - Uses `react-error-boundary` `ErrorBoundary` component (not a new class component)
  - Props: `appId`, `slot`, `children`, `customFallback?`
  - Default fallback: `PluginFallback` — minimal UI showing `appId` and `slot`
  - On error: log via `logApp.error` with app ID, slot, and error info
  - If `customFallback` is provided, use it instead of the host default

### Verification (Step 2.6)

- [x] `npm run lint` passes
- [x] `npm run build` succeeds

---

## Step 2.7: Host Renderer Updates — Right Panel

_Design: §6.3.1–§6.3.3_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/features/Workspace/SidePanel/SidePanel.tsx` | Tab selection — switch to resource-identity-based selection (§6.3.2) |
| `src/features/Workspace/SidePanel/TabContents.tsx` | Panel rendering — merge manifest + runtime resources |

### Deliverables — SidePanel.tsx (stable tab selection)

- [x] Replace `useState(0)` numeric tab index with `useState<string | null>(null)` resource-identity-based selection (§6.3.2)
- [x] Use `'__builtin__::right-panel::sub-network-viewer'` as reserved identity for built-in tab
- [x] Rendering logic:
  - Build ordered, visibility-filtered array of resources
  - Find index of `selectedResourceId` in array
  - If not found → fall back to index 0, update `selectedResourceId`
  - Pass resolved index to MUI `<Tabs value={resolvedIndex}>`

### Deliverables — TabContents.tsx (merge manifest + runtime resources)

- [x] Read `AppResourceStore` (filter by `slot: 'right-panel'`) in addition to `CyApp.components`
- [x] Apply rendering rules (§6.3.1):
  - Runtime resources rendered only when app is active
  - Evaluate `requires.network`: skip when no network is loaded
  - Runtime resource wins when same `(appId, slot, id)` exists in both manifest and runtime
  - Sort by `order` (ascending, `undefined` last), then registration order for ties
- [x] Wrap each plugin resource in `AppIdProvider` (outermost) → `PluginErrorBoundary` → `Suspense`:
  ```
  <AppIdProvider value={{ appId, apis }}>
    <PluginErrorBoundary appId={...} slot="right-panel" customFallback={...}>
      <Suspense fallback={<PanelLoadingFallback />}>
        <PanelComponent />
      </Suspense>
    </PluginErrorBoundary>
  </AppIdProvider>
  ```
- [x] Expose `resourceId` alongside each rendered panel for identity tracking

### Verification (Step 2.7)

- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] Manual: existing manifest-only panels still render correctly
- [x] Manual: runtime-registered panel appears in the side panel tab strip
- [x] Manual: selecting a panel, then adding a new panel before it, keeps the original panel selected

---

## Step 2.8: Host Renderer Updates — Apps Menu

_Design: §6.3.1, §6.3.3, §6.1.2_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/features/ToolBar/AppMenu/index.tsx` | Menu rendering — merge manifest + runtime resources, implement closeOnAction |

### Deliverables

- [x] Read `AppResourceStore` (filter by `slot: 'apps-menu'`) in addition to `CyApp.components`
- [x] Apply same rendering rules as right-panel (§6.3.1): active check, `requires.network`, ordering
- [x] Wrap each menu resource in `AppIdProvider` → `PluginErrorBoundary`:
  ```
  <AppIdProvider value={{ appId, apis }}>
    <PluginErrorBoundary appId={...} slot="apps-menu" customFallback={...}>
      <MenuComponent handleClose={handleClose} />
    </PluginErrorBoundary>
  </AppIdProvider>
  ```
- [x] Implement `closeOnAction` (§6.1.2):
  - When `closeOnAction: true` — wrap component in a `<div>` with click handler that calls `queueMicrotask(() => handleClose())`
  - When `closeOnAction: false` (default) — plugin calls `handleClose` manually

### Verification (Step 2.8)

- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] Manual: existing manifest-only menu items still render correctly
- [x] Manual: runtime-registered menu item appears in the Apps dropdown
- [x] Manual: menu item with `closeOnAction: true` auto-closes the dropdown after action

---

## Step 2.9: Example App Migration

_Design: §6.6.4, §6.7.1, §8.3.1, §8.7_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `cytoscape-web-app-examples/hello-world/` | Migrate to `useAppContext()` pattern |
| `cytoscape-web-app-examples/project-template/` | Migrate to declarative `resources` or `mount()` pattern |
| `cytoscape-web-app-examples/network-workflows/` | Check if any context menu usage needs migration |

### Deliverables

- [x] Migrate `hello-world`:
  - Migrate `ContextMenuSection.tsx` from `useContextMenuApi()` to `useAppContext()` pattern (§6.2.4)
  - Update `AppConfig` to use `resources` declarative field or `mount()` registration where appropriate
- [x] Migrate `project-template`:
  - Migrate `TemplateContextMenuExample.tsx` from `useContextMenuApi()` to `useAppContext()` pattern
  - Remove `import { useContextMenuApi } from 'cyweb/ContextMenuApi'`
  - Update `AppConfig` to use `resources` declarative field (Path A, §8.7)
- [x] Verify all example apps build: `cd cytoscape-web-app-examples && npm run build` (or per-app builds)

### Verification (Step 2.9)

- [x] All example apps build without errors
- [x] No remaining imports of `useContextMenuApi` or `cyweb/ContextMenuApi` in example apps

---

## Final Verification (All Phase 2 Steps Complete)

### Build & Lint

- [x] `npm run lint` — zero errors
- [x] `npm run test:unit` — all tests pass
- [x] `npm run build` — production build succeeds
- [x] `npm run build:api-types` — api-types package builds successfully

### Webpack Exposes

- [x] `'./AppIdContext'` expose entry present in `webpack.config.js`
- [x] `'./ContextMenuApi'` expose entry removed from `webpack.config.js`
- [x] All other existing exposes remain intact (backward compatible)

### Type System

- [x] `AppContext.apis` typed as `AppContextApis` (distinct from `CyWebApiType`; `resource` is required)
- [x] `window.CyWebApi` typed as `CyWebApiType` (no `resource` field)
- [x] `window.CyWebApi.resource` is `undefined` at runtime
- [x] `AppContext.apis.resource.registerPanel(...)` has no TypeScript error
- [x] `window.CyWebApi.resource` causes a TypeScript error

### App Resource Registration

- [x] Runtime-registered panel appears without a `CyApp.components` declaration
- [x] Runtime-registered menu item appears without a `CyApp.components` declaration
- [x] `getSupportedSlots()` returns `['right-panel', 'apps-menu']`
- [x] Upsert: re-registering a panel with a new `title` updates without changing `resourceId`
- [x] `registerAll()` registers multiple resources; failed entries are skipped but logged
- [x] `getRegisteredResources()` returns only resources for the calling app
- [x] `getResourceVisibility()` returns correct `hiddenReason` for each condition
- [x] `registerPanel({ component: 'notAFunction' })` returns `fail(InvalidInput)`
- [x] An app cannot register a resource under another app's `appId` (factory-bound)

### Declarative Resources

- [x] An app with `resources: [...]` and no `mount()` renders all declared resources
- [x] An app with both `resources` and `mount()` sees declarative resources first; `mount()` can upsert over them

### Visibility & Error Isolation

- [x] Panel with `requires.network = true` is hidden when no network is loaded
- [x] Panel with `requires.network = true` is visible when a network is loaded
- [x] Broken panel component is contained by `PluginErrorBoundary` — other panels continue to render
- [x] Custom `errorFallback` is displayed when provided (not the host default)
- [x] Selected tab moves to first visible panel when current panel is hidden by `requires.network`
- [x] Selecting a panel, then adding a new panel before it, keeps the original panel selected

### Menu Item `closeOnAction`

- [x] Menu item with `closeOnAction: true` auto-closes dropdown after action
- [x] Menu item with `closeOnAction: false` (default) requires plugin to call `handleClose`

### Lifecycle & Cleanup

- [x] Disabling an app removes all of its runtime resources immediately
- [x] Re-enabling an app re-registers its resources correctly
- [x] Failed `mount()` does not leave orphaned panels or menu items
- [x] `cleanupAllForApp(appId)` invokes all registered cleanup functions
- [x] One failing cleanup does not prevent others from running
- [x] Adding a new store with `registerAppCleanup` requires no changes to `appLifecycle.ts`

### Context Menu Unified Design

- [x] Disabling an app removes its context menu items (via `removeAllByAppId`)
- [x] Context menu items registered by app A are not removed when app B is disabled
- [x] Items registered via `AppContext.apis.contextMenu` carry the correct `appId`
- [x] `window.CyWebApi.contextMenu` (anonymous) registers items with `appId === undefined`
- [x] `removeAllByAppId` does not remove anonymous items
- [x] `addContextMenuItem` with empty label returns `fail(InvalidInput)` (preserved)
- [x] `addContextMenuItem` with omitted `targetTypes` defaults to `['node', 'edge']` (preserved)
- [x] `removeContextMenuItem` with unknown `itemId` returns `fail(ContextMenuItemNotFound)` (preserved)

### AppIdContext

- [x] `useAppContext()` returns `{ appId, apis }` inside a plugin resource wrapped by `AppIdProvider`
- [x] `useAppContext()` returns `null` outside the provider (test isolation)

### Backward Compatibility

- [x] Existing manifest-only apps (`CyApp.components`) still render correctly
- [x] Existing apps without lifecycle methods continue to function
- [x] All legacy store exposures and task hook exposures remain present in `webpack.config.js`
- [x] `CyApp.components` is now optional — apps without it do not error

### Example Apps

- [x] `hello-world` example builds and functions with the new API
- [x] `project-template` example builds and functions with the new API
- [x] No remaining `useContextMenuApi` or `cyweb/ContextMenuApi` imports in any example app
