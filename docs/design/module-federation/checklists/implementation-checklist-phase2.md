# Implementation Checklist — Phase 2: UI Surface Runtime Registration

> Track progress for Phase 2. Mark `[x]` when complete. Run verification after each step.
>
> Phase 1 checklist: [implementation-checklist-phase1.md](implementation-checklist-phase1.md)

_Design: [ui-surface-registration-specification.md](../specifications/ui-surface-registration-specification.md) — full spec including slot model, lifecycle, cleanup, and testing patterns_

**Dependency note:** Requires Phase 1g (App Lifecycle) and Phase 1h (Context Menu API) to be complete. `AppContext`, `CyAppWithLifecycle`, `mountApp`/`unmountApp`, `ContextMenuItemStore`, and `contextMenuApi` must all exist before this phase begins.

---

## Step 2.0: Foundation — Types, Models, and Store

_Design: §6.1, §6.5, §8.1, §8.5_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/app-api/types/ApiResult.ts` | Add `SurfaceNotFound` error code |
| `src/app-api/types/AppContext.ts` | Existing `AppContext`, `CyAppWithLifecycle` — will be modified |
| `src/app-api/types/index.ts` | Barrel export — will add new UI surface types |
| `src/models/AppModel/CyApp.ts` | `CyApp` interface — will make `components` optional, add `surfaces` |
| `src/models/StoreModel/ContextMenuItemStoreModel.ts` | Reference for store model pattern |
| `src/data/hooks/stores/ContextMenuItemStore.ts` | Reference for store implementation pattern |

### Deliverables — Types

- [ ] Create `src/app-api/types/UiSurfaceTypes.ts`:
  - `UiSurfaceSlot` type: `'right-panel' | 'apps-menu'`
  - `PanelHostProps` interface (empty in first rollout)
  - `MenuItemHostProps` interface (`handleClose: () => void`)
  - `RegisterPanelOptions` interface
  - `RegisterMenuItemOptions` interface (includes `closeOnAction?: boolean`)
  - `RegisterSurfaceEntry` interface (for batch `registerAll`)
  - `RegisteredSurfaceInfo` interface (for `getRegisteredSurfaces`)
  - `SurfaceVisibilityResult` interface (for `getSurfaceVisibility`)
  - `SurfaceDeclaration` interface (for declarative `surfaces` field, §6.7.1)
  - `UiSurfaceApi` interface (full public API surface)
- [ ] Modify `src/app-api/types/ApiResult.ts` — add `SurfaceNotFound = 'SURFACE_NOT_FOUND'` to `ApiErrorCode`
- [ ] Modify `src/app-api/types/index.ts` — re-export all new types from `UiSurfaceTypes.ts`

### Deliverables — Model

- [ ] Create `src/models/AppModel/RegisteredUiSurface.ts`:
  - `UiSurfaceSlot` (re-exported from `UiSurfaceTypes.ts` or duplicated in model layer)
  - `RegisteredUiSurface` interface with fields: `id`, `appId`, `slot`, `title?`, `order?`, `group?`, `requires?`, `component: unknown`, `errorFallback?: unknown`, `closeOnAction?: boolean`

### Deliverables — Store Model

- [ ] Create `src/models/StoreModel/UiSurfaceStoreModel.ts`:
  - `UiSurfaceState` interface: `readonly surfaces: RegisteredUiSurface[]`
  - `UiSurfaceActions` interface: `upsertSurface`, `removeSurface`, `hasSurface`, `removeAllByAppId`
  - `UiSurfaceStore` type: `UiSurfaceState & UiSurfaceActions`

### Deliverables — Store Implementation

- [ ] Create `src/data/hooks/stores/UiSurfaceStore.ts`:
  - Zustand store with Immer middleware (no persistence — runtime only)
  - `upsertSurface(surface)`: insert or replace by `(appId, slot, id)` triple
  - `removeSurface(appId, slot, id)`: remove by identity triple
  - `hasSurface(appId, slot, id)`: boolean check
  - `removeAllByAppId(appId)`: filter out all surfaces matching appId
- [ ] Create `src/data/hooks/stores/UiSurfaceStore.spec.ts` — store tests:
  - Upsert inserts on first call
  - Upsert replaces on second call with same identity (preserves array length)
  - `removeSurface` removes the correct surface
  - `hasSurface` returns true/false correctly
  - `removeAllByAppId` removes only surfaces for the specified app
  - `removeAllByAppId` does not affect surfaces from other apps

### Verification (Step 2.0)

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="UiSurfaceStore"` passes
- [ ] `npm run build` succeeds

---

## Step 2.1: App Cleanup Registry

_Design: §6.4.1_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/data/hooks/stores/appLifecycle.ts` | Existing cleanup logic — will be refactored |
| `src/data/hooks/stores/ContextMenuItemStore.ts` | Will register its cleanup function |

### Deliverables

- [ ] Create `src/data/hooks/stores/AppCleanupRegistry.ts`:
  - `registerAppCleanup(fn: (appId: string) => void): void`
  - `cleanupAllForApp(appId: string): void` — calls all registered fns, catches errors per-fn
- [ ] Modify `src/data/hooks/stores/UiSurfaceStore.ts` — add module-level `registerAppCleanup` call:
  `registerAppCleanup((appId) => useUiSurfaceStore.getState().removeAllByAppId(appId))`
- [ ] Modify `src/data/hooks/stores/ContextMenuItemStore.ts`:
  - Add `removeAllByAppId(appId: string)` action (skips items with `appId === undefined`)
  - Add module-level `registerAppCleanup` call
- [ ] Modify `src/models/StoreModel/ContextMenuItemStoreModel.ts`:
  - Add `appId?: string` to `RegisteredContextMenuItem`
  - Add `removeAllByAppId(appId: string): void` to `ContextMenuItemActions`
- [ ] Modify `src/data/hooks/stores/appLifecycle.ts`:
  - Replace hardcoded per-store cleanup calls with `cleanupAllForApp(appId)` from `AppCleanupRegistry`
- [ ] Create `src/data/hooks/stores/AppCleanupRegistry.test.ts`:
  - `cleanupAllForApp` calls all registered functions
  - One failing cleanup does not prevent others from running
  - `cleanupAllForApp` with no registered functions does not throw

### Verification (Step 2.1)

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="AppCleanupRegistry"` passes
- [ ] `npm run build` succeeds

---

## Step 2.2: Core UI Surface API

_Design: §6.2.1–§6.2.3, §6.2.5–§6.2.6_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/app-api/core/contextMenuApi.ts` | Reference for factory pattern |
| `src/app-api/core/index.ts` | `CyWebApi` assembly — will be modified |
| `src/data/hooks/stores/AppStore.ts` | `AppStatus` — needed for visibility evaluation |

### Deliverables

- [ ] Create `src/app-api/core/uiSurfaceApi.ts` — per-app factory:
  - `createUiSurfaceApi(appId: string): UiSurfaceApi`
  - `getSupportedSlots()` → `['right-panel', 'apps-menu']`
  - `registerPanel(options)` → `ApiResult<{ surfaceId }>`:
    - Validate `id` non-empty
    - Validate `component` is a function (`typeof === 'function'`)
    - Call `useUiSurfaceStore.getState().upsertSurface(...)` (upsert semantics)
    - Return `ok({ surfaceId: '${appId}::right-panel::${id}' })`
  - `unregisterPanel(panelId)` → `ApiResult`:
    - Check existence via `hasSurface`
    - If not found → `fail(SurfaceNotFound)`
    - Call `removeSurface`
  - `registerMenuItem(options)` → `ApiResult<{ surfaceId }>` (mirrors `registerPanel` with `slot: 'apps-menu'`)
  - `unregisterMenuItem(menuItemId)` → `ApiResult` (mirrors `unregisterPanel`)
  - `unregisterAll()` → `ApiResult`:
    - Call `removeAllByAppId(appId)`
  - `registerAll(entries)` → `ApiResult<{ registered, errors }>`:
    - Iterate entries, delegate to `registerPanel`/`registerMenuItem` per slot
    - Unsupported slots → push to `errors` array, log warning
    - Always return `ok({ registered, errors })`
  - `getRegisteredSurfaces()` → `RegisteredSurfaceInfo[]`:
    - Filter surfaces by factory-bound `appId`
  - `getSurfaceVisibility(id)` → `SurfaceVisibilityResult`:
    - Check registration, app-active state, `requires.network`, `requires.selection`
- [ ] Create `src/app-api/core/uiSurfaceApi.test.ts` — plain Jest tests:
  - `getSupportedSlots` returns `['right-panel', 'apps-menu']`
  - `registerPanel` with valid options returns `ok` with correct `surfaceId`
  - `registerPanel` with empty `id` returns `fail(InvalidInput)`
  - `registerPanel` with non-function `component` returns `fail(InvalidInput)`
  - `registerPanel` with same `id` upserts (replaces) — no error
  - `unregisterPanel` with existing panel returns `ok`
  - `unregisterPanel` with unknown panel returns `fail(SurfaceNotFound)`
  - `registerMenuItem` mirrors `registerPanel` behavior for `apps-menu` slot
  - `unregisterAll` delegates to `removeAllByAppId` with bound `appId`
  - `registerAll` registers multiple surfaces; failed entries are skipped but logged
  - `registerAll` with unsupported slot pushes error but does not block others
  - `getRegisteredSurfaces` returns only surfaces for the bound `appId`
  - `getSurfaceVisibility` returns correct `hiddenReason` for each case

### Verification (Step 2.2)

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="uiSurfaceApi"` passes
- [ ] `npm run build` succeeds

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

- [ ] Modify `src/app-api/core/contextMenuApi.ts`:
  - Add shared `validateAndRegister(config, appId?)` helper
  - Add shared `removeItem(itemId)` helper
  - Export `createContextMenuApi(appId: string): ContextMenuApi` — per-app factory, stores `appId` on items
  - Export `contextMenuApi: ContextMenuApi` — anonymous singleton (no `appId`), for `window.CyWebApi` only
- [ ] Update `src/app-api/core/contextMenuApi.test.ts`:
  - Factory: `addContextMenuItem` stores `appId` on registered items
  - Factory: `removeContextMenuItem` works as before
  - Anonymous: `addContextMenuItem` stores no `appId` (undefined)
  - `ContextMenuItemStore.removeAllByAppId` removes only items with matching `appId`
  - `removeAllByAppId` does not remove anonymous items (`appId === undefined`)
  - Existing validation preserved: empty label → `fail(InvalidInput)`, omitted `targetTypes` → defaults, unknown `itemId` → `fail(ContextMenuItemNotFound)`

### Deliverables — Delete `useContextMenuApi` hook and expose

- [ ] Delete `src/app-api/useContextMenuApi.ts`
- [ ] Delete `src/app-api/useContextMenuApi.test.ts`
- [ ] Modify `src/app-api/index.ts` — remove `useContextMenuApi` barrel export
- [ ] Modify `webpack.config.js` — remove `'./ContextMenuApi'` expose entry
- [ ] Modify `packages/api-types/src/mf-declarations.d.ts` — remove `declare module 'cyweb/ContextMenuApi'`

### Deliverables — Documentation updates (§8.3)

- [ ] Modify `packages/api-types/README.md`:
  - Remove `useContextMenuApi` import code example
  - Remove `cyweb/ContextMenuApi` row from remotes table
- [ ] Modify `src/app-api/api_docs/Api.md`:
  - Remove `cyweb/ContextMenuApi` table row
  - Rewrite ContextMenuApi section to reference `AppContext.apis.contextMenu` and `useAppContext().apis.contextMenu`
- [ ] Modify `src/app-api/CLAUDE.md`:
  - Remove `useContextMenuApi.ts` from file-tree listing
  - Remove `'./ContextMenuApi'` from webpack exposes listing
  - Add `AppIdContext.tsx` to file-tree listing
  - Add `'./AppIdContext'` to webpack exposes listing
- [ ] Modify `docs/design/module-federation/specifications/app-api-specification.md` — update contextMenuApi/useContextMenuApi references to reflect factory pattern
- [ ] Modify `docs/design/module-federation/module-federation-design.md` — update `cyweb/ContextMenuApi` references to new access pattern

### Deliverables — Update Phase 1 checklist (§8.3.1)

- [ ] Modify `docs/design/module-federation/checklists/implementation-checklist-phase1.md`:
  - Remove or strike through task for creating `src/app-api/useContextMenuApi.ts`
  - Remove or strike through task for creating `src/app-api/useContextMenuApi.test.ts`
  - Remove `ContextMenuApi` from "12 webpack exposes" final verification item
  - Update `AppContext.apis` verification item: `CyWebApiType` → `AppContextApis`

### Verification (Step 2.3)

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="contextMenuApi"` passes
- [ ] `npm run build` succeeds
- [ ] `import { useContextMenuApi } from 'cyweb/ContextMenuApi'` would cause a TypeScript error (module no longer exists)

---

## Step 2.4: AppIdContext and Type Model

_Design: §6.2.4, §6.2.6_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/app-api/types/AppContext.ts` | Will add `AppContextApis` type |
| `src/app-api/core/index.ts` | `CyWebApiType` — verify it does NOT get `uiSurface` field |
| `packages/api-types/src/index.ts` | Window declaration — will be updated |
| `packages/api-types/src/CyWebApi.ts` | Will re-export `AppContextApis` |

### Deliverables

- [ ] Create `src/app-api/AppIdContext.tsx`:
  - `AppIdContextValue` interface: `{ readonly appId: string; readonly apis: AppContextApis }`
  - `AppIdContext` via `createContext<AppIdContextValue | null>(null)`
  - `useAppContext()` hook: returns `AppIdContextValue | null`
  - `AppIdProvider` export (the `.Provider`)
- [ ] Modify `src/app-api/types/AppContext.ts`:
  - Create `AppContextApis` interface extending `CyWebApiType`:
    - `readonly uiSurface: UiSurfaceApi` (required)
    - `readonly contextMenu: ContextMenuApi` (required — per-app factory instance)
  - Change `AppContext.apis` type from `CyWebApiType` to `AppContextApis`
  - Update JSDoc: `apis` is per-app, NOT the same object as `window.CyWebApi`
- [ ] Modify `src/app-api/core/index.ts`:
  - Ensure `CyWebApiType` does NOT include `uiSurface` field
  - `window.CyWebApi` assignment uses the anonymous `contextMenuApi` singleton
- [ ] Modify `src/app-api/types/index.ts` — re-export `AppContextApis`
- [ ] Modify `packages/api-types/src/index.ts`:
  - Declare `window.CyWebApi` as `CyWebApiType` directly (no `Omit`)
- [ ] Modify `packages/api-types/src/CyWebApi.ts`:
  - Re-export `AppContextApis` alongside `CyWebApiType`
  - Update file header comment explaining the two-type model
- [ ] Modify `packages/api-types/src/mf-declarations.d.ts`:
  - Add `declare module 'cyweb/AppIdContext'` declaration
- [ ] Modify `webpack.config.js` — add `'./AppIdContext': './src/app-api/AppIdContext.tsx'` expose

### Verification (Step 2.4)

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run build:api-types` succeeds
- [ ] TypeScript check: `AppContext.apis.uiSurface.registerPanel(...)` has no type error
- [ ] TypeScript check: `window.CyWebApi.uiSurface` causes a type error

---

## Step 2.5: App Lifecycle Integration

_Design: §6.4.0, §6.4.2–§6.4.3, §6.7.1–§6.7.2_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/data/hooks/stores/useAppManager.ts` | App loading loop — injection point for lifecycle and declarative surfaces |
| `src/data/hooks/stores/appLifecycle.ts` | `mountApp`, `unmountApp` — will be updated |
| `src/models/AppModel/CyApp.ts` | Add `surfaces` field, make `components` optional |

### Deliverables — CyApp model changes

- [ ] Modify `src/models/AppModel/CyApp.ts`:
  - Mark `components` as optional with `@deprecated` JSDoc
  - Add `surfaces?: SurfaceDeclaration[]` to `CyAppWithLifecycle` (type-only import from `UiSurfaceTypes.ts`)

### Deliverables — Lifecycle functions

- [ ] Modify `src/data/hooks/stores/appLifecycle.ts`:
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

- [ ] Modify `src/data/hooks/stores/useAppManager.ts`:
  - Import `createUiSurfaceApi` and `createContextMenuApi`
  - Construct per-app API object: `{ ...CyWebApi, uiSurface: createUiSurfaceApi(cyApp.id), contextMenu: createContextMenuApi(cyApp.id) }`
  - Store per-app apis in `Map<string, AppContextApis>` ref (for `AppIdProvider`)
  - After `registerApp(cyApp)`: if `cyApp.surfaces` is defined, create a `uiSurfaceApi` and register each entry via `registerPanel`/`registerMenuItem` (§6.7.1)
  - Pass per-app API object as `AppContext.apis` to `mountApp`
  - Add `mountedApps` ref (`Set<string>`) to track mounted apps
  - Add `beforeunload` listener calling `unmountAllApps`
  - Guard `CyApp.components` iteration against `undefined` (`app.components ?? []`)

### Deliverables — Tests

- [ ] Create or update `src/data/hooks/stores/appLifecycle.test.ts`:
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

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="appLifecycle"` passes
- [ ] `npm run build` succeeds

---

## Step 2.6: PluginErrorBoundary

_Design: §6.3.4_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/features/ErrorHandler/ErrorHandler.tsx` | Existing `react-error-boundary` usage — follow same pattern |

### Deliverables

- [ ] Create `src/features/AppManager/PluginErrorBoundary.tsx`:
  - Uses `react-error-boundary` `ErrorBoundary` component (not a new class component)
  - Props: `appId`, `slot`, `children`, `customFallback?`
  - Default fallback: `PluginFallback` — minimal UI showing `appId` and `slot`
  - On error: log via `logApp.error` with app ID, slot, and error info
  - If `customFallback` is provided, use it instead of the host default

### Verification (Step 2.6)

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

---

## Step 2.7: Host Renderer Updates — Right Panel

_Design: §6.3.1–§6.3.3_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/features/Workspace/SidePanel/SidePanel.tsx` | Tab selection — switch to surface-identity-based selection (§6.3.2) |
| `src/features/Workspace/SidePanel/TabContents.tsx` | Panel rendering — merge manifest + runtime surfaces |

### Deliverables — SidePanel.tsx (stable tab selection)

- [ ] Replace `useState(0)` numeric tab index with `useState<string | null>(null)` surface-identity-based selection (§6.3.2)
- [ ] Use `'__builtin__::right-panel::sub-network-viewer'` as reserved identity for built-in tab
- [ ] Rendering logic:
  - Build ordered, visibility-filtered array of surfaces
  - Find index of `selectedSurfaceId` in array
  - If not found → fall back to index 0, update `selectedSurfaceId`
  - Pass resolved index to MUI `<Tabs value={resolvedIndex}>`

### Deliverables — TabContents.tsx (merge manifest + runtime surfaces)

- [ ] Read `UiSurfaceStore` (filter by `slot: 'right-panel'`) in addition to `CyApp.components`
- [ ] Apply rendering rules (§6.3.1):
  - Runtime surfaces rendered only when app is active
  - Evaluate `requires.network`: skip when no network is loaded
  - Runtime surface wins when same `(appId, slot, id)` exists in both manifest and runtime
  - Sort by `order` (ascending, `undefined` last), then registration order for ties
- [ ] Wrap each plugin surface in `AppIdProvider` (outermost) → `PluginErrorBoundary` → `Suspense`:
  ```
  <AppIdProvider value={{ appId, apis }}>
    <PluginErrorBoundary appId={...} slot="right-panel" customFallback={...}>
      <Suspense fallback={<PanelLoadingFallback />}>
        <PanelComponent />
      </Suspense>
    </PluginErrorBoundary>
  </AppIdProvider>
  ```
- [ ] Expose `surfaceId` alongside each rendered panel for identity tracking

### Verification (Step 2.7)

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Manual: existing manifest-only panels still render correctly
- [ ] Manual: runtime-registered panel appears in the side panel tab strip
- [ ] Manual: selecting a panel, then adding a new panel before it, keeps the original panel selected

---

## Step 2.8: Host Renderer Updates — Apps Menu

_Design: §6.3.1, §6.3.3, §6.1.2_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/features/ToolBar/AppMenu/index.tsx` | Menu rendering — merge manifest + runtime surfaces, implement closeOnAction |

### Deliverables

- [ ] Read `UiSurfaceStore` (filter by `slot: 'apps-menu'`) in addition to `CyApp.components`
- [ ] Apply same rendering rules as right-panel (§6.3.1): active check, `requires.network`, ordering
- [ ] Wrap each menu surface in `AppIdProvider` → `PluginErrorBoundary`:
  ```
  <AppIdProvider value={{ appId, apis }}>
    <PluginErrorBoundary appId={...} slot="apps-menu" customFallback={...}>
      <MenuComponent handleClose={handleClose} />
    </PluginErrorBoundary>
  </AppIdProvider>
  ```
- [ ] Implement `closeOnAction` (§6.1.2):
  - When `closeOnAction: true` — wrap component in a `<div>` with click handler that calls `queueMicrotask(() => handleClose())`
  - When `closeOnAction: false` (default) — plugin calls `handleClose` manually

### Verification (Step 2.8)

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Manual: existing manifest-only menu items still render correctly
- [ ] Manual: runtime-registered menu item appears in the Apps dropdown
- [ ] Manual: menu item with `closeOnAction: true` auto-closes the dropdown after action

---

## Step 2.9: Example App Migration

_Design: §6.6.4, §6.7.1, §8.3.1, §8.7_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `cytoscape-web-app-examples/hello-world/` | Migrate to `useAppContext()` pattern |
| `cytoscape-web-app-examples/project-template/` | Migrate to declarative `surfaces` or `mount()` pattern |
| `cytoscape-web-app-examples/network-workflows/` | Check if any context menu usage needs migration |

### Deliverables

- [ ] Migrate `hello-world`:
  - Migrate `ContextMenuSection.tsx` from `useContextMenuApi()` to `useAppContext()` pattern (§6.2.4)
  - Update `AppConfig` to use `surfaces` declarative field or `mount()` registration where appropriate
- [ ] Migrate `project-template`:
  - Migrate `TemplateContextMenuExample.tsx` from `useContextMenuApi()` to `useAppContext()` pattern
  - Remove `import { useContextMenuApi } from 'cyweb/ContextMenuApi'`
  - Update `AppConfig` to use `surfaces` declarative field (Path A, §8.7)
- [ ] Verify all example apps build: `cd cytoscape-web-app-examples && npm run build` (or per-app builds)

### Verification (Step 2.9)

- [ ] All example apps build without errors
- [ ] No remaining imports of `useContextMenuApi` or `cyweb/ContextMenuApi` in example apps

---

## Final Verification (All Phase 2 Steps Complete)

### Build & Lint

- [ ] `npm run lint` — zero errors
- [ ] `npm run test:unit` — all tests pass
- [ ] `npm run build` — production build succeeds
- [ ] `npm run build:api-types` — api-types package builds successfully

### Webpack Exposes

- [ ] `'./AppIdContext'` expose entry present in `webpack.config.js`
- [ ] `'./ContextMenuApi'` expose entry removed from `webpack.config.js`
- [ ] All other existing exposes remain intact (backward compatible)

### Type System

- [ ] `AppContext.apis` typed as `AppContextApis` (distinct from `CyWebApiType`; `uiSurface` is required)
- [ ] `window.CyWebApi` typed as `CyWebApiType` (no `uiSurface` field)
- [ ] `window.CyWebApi.uiSurface` is `undefined` at runtime
- [ ] `AppContext.apis.uiSurface.registerPanel(...)` has no TypeScript error
- [ ] `window.CyWebApi.uiSurface` causes a TypeScript error

### UI Surface Registration

- [ ] Runtime-registered panel appears without a `CyApp.components` declaration
- [ ] Runtime-registered menu item appears without a `CyApp.components` declaration
- [ ] `getSupportedSlots()` returns `['right-panel', 'apps-menu']`
- [ ] Upsert: re-registering a panel with a new `title` updates without changing `surfaceId`
- [ ] `registerAll()` registers multiple surfaces; failed entries are skipped but logged
- [ ] `getRegisteredSurfaces()` returns only surfaces for the calling app
- [ ] `getSurfaceVisibility()` returns correct `hiddenReason` for each condition
- [ ] `registerPanel({ component: 'notAFunction' })` returns `fail(InvalidInput)`
- [ ] An app cannot register a surface under another app's `appId` (factory-bound)

### Declarative Surfaces

- [ ] An app with `surfaces: [...]` and no `mount()` renders all declared surfaces
- [ ] An app with both `surfaces` and `mount()` sees declarative surfaces first; `mount()` can upsert over them

### Visibility & Error Isolation

- [ ] Panel with `requires.network = true` is hidden when no network is loaded
- [ ] Panel with `requires.network = true` is visible when a network is loaded
- [ ] Broken panel component is contained by `PluginErrorBoundary` — other panels continue to render
- [ ] Custom `errorFallback` is displayed when provided (not the host default)
- [ ] Selected tab moves to first visible panel when current panel is hidden by `requires.network`
- [ ] Selecting a panel, then adding a new panel before it, keeps the original panel selected

### Menu Item `closeOnAction`

- [ ] Menu item with `closeOnAction: true` auto-closes dropdown after action
- [ ] Menu item with `closeOnAction: false` (default) requires plugin to call `handleClose`

### Lifecycle & Cleanup

- [ ] Disabling an app removes all of its runtime surfaces immediately
- [ ] Re-enabling an app re-registers its surfaces correctly
- [ ] Failed `mount()` does not leave orphaned panels or menu items
- [ ] `cleanupAllForApp(appId)` invokes all registered cleanup functions
- [ ] One failing cleanup does not prevent others from running
- [ ] Adding a new store with `registerAppCleanup` requires no changes to `appLifecycle.ts`

### Context Menu Unified Design

- [ ] Disabling an app removes its context menu items (via `removeAllByAppId`)
- [ ] Context menu items registered by app A are not removed when app B is disabled
- [ ] Items registered via `AppContext.apis.contextMenu` carry the correct `appId`
- [ ] `window.CyWebApi.contextMenu` (anonymous) registers items with `appId === undefined`
- [ ] `removeAllByAppId` does not remove anonymous items
- [ ] `addContextMenuItem` with empty label returns `fail(InvalidInput)` (preserved)
- [ ] `addContextMenuItem` with omitted `targetTypes` defaults to `['node', 'edge']` (preserved)
- [ ] `removeContextMenuItem` with unknown `itemId` returns `fail(ContextMenuItemNotFound)` (preserved)

### AppIdContext

- [ ] `useAppContext()` returns `{ appId, apis }` inside a plugin surface wrapped by `AppIdProvider`
- [ ] `useAppContext()` returns `null` outside the provider (test isolation)

### Backward Compatibility

- [ ] Existing manifest-only apps (`CyApp.components`) still render correctly
- [ ] Existing apps without lifecycle methods continue to function
- [ ] All legacy store exposures and task hook exposures remain present in `webpack.config.js`
- [ ] `CyApp.components` is now optional — apps without it do not error

### Example Apps

- [ ] `hello-world` example builds and functions with the new API
- [ ] `project-template` example builds and functions with the new API
- [ ] No remaining `useContextMenuApi` or `cyweb/ContextMenuApi` imports in any example app
