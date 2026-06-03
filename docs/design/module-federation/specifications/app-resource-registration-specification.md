# App Resource Runtime Registration Specification

- **Rev. 4 (3/14/2026): Keiichiro ONO, GitHub Copilot, and Claude** — Internal consistency fixes, architecture clarifications
- Rev. 3 (3/14/2026): Keiichiro ONO, GitHub Copilot, and Claude — DX improvements
- Rev. 2 (3/14/2026): Keiichiro ONO, GitHub Copilot, and Claude
- Rev. 1 (3/13/2026): Keiichiro ONO and GitHub Copilot

Detailed design for runtime registration of app panels and app menu items. This
extends the Module Federation app model so panels and menu items can be
registered at runtime, similar to context menu items, without relying on
`CyApp.components` for new apps.

For the current App API design, see
[app-api-specification.md](./app-api-specification.md). For the broader Module
Federation roadmap, see
[module-federation-design.md](../module-federation-design.md).

---

## 1. Overview

Today, external apps register panels and app menu items declaratively through
`CyApp.components`, while context menu items are registered imperatively through
`contextMenuApi`.

This split creates two different extension models:

- **Panels and app menu items** are discovered from the app manifest loaded from
  `./AppConfig`
- **Context menu items** are created at runtime and stored in a dedicated host
  registry

This specification introduces a new host-managed runtime registry for panels and
app menu items. The registry is designed from the start to accommodate multiple
UI slots, per-slot prop contracts, visibility rules, error boundaries, and
capability negotiation — so that future extension points can be added without
redesigning the core model.

## 2. Current Behavior

### 2.1 App Loading

The host loads app manifests from `src/assets/apps.json` in
`src/data/hooks/stores/useAppManager.ts`.

For each configured remote:

1. Load `./AppConfig`
2. Read the default-exported `CyApp`
3. Store the live app object in `appRegistry`
4. Persist serializable app metadata in `AppStore`
5. Call `mount()` and `unmount()` based on app status

### 2.2 Panel and Menu Rendering

The host currently renders app-owned resources by scanning `CyApp.components`:

- `src/features/Workspace/SidePanel/TabContents.tsx` filters
  `ComponentType.Panel`
- `src/features/ToolBar/AppMenu/index.tsx` filters `ComponentType.Menu`

This means the host requires explicit component metadata before any panel or app
menu item can appear.

### 2.3 Context Menu Rendering

Context menu items are different:

- External apps call `contextMenuApi.addContextMenuItem()`
- Items are stored in `ContextMenuItemStore`
- The host renders them from runtime state, not from `CyApp.components`

This is runtime registration, not export discovery.

**Known gap:** `ContextMenuItemStore` and `RegisteredContextMenuItem` carry no
`appId` field. As a result, context menu items are not automatically cleaned up
when an app is disabled or unloaded. This spec addresses this gap in §6.6.

## 3. Problem Statement

The current manifest-only model is simple, but it has these limitations:

1. It forces app authors to declare resources in two places: app manifest and
   component code
2. It makes panels and menu items behave differently from other runtime
   extensions such as context menus
3. It ties host rendering to manifest metadata instead of app lifecycle state
4. `kind: 'panel' | 'menu'` conflates resource type with placement, making it
   hard to add new slots (e.g., a second toolbar menu, a bottom panel)
5. Host props (e.g., `handleClose`) are hardcoded per resource type rather than
   defined by the receiving slot
6. There is no mechanism for capability negotiation — apps cannot ask which slots
   the host currently supports
7. There are no error boundaries around plugin-owned UI — one broken component
   can destabilize an entire panel or menu region
8. Cleanup code in `appLifecycle.ts` must be updated every time a new
   registrable resource type is introduced — this is manual, error-prone, and
   does not scale
9. There is no API to update a registered resource (title, order, visibility)
   without unregistering and re-registering it, causing flicker and state loss
10. Plugin components have no host-provided mechanism to obtain their `appId`,
    forcing workarounds like module-scope state that are fragile under HMR and
    break test isolation
11. Registering multiple resources in `mount()` requires verbose per-call
    `ApiResult` checking — most apps have fixed resources and gain nothing from
    per-call error handling
12. `handleClose` for menu items is a common footgun: calling it immediately
    unmounts the menu and any Dialog the component opened, requiring developers
    to defer the call manually
13. Developers have no API to inspect what resources are registered or why a
    resource is hidden, making debugging difficult
14. Plugin authors cannot customize the error boundary fallback shown when their
    component fails to render

The host should support a single runtime-oriented model for app-owned UI
resources that is slot-based, prop-typed per slot, error-isolated, and
capability-aware, while minimizing the boilerplate and friction for common
plugin patterns.

## 4. Goals

- Allow apps to register panels and app menu items at runtime
- Use a **slot model** so that new UI locations can be added without redesigning
  the registry
- Define host props per slot, not per resource type, to avoid tight coupling
- Support declarative visibility flags so plugins can express contextual
  visibility without reimplementing host state checks
- Support ordering groups for structured menus and tab strips
- Isolate plugin rendering failures with per-resource error boundaries
- Support capability negotiation so apps can register conditionally
- Keep app ownership explicit through `appId` via factory binding
- Ensure automatic cleanup on app disable, unload, and mount failure
- Use an **extensible cleanup registry** so that new registrable resource types
  do not require changes to `appLifecycle.ts`
- Support **upsert semantics** for resource registration so apps can update
  title, order, or visibility without unregister/re-register flicker
- Provide a host-managed **`AppIdContext`** (React Context) so plugin
  components can obtain their `appId` without module-scope workarounds
- Fix the equivalent context menu cleanup gap in the same lifecycle pass
- **Delete `useContextMenuApi()` and `cyweb/ContextMenuApi`** in this rollout —
  the feature has not been publicly released, so no deprecation period is needed
- Support a **declarative `resources` field** on `CyAppWithLifecycle` so apps
  with fixed resources need not implement `mount()` at all
- Provide a **batch registration API** to reduce per-call boilerplate in
  `mount()`
- Provide **debug/introspection methods** so developers can inspect registered
  resources and understand visibility evaluation
- Eliminate the `handleClose` footgun with an **auto-close mode** for menu items
- Allow plugins to supply a **custom error boundary fallback** component
- **Validate components at registration time** (runtime type check) to catch
  errors early rather than at render time
- Preserve backward compatibility with existing `CyApp.components` apps

## 5. Non-Goals

- No automatic discovery of arbitrary Webpack Module Federation exports
- No persistence of panel or menu registrations in IndexedDB (but the registry
  is keyed by a stable identity triple for future persistence — see §6.5)
- No removal of `CyApp.components` in the first rollout

## 6. Proposed Design

### 6.1 Slot Model and Registry

#### 6.1.1 `ResourceSlot`

Replace the `kind: 'panel' | 'menu'` discriminant with a **slot** that encodes
both resource type and placement:

```typescript
/**
 * Identifies a specific host-managed UI location that plugins can occupy.
 *
 * Current slots (first rollout):
 *   'right-panel'  — tabbed side panel on the right
 *   'apps-menu'    — dropdown in the Apps toolbar button
 *
 * Reserved for future rollouts:
 *   'left-panel', 'bottom-panel', 'tools-menu', 'status-bar', 'modal-launcher'
 */
type ResourceSlot = 'right-panel' | 'apps-menu'
```

Separating slot from kind means the host can add `'bottom-panel'` later without
changing the registry model. Rendering code switches on `slot`, not on a
separate `kind` field.

#### 6.1.2 Per-Slot Host Props

Each slot defines its own component prop type. Host renderers inject exactly the
props declared for that slot:

```typescript
// src/app-api/types/AppResourceTypes.ts

/** Props injected by the host into every 'right-panel' component. */
export interface PanelHostProps {
  // Empty in first rollout. Future: isActive, requestFocus, closePanel.
}

/** Props injected by the host into every 'apps-menu' component. */
export interface MenuItemHostProps {
  /**
   * Closes the Apps dropdown.
   *
   * **When `closeOnAction: true`:** The host wraps the component in a
   * click-capturing container that auto-closes the dropdown on any click
   * event (via `queueMicrotask` so the component's own handler runs first).
   * Plugins do NOT need to call `handleClose` — it is still injected as a
   * prop for edge cases, but the host handles the common path.
   *
   * **When `closeOnAction: false` (default):** The plugin MUST call
   * `handleClose` manually when appropriate. This is the correct mode for
   * menu items that open Dialogs — call `handleClose` after the Dialog
   * closes, not before.
   */
  handleClose: () => void
  // Future: shortcutLabel, disabled.
}
```

These types are exported from the `@cytoscape-web/api-types` package so plugin
authors can type their components correctly without guessing.

#### 6.1.3 `RegisteredAppResource`

New internal type:

```typescript
// src/models/AppModel/RegisteredAppResource.ts

type ResourceSlot = 'right-panel' | 'apps-menu'

interface RegisteredAppResource {
  readonly id: string
  readonly appId: string
  readonly slot: ResourceSlot
  readonly title?: string
  /**
   * Sort key within the slot. Lower values appear first.
   * Defaults to insertion order when undefined.
   */
  readonly order?: number
  /**
   * Group identifier for section grouping within a slot.
   * Items with the same group are rendered together.
   * Ignored by renderers in the first rollout but stored for future use.
   */
  readonly group?: string
  /**
   * Declarative visibility flags. The host evaluates these in addition to
   * app-active state. In the first rollout only `requiresNetwork` is
   * evaluated; the others are stored for future renderers.
   */
  readonly requires?: {
    /** true → resource is hidden unless a network is currently loaded */
    network?: boolean
    /** true → resource is hidden unless at least one element is selected */
    selection?: boolean
  }
  /**
   * The React component to render. Typed as `unknown` here to keep the store
   * model free of React imports (per the no-React-in-core rule).
   * Host renderers cast to the appropriate slot-specific prop type at the
   * call site. Must be a function (validated at registration time — §6.2.3).
   */
  readonly component: unknown
  /**
   * Optional custom error fallback component. Typed as `unknown` here;
   * renderers cast to React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>.
   * If omitted, the host's default PluginFallback is used.
   */
  readonly errorFallback?: unknown
  /**
   * For 'apps-menu' slot only. If true, the host automatically closes the
   * dropdown when the menu item's onClick handler completes, so the plugin
   * does not need to call handleClose manually. Default: false.
   */
  readonly closeOnAction?: boolean
}
```

New host store:

```text
src/data/hooks/stores/AppResourceStore.ts
```

Registry rules:

- `appId` is required for every registration
- `(appId, slot, id)` is the **stable resource identity** — this triple is used
  for deduplication, future persistence (see §6.5), and tab selection tracking
- **Upsert semantics:** Registering a resource with the same `(appId, slot, id)`
  replaces the existing entry in place rather than returning an error. This
  enables apps to update `title`, `order`, `requires`, or `component` without
  unregister/re-register flicker (see §6.2.3)
- Runtime registrations are derived state and are never persisted
- The host owns cleanup for all registrations of a disabled or unloaded app

### 6.2 Public API

#### 6.2.1 Capability Negotiation

Before registering resources, apps may query which slots the host currently
supports:

```typescript
interface ResourceApi {
  /**
   * Returns the set of UI slots this host version supports.
   * Apps should register resources only for supported slots.
   *
   * @example
   * if (apis.resource.getSupportedSlots().includes('bottom-panel')) {
   *   apis.resource.registerBottomPanel({ ... })
   * }
   */
  getSupportedSlots(): ResourceSlot[]

  // ── Individual Registration (upsert semantics) ──────────────────────

  /**
   * Register a panel in the 'right-panel' slot. Uses **upsert semantics**:
   * if a panel with the same `id` is already registered by this app, it is
   * replaced in place (preserving tab selection) rather than returning an error.
   */
  registerPanel(options: RegisterPanelOptions): ApiResult<{ resourceId: string }>
  unregisterPanel(panelId: string): ApiResult
  /**
   * Register a menu item in the 'apps-menu' slot. Uses **upsert semantics**:
   * if a menu item with the same `id` is already registered by this app, it is
   * replaced in place rather than returning an error.
   */
  registerMenuItem(
    options: RegisterMenuItemOptions,
  ): ApiResult<{ resourceId: string }>
  unregisterMenuItem(menuItemId: string): ApiResult
  unregisterAll(): ApiResult

  // ── Batch Registration ──────────────────────────────────────────────

  /**
   * Register multiple resources in a single call. Each entry specifies its
   * target slot. Uses upsert semantics per entry. Entries that fail
   * validation are skipped (logged) but do not block other entries.
   *
   * **Always returns `ok()`** — even if some or all entries fail. Callers
   * must check `result.data.errors.length > 0` to detect partial failures.
   * This design avoids forcing callers to handle a `fail()` path for what
   * is typically a recoverable "some entries skipped" situation.
   *
   * @example
   * const result = apis.resource.registerAll([
   *   { slot: 'right-panel', id: 'main', title: 'My Panel', component: MyPanel },
   *   { slot: 'apps-menu', id: 'action', component: MyAction },
   * ])
   * if (result.success && result.data.errors.length > 0) {
   *   logApp.warn('Some resources failed to register:', result.data.errors)
   * }
   */
  registerAll(
    entries: RegisterResourceEntry[],
  ): ApiResult<{
    registered: Array<{ resourceId: string }>
    errors: Array<{ id: string; slot: ResourceSlot; error: ApiError }>
  }>

  // ── Introspection (debug / development) ─────────────────────────────

  /**
   * Returns all resources registered by this app. Useful for debugging and
   * DevTools integration.
   */
  getRegisteredResources(): RegisteredResourceInfo[]

  /**
   * Returns the visibility evaluation result for a resource registered by
   * this app. The `id` parameter is the **slot-local id** passed to
   * `registerPanel` / `registerMenuItem` — not the full resourceId triple.
   *
   * @example
   * const vis = apis.resource.getResourceVisibility('myPanel')
   * // { registered: true, visible: false, hiddenReason: 'requires-network' }
   */
  getResourceVisibility(id: string): ResourceVisibilityResult
}

/** Entry for batch registration via registerAll(). */
interface RegisterResourceEntry {
  slot: ResourceSlot
  id: string
  title?: string
  order?: number
  group?: string
  requires?: RegisteredAppResource['requires']
  component: React.ComponentType<any>
  /** Custom error fallback (see §6.3.4). */
  errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>
  /** For 'apps-menu' only: auto-close after action (see §6.1.2). */
  closeOnAction?: boolean
}

/** Returned by getRegisteredResources(). */
interface RegisteredResourceInfo {
  resourceId: string    // full triple: appId::slot::id
  slot: ResourceSlot
  id: string
  title?: string
  order?: number
  requires?: RegisteredAppResource['requires']
}

/** Returned by getResourceVisibility(). */
interface ResourceVisibilityResult {
  registered: boolean
  visible: boolean
  hiddenReason?: 'app-inactive' | 'requires-network' | 'requires-selection' | 'slot-not-rendered'
}
```

> **Naming note:** `registerPanel` / `registerMenuItem` return a `resourceId` — the
> full identity triple `${appId}::${slot}::${id}`. The `unregister*` parameters
> (`panelId`, `menuItemId`) are the **slot-local id** only — the same value passed
> as `options.id` at registration, not the full triple. Do not pass the returned
> `resourceId` to `unregisterPanel`; pass `options.id` directly.

> **Upsert semantics:** Calling `registerPanel` with an `id` that is already
> registered by the same app replaces the existing resource entry in the store
> atomically. The `resourceId` returned is unchanged, so tab selection state in
> `SidePanel.tsx` is preserved. This allows apps to dynamically update `title`,
> `order`, `requires`, or `component` without the flicker caused by an
> unregister/re-register cycle.

The host implements `getSupportedSlots()` by returning the static list of
currently wired slots:

```typescript
getSupportedSlots(): ResourceSlot[] {
  return ['right-panel', 'apps-menu']
}
```

Registering a resource for an unsupported slot returns
`fail(ApiErrorCode.InvalidInput, 'slot ... is not supported')`.

#### 6.2.2 Registration Options

```typescript
interface RegisterPanelOptions {
  id: string
  /** Display label for the panel tab. Falls back to `id` if omitted. */
  title?: string
  order?: number
  group?: string
  requires?: RegisteredAppResource['requires']
  component: React.ComponentType<PanelHostProps>
  /**
   * Custom fallback component rendered when this panel throws a render error.
   * Receives the error and a resetErrorBoundary callback. If omitted, the
   * host's default PluginFallback is used (shows "Plugin panel unavailable").
   */
  errorFallback?: React.ComponentType<{
    error: Error
    resetErrorBoundary: () => void
  }>
}

interface RegisterMenuItemOptions {
  id: string
  /** Display label for the menu item. Falls back to `id` if omitted. */
  title?: string
  order?: number
  group?: string
  requires?: RegisteredAppResource['requires']
  component: React.ComponentType<MenuItemHostProps>
  /**
   * If true, the host automatically closes the Apps dropdown after the menu
   * item component's onClick handler completes. This eliminates the common
   * footgun of forgetting to call handleClose.
   *
   * Set to false (default) for menu items that open Dialogs — the Dialog
   * should call handleClose manually when it closes.
   *
   * @default false
   */
  closeOnAction?: boolean
  /** Custom error fallback (same as RegisterPanelOptions.errorFallback). */
  errorFallback?: React.ComponentType<{
    error: Error
    resetErrorBoundary: () => void
  }>
}
```

Note that `appId` does **not** appear in any option or method signature. It is
captured once at construction time (§6.2.3).

#### 6.2.3 Per-App Factory Pattern

`ResourceApi` is **per-app**: each instance is bound to a specific `appId` at
creation time. This prevents apps from accidentally (or intentionally)
registering resources under another app's identity.

```typescript
// src/app-api/core/resourceApi.ts

const SUPPORTED_SLOTS: ResourceSlot[] = ['right-panel', 'apps-menu']

export const createResourceApi = (appId: string): ResourceApi => ({
  getSupportedSlots() {
    return [...SUPPORTED_SLOTS]
  },

  registerPanel(options) {
    try {
      if (!options.id || options.id.trim() === '') {
        return fail(
          ApiErrorCode.InvalidInput,
          'id is required and must be non-empty',
        )
      }
      // Runtime type check: catch non-component values early (before render).
      // React components are functions (function/class components) or objects
      // (React.lazy, React.memo, React.forwardRef). This catches common
      // mistakes like passing a string, number, or null.
      if (
        typeof options.component !== 'function' &&
        (typeof options.component !== 'object' || options.component === null)
      ) {
        return fail(
          ApiErrorCode.InvalidInput,
          `component must be a React component (function or object like React.lazy), got ${typeof options.component}`,
        )
      }
      const store = useAppResourceStore.getState()
      // Upsert: if a resource with the same identity already exists, replace it
      // in place. This preserves tab selection state and avoids flicker.
      store.upsertResource({
        id: options.id,
        appId,
        slot: 'right-panel',
        title: options.title,
        order: options.order,
        group: options.group,
        requires: options.requires,
        component: options.component as unknown,
        errorFallback: options.errorFallback as unknown,
      })
      return ok({ resourceId: `${appId}::right-panel::${options.id}` })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  unregisterPanel(panelId) {
    try {
      const store = useAppResourceStore.getState()
      if (!store.hasResource(appId, 'right-panel', panelId)) {
        return fail(
          ApiErrorCode.ResourceNotFound,
          `Panel '${panelId}' not found`,
        )
      }
      store.removeResource(appId, 'right-panel', panelId)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  registerMenuItem(options) {
    /* mirrors registerPanel with slot: 'apps-menu' */
  },
  unregisterMenuItem(menuItemId) {
    /* mirrors unregisterPanel */
  },

  unregisterAll() {
    try {
      useAppResourceStore.getState().removeAllByAppId(appId)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  // ── Batch Registration ──────────────────────────────────────────────

  registerAll(entries) {
    const registered: Array<{ resourceId: string }> = []
    const errors: Array<{ id: string; slot: ResourceSlot; error: ApiError }> = []
    for (const entry of entries) {
      let result: ApiResult<{ resourceId: string }>
      if (entry.slot === 'right-panel') {
        result = this.registerPanel(entry as RegisterPanelOptions)
      } else if (entry.slot === 'apps-menu') {
        result = this.registerMenuItem(entry as RegisterMenuItemOptions)
      } else {
        errors.push({
          id: entry.id,
          slot: entry.slot,
          error: { code: ApiErrorCode.InvalidInput, message: `Unsupported slot: ${entry.slot}` },
        })
        continue
      }
      if (result.success) {
        registered.push(result.data)
      } else {
        errors.push({ id: entry.id, slot: entry.slot, error: result.error })
      }
    }
    if (errors.length > 0) {
      for (const e of errors) {
        logApp.warn(`[ResourceApi]: registerAll skipped ${e.id} (${e.slot}): ${e.error.message}`)
      }
    }
    return ok({ registered, errors })
  },

  // ── Introspection ───────────────────────────────────────────────────

  getRegisteredResources() {
    return useAppResourceStore
      .getState()
      .resources.filter((s) => s.appId === appId)
      .map((s) => ({
        resourceId: `${s.appId}::${s.slot}::${s.id}`,
        slot: s.slot,
        id: s.id,
        title: s.title,
        order: s.order,
        requires: s.requires,
      }))
  },

  getResourceVisibility(id) {
    const store = useAppResourceStore.getState()
    const resource = store.resources.find(
      (s) => s.appId === appId && s.id === id,
    )
    if (!resource) return { registered: false, visible: false }

    // 1. Check app-active state first
    const appStatus = useAppStore.getState().apps[appId]?.status
    if (appStatus !== AppStatus.Active) {
      return { registered: true, visible: false, hiddenReason: 'app-inactive' }
    }

    // 2. Evaluate visibility rules (same logic as host renderers)
    const { workspace } = useWorkspaceStore.getState()
    const currentNetworkId = workspace.currentNetworkId
    if (resource.requires?.network && !currentNetworkId) {
      return { registered: true, visible: false, hiddenReason: 'requires-network' }
    }
    if (resource.requires?.selection) {
      // Selection check — deferred in v1 but included for completeness
      return { registered: true, visible: false, hiddenReason: 'requires-selection' }
    }
    return { registered: true, visible: true }
  },
})
```

#### 6.2.4 `AppIdContext` — Host-Provided React Context for Plugin Components

Plugin components often need access to the per-app `apis` object (e.g., to
register context menu items in response to user interaction). Previously, this
required module-scope state (`appState.ts`), which is fragile under HMR, breaks
test isolation, and prevents multiple instances of the same plugin.

In this rollout, the host provides an **`AppIdContext`** React Context that
wraps every plugin component. Plugin authors use the `useAppContext()` hook to
obtain both `appId` and the per-app `apis` object:

```typescript
// src/app-api/AppIdContext.tsx — new file, provided by the host

import { createContext, useContext } from 'react'
import type { AppContextApis } from './types'

interface AppIdContextValue {
  readonly appId: string
  readonly apis: AppContextApis
}

const AppIdContext = createContext<AppIdContextValue | null>(null)

/**
 * Hook for plugin components to access the per-app context.
 * Must be called from within a plugin component rendered by the host.
 * Returns null if called outside the app context boundary (e.g., in tests
 * without a provider).
 */
export const useAppContext = (): AppIdContextValue | null =>
  useContext(AppIdContext)

export const AppIdProvider = AppIdContext.Provider
```

The host wraps each plugin resource in `AppIdProvider` at the rendering call
site, alongside `PluginErrorBoundary`:

```tsx
// TabContents.tsx (right-panel renderer)
<AppIdProvider value={{ appId: resource.appId, apis: perAppApis.get(resource.appId) }}>
  <PluginErrorBoundary appId={resource.appId} slot="right-panel">
    <Suspense fallback={<PanelLoadingFallback />}>
      <PanelComponent />
    </Suspense>
  </PluginErrorBoundary>
</AppIdProvider>
```

Plugin components use the hook:

```typescript
// MyPanel.tsx — plugin component
import { useAppContext } from 'cyweb/AppIdContext'

const MyPanel = () => {
  const ctx = useAppContext()
  if (ctx === null) return null // safety guard

  const handleToggle = () => {
    ctx.apis.contextMenu.addContextMenuItem({
      label: 'My Action',
      targetTypes: ['node'],
      handler: (c) => { /* ... */ },
    })
  }

  return <button onClick={handleToggle}>Toggle</button>
}
```

**Benefits over the `appState.ts` module-scope pattern:**

- Works correctly under HMR (context value is always fresh from the host)
- Supports multiple instances of the same plugin (each gets its own context)
- Test isolation is trivial: wrap the component in `<AppIdProvider value={...}>`
- No module-scope mutable state to manage or reset

**Module Federation expose:** `AppIdContext` is exposed as `cyweb/AppIdContext`
in `webpack.config.js`:

```javascript
'./AppIdContext': './src/app-api/AppIdContext.tsx',
```

**Backward compatibility:** The `appState.ts` pattern documented in §6.6.1
remains available as an **interim pattern** for plugins that cannot adopt the
React Context immediately (e.g., non-component code that runs outside the React
tree). It is explicitly marked as deprecated and will be removed once all
example apps are migrated.

#### 6.2.5 No `useResourceApi` Hook in v1

Unlike other App API domains, `ResourceApi` is **not** exposed as a zero-arg
React hook in this rollout. The primary call site is `mount()`, where
`apis.resource` is provided by `AppContext`. Plugin components that need
resource registration access can use `useAppContext()` (§6.2.4) to obtain the
per-app `apis` object, which includes `resource`.

The host constructs the per-app `CyWebApi` object in `useAppManager.ts` before
calling `mount()`:

```typescript
const appApi = {
  ...CyWebApi,
  resource: createResourceApi(cyApp.id),
  contextMenu: createContextMenuApi(cyApp.id),
}
void mountApp(cyApp, { appId: cyApp.id, apis: appApi }, mountedApps.current)
```

#### 6.2.6 `window.CyWebApi` Limitation and `AppContextApis` Type

`window.CyWebApi` is intended for non-React consumers (browser extensions, LLM
agent bridges). App resource registration requires `React.ComponentType` values,
which non-React consumers cannot provide.

Because `window.CyWebApi` and `AppContext.apis` now carry different sets of
fields, they must have **distinct types**. Using a single `CyWebApiType` for
both would leave `resource` as optional in `mount()`, even though the host
always injects it there.

The two types are:

The type model follows **Model A**:

| Type             | Used by           | `resource`                            |
| ---------------- | ----------------- | -------------------------------------- |
| `CyWebApiType`   | `window.CyWebApi` | **absent** — window-safe by definition |
| `AppContextApis` | `AppContext.apis` | **required** — host always injects     |

`CyWebApiType` is the window-safe shape and carries no `resource` field at all.
`AppContextApis` extends it and adds the required field. `window.CyWebApi` is
declared directly as `CyWebApiType` — no `Omit` needed or used.

```typescript
// src/app-api/types/index.ts (or AppContext.ts)

/**
 * Window-facing API type. resource is intentionally absent:
 * non-React consumers cannot provide React.ComponentType values.
 * window.CyWebApi is declared as this type directly.
 */
export interface CyWebApiType {
  element: ElementApi
  network: NetworkApi
  // ... existing fields ...
  contextMenu: ContextMenuApi
  // No resource field here.
}

/**
 * Per-app API object passed to mount(). Extends CyWebApiType and adds
 * resource as a required field — the host always injects it before calling
 * mount(). Intentionally distinct from CyWebApiType.
 */
export interface AppContextApis extends CyWebApiType {
  readonly resource: ResourceApi // required: never undefined inside mount()
}
```

```typescript
// packages/api-types/src/index.ts — window declaration
declare global {
  interface Window {
    CyWebApi: CyWebApiType // not Omit<...> — CyWebApiType is already window-safe
  }
}
```

```typescript
// src/app-api/types/AppContext.ts
export interface AppContext {
  readonly appId: string
  readonly apis: AppContextApis // resource is ResourceApi, not undefined
}
```

App code inside `mount()` can safely call `apis.resource.registerPanel(...)` without
a null check. TypeScript enforces this at compile time.

### 6.3 Host Rendering

Update host renderers to merge both sources — manifest resources from
`CyApp.components` and runtime resources from `AppResourceStore` — and apply the
following rules uniformly.

#### 6.3.1 Rendering Rules

- Runtime resources are rendered only when the app is active
- Visibility flags in `requires` are evaluated after app-active state:
  - `requires.network = true` → skip rendering unless a network is loaded
  - Other flags are stored and logged as unsupported in the first rollout
- If a runtime resource and a manifest resource share the same `(appId, slot,
id)`, the runtime resource wins and the host logs a warning
- Resources within a slot are sorted by `order` (ascending, undefined last),
  then by registration order for ties
- `group` is stored but ignored by renderers in the first rollout

#### 6.3.2 Stable Tab Selection by Resource Identity

The current `SidePanel.tsx` stores the selected tab as a numeric index
(`useState(0)`). This breaks when panels are added, removed, or hidden by
`requires.network`, because the array shrinks or reorders and the same index
silently points to a different panel.

As part of this implementation, `SidePanel.tsx` must be updated to store the
selected panel by **resource identity** instead of array position:

```typescript
// Before (fragile)
const [value, setValue] = useState(0)

// After (stable)
const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)
```

The resource identity for a `right-panel` resource is the same triple used
elsewhere: `${appId}::right-panel::${id}`. For the built-in "Sub Network Viewer"
tab (not a registered resource), use a reserved sentinel string such as
`'__builtin__::right-panel::sub-network-viewer'`.

Rendering logic:

1. Build the ordered, visibility-filtered array of resources to display
2. Find the index of `selectedResourceId` in that array
3. If not found (resource removed or hidden), fall back to index 0 and update
   `selectedResourceId` to the first visible resource's identity
4. Pass the resolved index to MUI `<Tabs value={resolvedIndex}>`

This ensures that when `requires.network` hides a panel, the selected tab
moves to the first visible panel rather than silently shifting to whatever
panel now occupies the previous numeric position.

#### 6.3.3 Per-Slot Prop Injection

Host renderers inject the slot-specific props at the call site. The component
type is `unknown` in the store; renderers cast it to the appropriate prop type:

```tsx
// right-panel renderer (TabContents.tsx)
const PanelComponent = resource.component as React.ComponentType<PanelHostProps>
// PanelHostProps = {} in first rollout — no props injected yet
return (
  <PluginErrorBoundary appId={resource.appId} slot="right-panel"
    customFallback={resource.errorFallback as any}>
    <Suspense fallback={<PanelLoadingFallback />}>
      <PanelComponent />
    </Suspense>
  </PluginErrorBoundary>
)

// apps-menu renderer (AppMenu/index.tsx)
const MenuComponent =
  resource.component as React.ComponentType<MenuItemHostProps>

// closeOnAction implementation:
// When closeOnAction is true, the host wraps the component in a <div>
// with a click listener that auto-closes the dropdown after ANY click
// within the component. The plugin does NOT need to call handleClose.
// When closeOnAction is false (default), the plugin must call handleClose
// manually (e.g., after a Dialog closes).
if (resource.closeOnAction) {
  return (
    <PluginErrorBoundary appId={resource.appId} slot="apps-menu"
      customFallback={resource.errorFallback as any}>
      <div onClick={() => { /* defer close to next microtask so the
           component's own handler runs first */
        queueMicrotask(() => handleClose())
      }}>
        <MenuComponent handleClose={handleClose} />
      </div>
    </PluginErrorBoundary>
  )
}
// Default: plugin calls handleClose manually
return (
  <PluginErrorBoundary appId={resource.appId} slot="apps-menu"
    customFallback={resource.errorFallback as any}>
    <MenuComponent handleClose={handleClose} />
  </PluginErrorBoundary>
)
```

#### 6.3.4 Error Boundaries

Every plugin resource must be wrapped in a `PluginErrorBoundary` before
rendering. This isolates rendering failures so that one broken plugin component
cannot crash an entire panel or menu region.

Required behavior:

- On render error, display a minimal fallback (e.g., "Plugin panel unavailable")
  that shows `appId` and `slot` for debugging
- Log the error via `logApp.error` with app ID, slot, and resource ID
- The error boundary must be **per resource**, not per slot — a broken panel must
  not hide other panels in the same slot

The repository already uses `react-error-boundary` in `ErrorHandler.tsx`.
`PluginErrorBoundary` must use the same library (not a new class component) and
follow the same pattern, adding only the plugin-specific fallback UI and logging:

```typescript
// src/features/AppManager/PluginErrorBoundary.tsx
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'

interface PluginErrorBoundaryProps {
  appId: string
  slot: ResourceSlot
  children: React.ReactNode
  /**
   * Optional plugin-provided fallback component. If supplied, it is used
   * instead of the host default. This lets plugin authors provide contextual
   * error messages and a "Retry" button via resetErrorBoundary.
   */
  customFallback?: React.ComponentType<FallbackProps>
}

const PluginFallback = ({ appId, slot }: { appId: string; slot: ResourceSlot }) => (
  <div role="alert">
    Plugin panel unavailable ({appId} / {slot})
  </div>
)

export const PluginErrorBoundary = ({
  appId,
  slot,
  children,
  customFallback,
}: PluginErrorBoundaryProps) => (
  <ErrorBoundary
    FallbackComponent={
      customFallback ?? (() => <PluginFallback appId={appId} slot={slot} />)
    }
    onError={(error, info) => {
      logApp.error(`[PluginErrorBoundary]: render error in ${appId}/${slot}`, error, info)
    }}
  >
    {children}
  </ErrorBoundary>
)
```

`PluginErrorBoundary` is a new file added to `src/features/AppManager/`.
The existing `ErrorBoundary.tsx` and `ErrorHandler.tsx` are not modified.

### 6.4 Lifecycle and Cleanup

**Scope of this guarantee:** Host-owned cleanup applies exclusively to
registrations made through the per-app `AppContext.apis` passed to `mount()`.
Registrations made via the `window.CyWebApi.contextMenu` anonymous singleton
(non-React consumers only — see §6.6.1) are outside the lifecycle model and do
not receive automatic cleanup. Callers using the anonymous path are responsible
for calling `removeContextMenuItem` manually.

#### 6.4.0 mount() Ordering and Rendering

In `useAppManager.ts`, `registerApp(cyApp)` is called first (which makes the
app visible and begins rendering `CyApp.components`), and then
`void mountApp(...)` is called as fire-and-forget. This means that for apps
using runtime registration:

- `CyApp.components` resources appear immediately after `registerApp`
- Runtime resources (registered in `mount()`) appear only after `mount()` resolves

This two-phase appearance is expected and acceptable for the first rollout
because `mount()` is intended to be fast. The following rule applies:

> **Implementation rule:** `mount()` must complete all resource registrations
> synchronously or in a single microtask. Do not perform async I/O (network
> requests, IndexedDB reads) inside `mount()` before calling
> `apis.resource.registerPanel()`. Slow `mount()` implementations cause a
> noticeable delay before runtime resources appear.

Because this rule relies on plugin author discipline and cannot be enforced by
the host at compile time, `mountApp` in `appLifecycle.ts` must add a **runtime
duration warning** as the v1 safeguard:

```typescript
export const mountApp = async (
  cyApp: CyApp,
  context: AppContext,
  mountedApps: Set<string>,
): Promise<void> => {
  const lifecycle = cyApp as CyAppWithLifecycle
  if (typeof lifecycle.mount !== 'function') {
    // No lifecycle callback — treat as mounted immediately so renderers
    // show CyApp.components resources without waiting. This is important for
    // the mountedAppIds gating scheme (Next Iteration): apps that have no
    // mount() must still appear in mountedAppIds or their resources are
    // hidden forever.
    mountedApps.add(cyApp.id)
    return
  }
  const t0 = performance.now()
  try {
    await lifecycle.mount(context)
    const elapsed = performance.now() - t0
    if (elapsed > 100) {
      logApp.warn(
        `[appLifecycle]: mount() for ${cyApp.id} took ${elapsed.toFixed(0)}ms. ` +
          'Resource registrations should complete synchronously to avoid rendering delays. ' +
          'Move async I/O out of mount() or defer it after registerPanel().',
      )
    }
    mountedApps.add(cyApp.id)
  } catch (err) {
    cleanupAllForApp(cyApp.id)
    logApp.error(`[appLifecycle]: mount() failed for ${cyApp.id}:`, err)
    throw err
  }
}
```

**Next Iteration (concrete task):** Introduce a `mountedAppIds: Set<string>` in
the app lifecycle state. Renderers read this set and skip displaying **any**
resource — `CyApp.components` or runtime-registered — for apps not yet in the
set. This eliminates the two-phase appearance entirely and allows mount() to be
genuinely async without UI side-effects. Implementation steps:

1. Add `mountedAppIds` to the store shape tracked by `useAppManager`
2. Populate it from `mountedApps` (the `Set<string>` already maintained by
   `mountApp`): apps with no `mount()` are added in the early-return path
   (already done in Rev. 9); apps with `mount()` are added after it resolves
3. Gate both `TabContents.tsx` and `AppMenu/index.tsx` on `mountedAppIds.has(appId)`

**Rule for apps without lifecycle hooks:** An app that declares no `mount()`
callback is treated as mounted immediately upon `registerApp`. `mountApp` adds
its `id` to `mountedApps` before returning. This ensures that apps using only
`CyApp.components` (no runtime registration) are never blocked by the
`mountedAppIds` gate.

#### 6.4.1 App Cleanup Registry

To avoid hardcoding per-store cleanup calls in `appLifecycle.ts`, this spec
introduces an **`AppCleanupRegistry`** — a registry-of-registries pattern that
allows each store to register its own cleanup function. When a new registrable
resource type is added in the future (e.g., keyboard shortcuts, status bar
items), the new store registers its cleanup with the registry, and
`appLifecycle.ts` does not need to be modified.

```typescript
// src/data/hooks/stores/AppCleanupRegistry.ts

type AppCleanupFn = (appId: string) => void

const cleanupFns: AppCleanupFn[] = []

/**
 * Register a cleanup function that will be called when an app is unmounted
 * or when mount() fails. Each store that manages per-app registrations
 * should call this once at module load time.
 *
 * @example
 * // In AppResourceStore.ts, at module level:
 * registerAppCleanup((appId) => useAppResourceStore.getState().removeAllByAppId(appId))
 */
export const registerAppCleanup = (fn: AppCleanupFn): void => {
  cleanupFns.push(fn)
}

/**
 * Run all registered cleanup functions for the given appId.
 * Called from appLifecycle.ts — this is the single cleanup entry point.
 */
export const cleanupAllForApp = (appId: string): void => {
  for (const fn of cleanupFns) {
    try {
      fn(appId)
    } catch (err) {
      logApp.warn(`[AppCleanupRegistry]: cleanup failed for ${appId}:`, err)
    }
  }
}
```

Each store registers its own cleanup at module load time:

```typescript
// AppResourceStore.ts — at module level, after store creation
registerAppCleanup((appId) => useAppResourceStore.getState().removeAllByAppId(appId))

// ContextMenuItemStore.ts — at module level, after store creation
registerAppCleanup((appId) => useContextMenuItemStore.getState().removeAllByAppId(appId))
```

This pattern means `appLifecycle.ts` calls `cleanupAllForApp(appId)` once,
regardless of how many stores exist. Adding a new registrable resource type
requires only adding a `registerAppCleanup` call in the new store — no changes
to `appLifecycle.ts`.

#### 6.4.2 Cleanup Triggers

When any of the following occurs:

- The user disables an app
- The remote app fails to load
- `mount()` throws after partial registration
- The page unloads

The host must remove all registered resources for that `appId`.

#### 6.4.3 Cleanup Implementation in `appLifecycle.ts`

`src/data/hooks/stores/appLifecycle.ts` is the single point where all cleanup
scenarios converge. It calls `cleanupAllForApp(appId)` from
`AppCleanupRegistry` — a single call that delegates to all registered stores.

**`unmountApp`** — called on user disable, page unload:

```typescript
import { cleanupAllForApp } from './AppCleanupRegistry'

export const unmountApp = async (
  cyApp: CyApp,
  mountedApps: Set<string>,
): Promise<void> => {
  if (!mountedApps.has(cyApp.id)) return
  mountedApps.delete(cyApp.id)

  // Host-owned cleanup — runs before unmount() so the UI is clean even if
  // unmount() throws. Delegates to all registered stores via the cleanup
  // registry — no need to list individual stores here.
  cleanupAllForApp(cyApp.id)

  const lifecycle = cyApp as CyAppWithLifecycle
  if (typeof lifecycle.unmount !== 'function') return
  try {
    await lifecycle.unmount()
  } catch (err) {
    logApp.warn(`[appLifecycle]: unmount() failed for ${cyApp.id}:`, err)
  }
}
```

**`mountApp`** — the canonical implementation is in §6.4.0. It handles both the
no-`mount()` early-return path (adds to `mountedApps` immediately), the
duration warning, and partial-registration cleanup on failure via
`cleanupAllForApp(cyApp.id)`.

**`unmountAllApps`** — called on `beforeunload`. Delegates to `unmountApp`, so
cleanup is covered transitively.

#### 6.4.4 Plugin-Initiated Cleanup

Plugin authors may call `apis.resource.unregisterAll()` from `unmount()` as
explicit cleanup. This is redundant with host-owned cleanup but harmless because
`removeAllByAppId` is idempotent.

Correct cleanup must not depend on the plugin calling `unregisterAll()`.

### 6.5 Stable Resource Identity and Future Persistence

Runtime registrations are **not** persisted to IndexedDB in this rollout.
However, the resource identity triple `(appId, slot, id)` is designed to be
stable across app reloads, so that a future persistence layer can store
user customizations (tab ordering, hidden resources, pinned items) keyed by this
triple without redesigning the registry.

Implementation constraint: the `id` passed to `registerPanel()` or
`registerMenuItem()` must be a stable, hardcoded string within the app — not
a UUID or timestamp. Apps must document which IDs they register.

Persistence of user customizations is explicitly deferred. When that work begins,
a separate `AppResourcePreferenceStore` (persisted to IndexedDB) keyed by the
resource identity triple should be introduced alongside the runtime registry,
not inside it.

### 6.6 Context Menu Unified Design

`contextMenu` follows the same factory-only, mount()-only pattern as
`resource`. `useContextMenuApi` has been declared in `packages/api-types`
and documented in `Api.md`, but this spec replaces it with a lifecycle-bound
model that guarantees per-app cleanup. Because the feature has **not been
publicly released** to external consumers, the hook and its Module Federation
expose are deleted immediately in this rollout — no deprecation period is
needed.

#### 6.6.0 Deletion of `useContextMenuApi()` and `cyweb/ContextMenuApi`

The following artifacts are **deleted** as part of this implementation:

- `src/app-api/useContextMenuApi.ts` — the hook file
- `src/app-api/useContextMenuApi.test.ts` — its tests
- `src/app-api/index.ts` barrel export for `useContextMenuApi`
- `webpack.config.js` expose `'./ContextMenuApi'`
- `packages/api-types/src/mf-declarations.d.ts` `declare module 'cyweb/ContextMenuApi'`

All documentation referencing these artifacts must be updated in the same
commit. See §8.3 for the complete list.

#### 6.6.1 Unified Access Pattern

| Access path                                    | `appId` bound         | Cleanup guaranteed                  | Who may use it           |
| ---------------------------------------------- | --------------------- | ----------------------------------- | ------------------------ |
| `AppContext.apis.contextMenu` (from `mount()`) | Yes — per-app factory | Yes — via `appLifecycle.ts`         | Plugin apps (React)      |
| `useAppContext().apis.contextMenu` (§6.2.4)    | Yes — per-app factory | Yes — via `appLifecycle.ts`         | Plugin components (React)|
| `window.CyWebApi.contextMenu`                  | No — anonymous        | No — manual `removeContextMenuItem` | Non-React consumers only |

There is no `useContextMenuApi()` React hook.

**Plugin apps (React) must use `AppContext.apis.contextMenu` exclusively.**
Using `window.CyWebApi.contextMenu` from inside a plugin app bypasses the
lifecycle model and risks leaving stale items in the registry when the app is
disabled. This path is reserved for non-React consumers (browser extensions,
LLM agent bridges) that cannot participate in the `mount()` lifecycle.

For plugin components that need to register or remove context menu items in
response to user interaction (e.g., a toggle button), the **recommended
pattern** is to use the `useAppContext()` hook (§6.2.4):

```typescript
// MyPanel.tsx — recommended pattern using AppIdContext
import { useAppContext } from 'cyweb/AppIdContext'

const MyPanel = () => {
  const ctx = useAppContext()
  if (ctx === null) return null

  const handleToggle = () => {
    ctx.apis.contextMenu.addContextMenuItem({
      label: 'My Action',
      targetTypes: ['node'],
      handler: (c) => { /* ... */ },
    })
  }

  return <button onClick={handleToggle}>Toggle</button>
}
```

**Interim: `appState.ts` lifecycle module (deprecated)**

For code that runs outside the React tree (e.g., non-component logic, Web
Workers) where React Context is not available, the `appState.ts` module-scope
pattern remains available as an **interim pattern**. This pattern is explicitly
deprecated and will be removed once all consumers are migrated to
`useAppContext()`.

Create one `appState.ts` per plugin app. All non-component code imports from
it. It is the single source of truth for whether the app is mounted and for
accessing lifecycle-bound APIs outside the React tree:

```typescript
// src/appState.ts — centralized lifecycle state for this plugin app
import type { AppContextApis } from 'cyweb/ApiTypes'

let _apis: AppContextApis | null = null

/** Returns the bound APIs if the app is mounted, null otherwise. */
export const getApis = (): AppContextApis | null => _apis

/** Called only from MyApp.ts lifecycle callbacks. */
export const _setApis = (apis: AppContextApis | null): void => {
  _apis = apis
}
```

```typescript
// src/MyApp.ts — lifecycle callbacks update the central state
import { _setApis } from './appState'

export const MyApp: CyAppWithLifecycle = {
  mount({ apis }) {
    _setApis(apis)
    // Register always-on items here if needed
  },
  unmount() {
    _setApis(null)
  },
}
```

```typescript
// src/components/MyPanel.tsx — any component reads from appState
import { getApis } from '../appState'

const handleToggle = () => {
  const apis = getApis()
  if (apis === null) return // post-mount guard
  const result = apis.contextMenu.addContextMenuItem({
    label: 'My Action',
    targetTypes: ['node'],
    handler: (ctx) => {
      /* ... */
    },
  })
  if (result.success) {
    storedItemId = result.data.itemId
  }
}
```

Benefits over raw `let` variables:

- All lifecycle state lives in one file — easy to audit and reset in tests
- `getApis()` can be replaced with a Jest mock without touching component code
- HMR re-evaluation of component files does not reset the state held in `appState.ts`
- Multiple components in the same app share a single `_setApis` call site

**Scaling to multiple independent toggleable items:** For apps with more than one
dynamically registered item (e.g., separate node, edge, and canvas menu items
controlled by different components), extend `appState.ts` with a `Map`-keyed
registration store rather than a single variable. Single named variables imply
one shared slot and become a bottleneck immediately:

```typescript
// src/appState.ts — keyed registration state scales to any number of items
import type { AppContextApis } from 'cyweb/ApiTypes'

let _apis: AppContextApis | null = null
const _registeredItems = new Map<string, string>() // stable key → itemId

export const getApis = (): AppContextApis | null => _apis
export const getRegisteredItemId = (key: string): string | undefined =>
  _registeredItems.get(key)
export const setRegisteredItemId = (key: string, id: string): void => {
  _registeredItems.set(key, id)
}
export const removeRegisteredItem = (key: string): void => {
  _registeredItems.delete(key)
}
/** Call from unmount() — host clears the store; this clears local refs. */
export const clearAllRegisteredItems = (): void => {
  _registeredItems.clear()
}
export const _setApis = (apis: AppContextApis | null): void => {
  _apis = apis
}
```

```typescript
// MyApp.ts
export const MyApp: CyAppWithLifecycle = {
  mount({ apis }) {
    _setApis(apis)
  },
  unmount() {
    _setApis(null)
    clearAllRegisteredItems()
  },
}

// NodeMenuButton.tsx — owns the 'nodeInspect' slot
const KEY = 'nodeInspect'
const handleRegister = () => {
  const apis = getApis()
  if (apis === null || getRegisteredItemId(KEY) !== undefined) return
  const result = apis.contextMenu.addContextMenuItem({
    label: 'Inspect Node',
    targetTypes: ['node'],
    handler,
  })
  if (result.success) setRegisteredItemId(KEY, result.data.itemId)
}
const handleRemove = () => {
  const apis = getApis()
  const id = getRegisteredItemId(KEY)
  if (apis !== null && id !== undefined) {
    apis.contextMenu.removeContextMenuItem(id)
    removeRegisteredItem(KEY)
  }
}
```

Keys must be stable, hardcoded strings — not generated values. Each component
owns its own key(s); no two components should share a key.

This pattern provides the same interactive capability as the deleted
`useContextMenuApi()` hook, while preserving the `appId` binding and lifecycle
cleanup guarantee.

**Constraint — post-mount only:** `getApis()` returns `null` before `mount()` is
called and after `unmount()`. This pattern is safe for **user-driven event
handlers** (button clicks, menu selections) that fire after the app has been
mounted. It must **not** be used during component initialization — e.g., inside
a `useEffect(fn, [])` at render time — because `mount()` may not have completed
yet when the component first renders (`registerApp` and `mountApp` are called
concurrently; see §6.4.0). Treat a `null` return from `getApis()` as "app not
yet ready" and return early.

**Migration path:** The `appState.ts` pattern is deprecated in favor of
`useAppContext()` (§6.2.4). For plugin components, migrate from:

```typescript
// Before (appState.ts — deprecated)
import { getApis } from '../appState'
const apis = getApis()
if (apis === null) return

// After (useAppContext — recommended)
import { useAppContext } from 'cyweb/AppIdContext'
const ctx = useAppContext()
if (ctx === null) return
// Use ctx.apis directly — always fresh, HMR-safe, testable
```

The `appState.ts` pattern should be retained only for non-component code that
cannot access React Context (e.g., Web Workers, non-React utility modules).

#### 6.6.2 Store Model Changes

**`ContextMenuItemStoreModel.ts`** — `appId` is optional to accommodate the
anonymous `window.CyWebApi.contextMenu` path:

```typescript
export interface RegisteredContextMenuItem extends ContextMenuItemConfig {
  readonly itemId: string
  readonly appId?: string // undefined for window.CyWebApi anonymous registrations
}

export interface ContextMenuItemActions {
  addItem(item: RegisteredContextMenuItem): void
  removeItem(itemId: string): void
  removeAllByAppId(appId: string): void // only removes items where appId matches
}
```

**`ContextMenuItemStore.ts`** — `removeAllByAppId` skips items with no `appId`:

```typescript
removeAllByAppId(appId: string) {
  set((state) => {
    state.items = state.items.filter(
      (item) => item.appId === undefined || item.appId !== appId,
    )
    return state
  })
},
```

#### 6.6.3 API Changes

**`contextMenuApi.ts`** — expose both paths from the same file:

The following logic applies to **both** the factory and the anonymous singleton.
All existing validation semantics from the current implementation are preserved:

- `addContextMenuItem`: empty or whitespace-only label → `fail(InvalidInput)`
- `addContextMenuItem`: omitted `targetTypes` → defaults to `['node', 'edge']`
- `removeContextMenuItem`: unknown `itemId` → `fail(ContextMenuItemNotFound)`

```typescript
// Shared validation helper used by both paths
function validateAndRegister(
  config: ContextMenuItemConfig,
  appId?: string,
): ApiResult<{ itemId: string }> {
  try {
    if (!config.label || config.label.trim() === '') {
      return fail(
        ApiErrorCode.InvalidInput,
        'label is required and must be non-empty',
      )
    }
    const itemId = uuidv4()
    const targetTypes = config.targetTypes ?? DEFAULT_TARGET_TYPES
    useContextMenuItemStore.getState().addItem({
      ...config,
      label: config.label.trim(),
      targetTypes,
      itemId,
      appId, // undefined for anonymous registrations
    })
    return ok({ itemId })
  } catch (e) {
    return fail(ApiErrorCode.OperationFailed, String(e))
  }
}

function removeItem(itemId: string): ApiResult {
  try {
    const items = useContextMenuItemStore.getState().items
    if (!items.some((item) => item.itemId === itemId)) {
      return fail(
        ApiErrorCode.ContextMenuItemNotFound,
        `Context menu item ${itemId} not found`,
      )
    }
    useContextMenuItemStore.getState().removeItem(itemId)
    return ok()
  } catch (e) {
    return fail(ApiErrorCode.OperationFailed, String(e))
  }
}

// Per-app factory (lifecycle-managed, used by host for AppContext)
export const createContextMenuApi = (appId: string): ContextMenuApi => ({
  addContextMenuItem: (config) => validateAndRegister(config, appId),
  removeContextMenuItem: removeItem,
})

// Anonymous singleton — no appId bound, for window.CyWebApi only.
// Plugin apps (React) must NOT use this path; use AppContext.apis.contextMenu instead.
export const contextMenuApi: ContextMenuApi = {
  addContextMenuItem: (config) => validateAndRegister(config, undefined),
  removeContextMenuItem: removeItem,
}
```

The host constructs per-app instances in `useAppManager.ts`:

```typescript
const appApi = {
  ...CyWebApi,
  contextMenu: createContextMenuApi(cyApp.id),
  resource: createResourceApi(cyApp.id),
}
void mountApp(cyApp, { appId: cyApp.id, apis: appApi }, mountedApps.current)
```

`window.CyWebApi.contextMenu` continues to point to the anonymous singleton.

#### 6.6.4 Example App Migration

Existing example apps (`hello-world`, `project-template`) currently call
`useContextMenuApi()` inside React panel components. These must be updated
as a separate task.

**Case A — always-on items (register at mount time):**

```typescript
// Before (React hook in panel component — always-on item via useEffect)
const contextMenuApi = useContextMenuApi()
useEffect(() => {
  const result = contextMenuApi.addContextMenuItem({ label: '...', handler })
  return () => {
    if (result.success) contextMenuApi.removeContextMenuItem(result.data.itemId)
  }
}, [])

// After (register from mount — host auto-cleans on unmount or failure)
mount({ apis }) {
  const result = apis.contextMenu.addContextMenuItem({ label: '...', handler })
  // No need to store itemId: host removes it via removeAllByAppId on unmount
},
```

**Case B — user-toggled items (interactive add/remove from a component):**

**Recommended: use `useAppContext()` (§6.2.4):**

```typescript
// Before (React hook in panel component)
const contextMenuApi = useContextMenuApi()
const itemId = useRef<string | null>(null)

const handleRegister = () => {
  const result = contextMenuApi.addContextMenuItem({ label: '...', handler })
  if (result.success) itemId.current = result.data.itemId
}

// After (useAppContext — recommended)
import { useAppContext } from 'cyweb/AppIdContext'

const MyPanel = () => {
  const ctx = useAppContext()
  const itemId = useRef<string | null>(null)

  const handleRegister = () => {
    if (ctx === null) return
    const result = ctx.apis.contextMenu.addContextMenuItem({
      label: '...',
      handler,
    })
    if (result.success) itemId.current = result.data.itemId
  }
  const handleRemove = () => {
    if (ctx === null || itemId.current === null) return
    ctx.apis.contextMenu.removeContextMenuItem(itemId.current)
    itemId.current = null
  }
  // On app disable, host calls cleanupAllForApp — any un-removed item is auto-cleaned.
}
```

**Interim: use `appState.ts` for non-component code only (deprecated).**
Component-local item IDs can also be tracked in `appState.ts`:

```typescript
// Before (React hook enabled interactive toggle)
const contextMenuApi = useContextMenuApi()
const itemId = useRef<string | null>(null)

const handleRegister = () => {
  const result = contextMenuApi.addContextMenuItem({ label: '...', handler })
  if (result.success) itemId.current = result.data.itemId
}
const handleRemove = () => {
  if (itemId.current !== null)
    contextMenuApi.removeContextMenuItem(itemId.current)
  itemId.current = null
}

// After (appState.ts lifecycle module — see §6.6.1 for full keyed pattern)
// appState.ts — use Map-based keyed state (scales to multiple items)
import type { AppContextApis } from 'cyweb/ApiTypes'
let _apis: AppContextApis | null = null
const _registeredItems = new Map<string, string>()
export const getApis = (): AppContextApis | null => _apis
export const getRegisteredItemId = (key: string): string | undefined =>
  _registeredItems.get(key)
export const setRegisteredItemId = (key: string, id: string): void => {
  _registeredItems.set(key, id)
}
export const removeRegisteredItem = (key: string): void => {
  _registeredItems.delete(key)
}
export const clearAllRegisteredItems = (): void => {
  _registeredItems.clear()
}
export const _setApis = (apis: AppContextApis | null): void => {
  _apis = apis
}

// MyApp.ts
export const MyApp: CyAppWithLifecycle = {
  mount({ apis }) {
    _setApis(apis)
  },
  unmount() {
    _setApis(null)
    clearAllRegisteredItems() // host removed items via removeAllByAppId; clear local refs
  },
}

// MyPanel.tsx — identical interactive behavior, but with cleanup guarantee
const KEY = 'myToggle' // stable, hardcoded key for this component's item
const handleRegister = () => {
  const apis = getApis()
  if (apis === null || getRegisteredItemId(KEY) !== undefined) return
  const result = apis.contextMenu.addContextMenuItem({ label: '...', handler })
  if (result.success) setRegisteredItemId(KEY, result.data.itemId)
}
const handleRemove = () => {
  const apis = getApis()
  const id = getRegisteredItemId(KEY)
  if (apis !== null && id !== undefined) {
    apis.contextMenu.removeContextMenuItem(id)
    removeRegisteredItem(KEY)
  }
}
// On app disable, host calls cleanupAllForApp — any un-removed item is auto-cleaned.
```

### 6.7 Declarative `resources` Field and `CyApp.components` Made Optional

#### 6.7.1 Declarative `resources` on `CyAppWithLifecycle`

Most plugins have a fixed set of resources that do not change at runtime. For
these apps, implementing `mount()` solely to call `registerPanel()` is
unnecessary boilerplate. The `resources` field provides a declarative shorthand:

**`ResourceDeclaration` type** is defined in `src/app-api/types/AppResourceTypes.ts`
(not in `CyApp.ts`) because it references `React.ComponentType`, which must not
be imported in the model layer (`src/models/` must stay free of React imports):

```typescript
// src/app-api/types/AppResourceTypes.ts

/** Declarative resource entry — same fields as RegisterResourceEntry. */
export interface ResourceDeclaration {
  slot: ResourceSlot
  id: string
  title?: string
  order?: number
  group?: string
  requires?: RegisteredAppResource['requires']
  component: React.ComponentType<any> // typically lazy(() => import(...))
  errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>
  closeOnAction?: boolean // for 'apps-menu' slot
}
```

**`CyApp.ts`** imports `ResourceDeclaration` as a **type-only import** from the
app-api types layer. This preserves the model layer's framework-agnostic
constraint — no runtime React import is introduced:

```typescript
// src/models/AppModel/CyApp.ts

import type { ResourceDeclaration } from '../../app-api/types/AppResourceTypes'

export interface CyApp {
  id: string
  name: string
  description?: string
  version?: string
  /** @deprecated Prefer `resources` (§6.7.1) or runtime registration via mount(). */
  components?: ComponentMetadata[]
  status?: AppStatus
}

export interface CyAppWithLifecycle extends CyApp {
  apiVersion?: string

  /**
   * Declarative resource registrations. The host registers these automatically
   * when the app is loaded — no mount() implementation needed. Resources
   * declared here follow the same slot model, visibility rules, and cleanup
   * semantics as runtime-registered resources.
   *
   * For dynamic registration (conditional, user-driven), use
   * apis.resource.registerPanel() from mount() instead.
   */
  resources?: ResourceDeclaration[]

  mount?(context: AppContext): void | Promise<void>
  unmount?(): void | Promise<void>
}
```

**Host behavior:** In `useAppManager.ts`, after `registerApp(cyApp)` stores the
app metadata in `AppStore`, the host inspects `cyApp.resources`. If present,
each entry is registered in `AppResourceStore` with the app's `id` as `appId`,
exactly as if `registerPanel()`/`registerMenuItem()` had been called from
`mount()`. This processing happens in `useAppManager.ts` (not inside
`AppStore.add()`), keeping `AppStore` concerned only with serializable metadata
and `AppResourceStore` with runtime resource state.

```typescript
// useAppManager.ts — declarative resources processing (before mountApp)
registerApp(cyApp)
if ((cyApp as CyAppWithLifecycle).resources) {
  const uiApi = createResourceApi(cyApp.id)
  for (const resource of (cyApp as CyAppWithLifecycle).resources!) {
    if (resource.slot === 'right-panel') {
      uiApi.registerPanel(resource as RegisterPanelOptions)
    } else if (resource.slot === 'apps-menu') {
      uiApi.registerMenuItem(resource as RegisterMenuItemOptions)
    }
  }
}
void mountApp(cyApp, { appId: cyApp.id, apis: appApi }, mountedApps.current)
```

This happens synchronously before `mount()` is called, so declarative resources
are available to renderers immediately.

**Coexistence with `mount()`:** Apps may declare `resources` **and** implement
`mount()`. Declarative resources are registered first; `mount()` can register
additional dynamic resources. If a `mount()`-registered resource has the same
`(appId, slot, id)` as a declarative one, upsert semantics apply (the runtime
registration wins).

**Minimal app example:**

```typescript
export const MyApp: CyAppWithLifecycle = {
  id: 'myApp',
  name: 'My App',
  version: packageJson.version,
  resources: [
    {
      slot: 'right-panel',
      id: 'main',
      title: 'My Panel',
      requires: { network: true },
      component: lazy(() => import('./components/MyPanel')),
    },
    {
      slot: 'apps-menu',
      id: 'action',
      component: lazy(() => import('./components/MyAction')),
      closeOnAction: true, // auto-close menu after action
    },
  ],
  // No mount() needed — resources are registered declaratively
}
```

Compare this with the previous minimum viable plugin, which required:
- `components: [...]` with `ComponentType.Panel` / `ComponentType.Menu`
- Separate `lazy()` imports for each component
- Understanding the legacy `ComponentMetadata` type

The `resources` field uses the same slot model and types as the runtime API,
providing a consistent mental model whether declaring or registering.

**Cleanup:** Declarative resources are cleaned up by the same
`cleanupAllForApp(appId)` path as runtime-registered resources. No special
handling is needed.

#### 6.7.2 `CyApp.components` Made Optional

`CyApp.components` is now optional with a `@deprecated` JSDoc. Apps should
use `resources` (declarative) or `mount()` (imperative) instead.

Host renderers that iterate `CyApp.components` must guard against `undefined`:

```typescript
const components = app.components ?? []
```

Existing apps that declare `components` continue to work without changes.

## 7. Integration with Existing App Model

### 7.1 `CyApp.components`

`CyApp.components` remains supported for backward compatibility.

During migration:

- Existing apps may continue to declare panels and menu items in
  `CyApp.components`
- New apps may use runtime registration only
- Mixed mode is supported

The host treats runtime registration as the preferred source when the same
resource is declared in both places.

### 7.2 Why Export Discovery Is Rejected

This design explicitly rejects automatic discovery of remote exports.

Reasons:

- Webpack Module Federation does not provide a clean, stable export enumeration
  contract for this use case
- The host still needs resource metadata such as `slot`, `order`, `group`, and
  ownership
- Export discovery would be harder to validate, test, and debug than explicit
  runtime registration

Runtime registration keeps ownership, metadata, and lifecycle in one place.

## 8. Implementation Outline

### 8.1 New Files

```text
src/app-api/core/resourceApi.ts             — factory, batch, introspection (§6.2)
src/app-api/types/AppResourceTypes.ts          — ResourceSlot, PanelHostProps, MenuItemHostProps,
                                                RegisterResourceEntry, RegisteredResourceInfo,
                                                ResourceVisibilityResult, ResourceDeclaration
src/app-api/AppIdContext.tsx                  — AppIdProvider + useAppContext() hook (§6.2.4)
src/data/hooks/stores/AppResourceStore.ts
src/data/hooks/stores/AppCleanupRegistry.ts  — extensible cleanup registry (§6.4.1)
src/models/AppModel/RegisteredAppResource.ts   — includes errorFallback, closeOnAction fields
src/models/StoreModel/AppResourceStoreModel.ts
src/features/AppManager/PluginErrorBoundary.tsx — supports customFallback prop (§6.3.4)
```

**`AppResourceStoreModel.ts` interface:**

```typescript
// src/models/StoreModel/AppResourceStoreModel.ts

import type { RegisteredAppResource, ResourceSlot } from '../AppModel/RegisteredAppResource'

export interface AppResourceState {
  readonly resources: RegisteredAppResource[]
}

export interface AppResourceActions {
  /**
   * Insert or replace a resource. If a resource with the same
   * (appId, slot, id) triple exists, it is replaced in place.
   */
  upsertResource(resource: RegisteredAppResource): void

  /** Remove a specific resource by identity triple. */
  removeResource(appId: string, slot: ResourceSlot, id: string): void

  /** Check if a resource with the given identity exists. */
  hasResource(appId: string, slot: ResourceSlot, id: string): boolean

  /** Remove all resources registered by the given app. */
  removeAllByAppId(appId: string): void
}

export type AppResourceStore = AppResourceState & AppResourceActions
```

Note: `src/app-api/useResourceApi.ts` is **not** created in this rollout.
Resource registration is available via `AppContext.apis.resource` in `mount()`
or via `useAppContext().apis.resource` in plugin components (§6.2.4).

### 8.2 Updated Files

```text
src/app-api/types/AppContext.ts
  — change AppContext.apis from CyWebApiType to new AppContextApis type
  — remove the "apis is the same singleton as window.CyWebApi" note (no longer
    true: AppContext.apis includes the per-app resource and contextMenu bindings)
  — add AppContextApis interface (extends CyWebApiType, resource required)
  — update AppContext.apis JSDoc to describe the per-app nature of the object

src/app-api/core/index.ts
  — CyWebApiType does NOT get a resource field; resource lives on AppContextApis only

src/app-api/core/contextMenuApi.ts
  — replace singleton with createContextMenuApi(appId) factory
  — expose anonymous singleton (no appId) for window.CyWebApi.contextMenu only
  — appId is stored as optional field on registered items
  — preserve existing validation: empty label → fail(InvalidInput),
    omitted targetTypes → default ['node', 'edge'],
    unknown itemId on remove → fail(ContextMenuItemNotFound)

webpack.config.js
  — remove './ContextMenuApi' expose (hook is deleted; no MF module needed)
  — add './AppIdContext' expose: './src/app-api/AppIdContext.tsx'

src/app-api/types/index.ts
  — re-export ResourceApi, ResourceSlot, PanelHostProps, MenuItemHostProps,
    RegisterPanelOptions, RegisterMenuItemOptions, RegisterResourceEntry,
    RegisteredResourceInfo, ResourceVisibilityResult, ResourceDeclaration
  — re-export updated ContextMenuApi
  — re-export AppContextApis

src/app-api/types/ApiResult.ts
  — add ResourceNotFound error code (DuplicateResource is not needed — see §8.5)

packages/api-types/src/index.ts
  — type window.CyWebApi as CyWebApiType directly (no Omit needed — CyWebApiType
    is already the window-safe shape with no resource field):
      declare global { interface Window { CyWebApi: CyWebApiType } }
    TypeScript will reject window.CyWebApi.resource because the field does not
    exist on CyWebApiType at all.
  — remove declare module 'cyweb/ContextMenuApi' (see §8.3)

packages/api-types/README.md
  — remove import code example for useContextMenuApi (line 93)
  — remove cyweb/ContextMenuApi row from the remotes table (line 127)

src/features/Workspace/SidePanel/SidePanel.tsx
  — replace numeric useState(0) tab selection with resource-identity-based
    useState<string | null>(null) as specified in §6.3.2
  — resolve selectedResourceId to a numeric index for MUI <Tabs> at render time
  — fall back to first visible resource when selected resource is hidden or removed

src/features/Workspace/SidePanel/TabContents.tsx
  — read AppResourceStore (slot: 'right-panel') in addition to CyApp.components
  — wrap each resource in PluginErrorBoundary
  — apply order sort and requires.network evaluation
  — expose resourceId alongside each rendered panel for SidePanel.tsx identity tracking

src/features/ToolBar/AppMenu/index.tsx
  — read AppResourceStore (slot: 'apps-menu') in addition to CyApp.components
  — wrap each resource in PluginErrorBoundary (with customFallback support)
  — apply order sort and requires.network evaluation
  — implement closeOnAction: auto-close dropdown after menu item action (§6.1.2)

src/data/hooks/stores/useAppManager.ts
  — construct per-app contextMenu and resource APIs
  — pass them in AppContext to mountApp
  — in registerApp: if cyApp.resources is defined, register each entry in
    AppResourceStore (§6.7.1) before calling mountApp
  — store per-app apis in a Map<string, AppContextApis> for AppIdProvider

src/data/hooks/stores/appLifecycle.ts
  — replace hardcoded per-store removeAllByAppId calls with
    cleanupAllForApp(appId) from AppCleanupRegistry (§6.4.1)

src/models/AppModel/CyApp.ts
  — make components optional, mark @deprecated
  — add resources?: ResourceDeclaration[] to CyAppWithLifecycle (§6.7.1)

src/models/StoreModel/ContextMenuItemStoreModel.ts
  — add appId to RegisteredContextMenuItem
  — add removeAllByAppId to ContextMenuItemActions

src/data/hooks/stores/ContextMenuItemStore.ts
  — implement removeAllByAppId (skips items with appId === undefined)
```

### 8.3 Breaking Change Migration Surface

`cyweb/ContextMenuApi` and the `useContextMenuApi()` hook have not been
publicly released to external consumers. They are **deleted** in this rollout.
All of the following must be updated atomically.

```text
src/app-api/useContextMenuApi.ts
  — delete file

src/app-api/useContextMenuApi.test.ts
  — delete file

src/app-api/index.ts:7
  — remove barrel export:
    export { useContextMenuApi } from './useContextMenuApi'

webpack.config.js:150
  — remove expose entry:
    './ContextMenuApi': './src/app-api/useContextMenuApi.ts'

packages/api-types/src/mf-declarations.d.ts:61
  — remove declaration:
    declare module 'cyweb/ContextMenuApi' { ... }

packages/api-types/README.md:93
  — remove the import code example that uses useContextMenuApi

packages/api-types/README.md:127
  — remove the cyweb/ContextMenuApi row from the remotes table

docs/design/module-federation/specifications/app-api-specification.md
  — update any section describing contextMenuApi / useContextMenuApi
    to reflect the factory pattern and the removal of the React hook

docs/design/module-federation/module-federation-design.md
  — update any reference to cyweb/ContextMenuApi or useContextMenuApi
    to reflect the new access pattern (AppContext.apis.contextMenu)
```

#### 8.3.1 Non-public but Required Follow-up

These are not published artifacts, but they must be updated in the same
implementation pass.

```text
docs/design/module-federation/checklists/implementation-checklist-phase1.md:370
  — delete task: "Create src/app-api/useContextMenuApi.ts"
    (file is now deleted, not created)

docs/design/module-federation/checklists/implementation-checklist-phase1.md:378
  — delete task: "Create src/app-api/useContextMenuApi.test.ts"
    (file is now deleted, not created)

docs/design/module-federation/checklists/implementation-checklist-phase1.md:474
  — remove ContextMenuApi from the "12 webpack exposes" checklist item
    (the expose is deleted; 11 exposes remain)

docs/design/module-federation/checklists/implementation-checklist-phase1.md:475
  — update: "AppContext.apis typed as CyWebApiType" → "AppContext.apis typed as
    AppContextApis (distinct from CyWebApiType; resource is required)"

cytoscape-web-app-examples/hello-world/src/components/ContextMenuSection.tsx
  — migrate from useContextMenuApi() hook to useAppContext() pattern (§6.2.4)
    or Case A/B patterns in §6.6.4

cytoscape-web-app-examples/project-template/src/components/TemplateContextMenuExample.tsx:6
  — remove: import { useContextMenuApi } from 'cyweb/ContextMenuApi'
  — migrate to useAppContext() pattern (§6.2.4) or
    Case A/B patterns in §6.6.4

packages/api-types/src/CyWebApi.ts
  — re-export AppContextApis alongside CyWebApiType so plugin authors can
    type their mount() context argument correctly without extra imports:
      export type { CyWebApiType, AppContextApis } from '../../../src/app-api/types'
  — update the file header comment to explain the two-type model:
      CyWebApiType   = window.CyWebApi shape — no resource (window-safe)
      AppContextApis = AppContext.apis shape — resource required (mount-safe)
      Both are intentionally distinct; there is no single canonical API shape.

packages/api-types/src/mf-declarations.d.ts
  — add declaration: declare module 'cyweb/AppIdContext' (§6.2.4)

src/app-api/api_docs/Api.md:58
  — remove table row:
    | `cyweb/ContextMenuApi` | `useContextMenuApi()` | `.contextMenu` | 1h |

src/app-api/api_docs/Api.md:663
  — remove (or retitle and rewrite) the full ContextMenuApi section that begins:
    ## ContextMenuApi (`cyweb/ContextMenuApi`)
    Replace with a brief note pointing to AppContext.apis.contextMenu
    and useAppContext().apis.contextMenu.

src/app-api/CLAUDE.md:45
  — remove file-tree entry:
    ├── useContextMenuApi.ts         ← React Hook: returns contextMenuApi (thin wrapper)

src/app-api/CLAUDE.md:321
  — remove webpack exposes entry:
    './ContextMenuApi':  './src/app-api/useContextMenuApi.ts',

src/app-api/CLAUDE.md
  — add AppIdContext.tsx to file-tree listing
  — add './AppIdContext' to webpack exposes listing
```

### 8.5 New Error Codes

Add to `ApiErrorCode` in `src/app-api/types/ApiResult.ts`:

```typescript
/** The specified resource ID was not found in the registry */
ResourceNotFound: 'RESOURCE_NOT_FOUND',
```

Note: `DuplicateResource` is no longer needed — `registerPanel` and
`registerMenuItem` use upsert semantics (§6.2.1, §6.2.3) and silently replace
existing resources with the same `(appId, slot, id)` triple.

### 8.6 Testing Patterns

#### Store tests (`AppResourceStore.spec.ts`)

```typescript
import { act } from '@testing-library/react'
import { useAppResourceStore } from './AppResourceStore'

describe('AppResourceStore', () => {
  beforeEach(() => {
    useAppResourceStore.setState({ resources: [] })
  })

  it('upserts a resource (insert on first call)', () => {
    act(() => {
      useAppResourceStore.getState().upsertResource({
        id: 'P1',
        appId: 'app1',
        slot: 'right-panel',
        component: {} as unknown, // component is opaque to the store
      })
    })
    expect(useAppResourceStore.getState().resources).toHaveLength(1)
  })

  it('upserts a resource (replaces on second call with same identity)', () => {
    act(() => {
      const store = useAppResourceStore.getState()
      store.upsertResource({
        id: 'P1',
        appId: 'app1',
        slot: 'right-panel',
        title: 'Old',
        component: {},
      })
      store.upsertResource({
        id: 'P1',
        appId: 'app1',
        slot: 'right-panel',
        title: 'New',
        component: {},
      })
    })
    const { resources } = useAppResourceStore.getState()
    expect(resources).toHaveLength(1)
    expect(resources[0].title).toBe('New')
  })

  it('removes all resources for an appId', () => {
    act(() => {
      const store = useAppResourceStore.getState()
      store.upsertResource({
        id: 'P1',
        appId: 'app1',
        slot: 'right-panel',
        component: {},
      })
      store.upsertResource({
        id: 'P2',
        appId: 'app2',
        slot: 'right-panel',
        component: {},
      })
      store.removeAllByAppId('app1')
    })
    const { resources } = useAppResourceStore.getState()
    expect(resources).toHaveLength(1)
    expect(resources[0].appId).toBe('app2')
  })
})
```

#### Core API tests (`resourceApi.test.ts`)

```typescript
import { createResourceApi } from './resourceApi'
import { useAppResourceStore } from '../../data/hooks/stores/AppResourceStore'

jest.mock('../../data/hooks/stores/AppResourceStore', () => ({
  useAppResourceStore: { getState: jest.fn() },
}))

describe('createResourceApi', () => {
  const mockStore = {
    resources: [],
    hasResource: jest.fn(() => false),
    addResource: jest.fn(),
    upsertResource: jest.fn(),
    removeAllByAppId: jest.fn(),
    removeResource: jest.fn(),
  }

  beforeEach(() => {
    jest.mocked(useAppResourceStore.getState).mockReturnValue(mockStore as any)
    jest.clearAllMocks()
  })

  it('getSupportedSlots returns right-panel and apps-menu', () => {
    const api = createResourceApi('app1')
    expect(api.getSupportedSlots()).toEqual(['right-panel', 'apps-menu'])
  })

  it('registerPanel returns ok with resourceId', () => {
    const api = createResourceApi('app1')
    const result = api.registerPanel({ id: 'P1', component: {} as any })
    expect(result.success).toBe(true)
    expect(mockStore.upsertResource).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'P1',
        appId: 'app1',
        slot: 'right-panel',
      }),
    )
  })

  it('registerPanel returns fail(InvalidInput) for empty id', () => {
    const api = createResourceApi('app1')
    const result = api.registerPanel({ id: '', component: {} as any })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('INVALID_INPUT')
  })

  it('registerPanel with same id upserts (replaces) the existing resource', () => {
    const api = createResourceApi('app1')
    api.registerPanel({ id: 'P1', title: 'Old', component: {} as any })
    const result = api.registerPanel({ id: 'P1', title: 'New', component: {} as any })
    expect(result.success).toBe(true)
    expect(mockStore.upsertResource).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'P1', title: 'New' }),
    )
  })

  it('unregisterAll delegates to removeAllByAppId with bound appId', () => {
    const api = createResourceApi('app1')
    api.unregisterAll()
    expect(mockStore.removeAllByAppId).toHaveBeenCalledWith('app1')
  })
})
```

#### Context Menu factory tests (`contextMenuApi.test.ts`)

```typescript
describe('createContextMenuApi', () => {
  it('stores appId on registered items', () => {
    const api = createContextMenuApi('app1')
    api.addContextMenuItem({ label: 'Test', handler: jest.fn() })
    const items = useContextMenuItemStore.getState().items
    expect(items[0].appId).toBe('app1')
  })
})

describe('contextMenuApi (anonymous singleton)', () => {
  it('stores no appId on registered items', () => {
    contextMenuApi.addContextMenuItem({ label: 'Test', handler: jest.fn() })
    const items = useContextMenuItemStore.getState().items
    expect(items[0].appId).toBeUndefined()
  })
})

describe('ContextMenuItemStore.removeAllByAppId', () => {
  it('removes only items with matching appId', () => {
    const store = useContextMenuItemStore.getState()
    store.addItem({
      itemId: 'a',
      appId: 'app1',
      label: 'A',
      handler: jest.fn(),
    })
    store.addItem({
      itemId: 'b',
      appId: 'app2',
      label: 'B',
      handler: jest.fn(),
    })
    store.addItem({ itemId: 'c', label: 'C', handler: jest.fn() }) // anonymous
    store.removeAllByAppId('app1')
    const ids = store.items.map((i) => i.itemId)
    expect(ids).toEqual(['b', 'c']) // anonymous item survives
  })
})
```

#### `appLifecycle.ts` cleanup tests

These tests mock `cleanupAllForApp` from `AppCleanupRegistry` — not individual
stores. This verifies that `appLifecycle.ts` delegates to the cleanup registry
rather than calling stores directly.

```typescript
import { cleanupAllForApp } from './AppCleanupRegistry'

jest.mock('./AppCleanupRegistry', () => ({
  cleanupAllForApp: jest.fn(),
}))

it('calls cleanupAllForApp when unmountApp is invoked', async () => {
  const app = { id: 'app1', name: 'App', unmount: jest.fn() } as any
  const mounted = new Set(['app1'])
  await unmountApp(app, mounted)
  expect(cleanupAllForApp).toHaveBeenCalledWith('app1')
  expect(app.unmount).toHaveBeenCalled()
})

it('calls cleanupAllForApp when mountApp throws (partial registration cleanup)', async () => {
  const app = {
    id: 'app1',
    name: 'App',
    mount: jest.fn().mockRejectedValue(new Error('boom')),
  } as any
  await expect(
    mountApp(app, { appId: 'app1', apis: {} as any }, new Set()),
  ).rejects.toThrow('boom')
  expect(cleanupAllForApp).toHaveBeenCalledWith('app1')
})

it('does not call cleanupAllForApp for apps without mount()', async () => {
  const app = { id: 'app1', name: 'App' } as any
  const mounted = new Set<string>()
  await mountApp(app, { appId: 'app1', apis: {} as any }, mounted)
  expect(cleanupAllForApp).not.toHaveBeenCalled()
  expect(mounted.has('app1')).toBe(true) // added to mountedApps immediately
})
```

### 8.7 Migration Examples

**Path A — Declarative (recommended for fixed resources, zero boilerplate):**

```typescript
import { lazy } from 'react'
import packageJson from '../package.json'

export const TemplateApp: CyAppWithLifecycle = {
  id: 'template',
  name: 'Template App',
  version: packageJson.version,
  resources: [
    {
      slot: 'right-panel',
      id: 'TemplatePanel',
      title: 'Template',
      requires: { network: true },
      component: lazy(() => import('./components/TemplatePanel')),
    },
    {
      slot: 'apps-menu',
      id: 'TemplateAction',
      component: lazy(() => import('./components/TemplateMenuItem')),
      closeOnAction: true, // host auto-closes dropdown after action
    },
  ],
  // No mount() or unmount() needed — host manages everything
}
```

**Path B — Batch registration in mount() (for conditional/dynamic resources):**

```typescript
mount({ appId, apis }) {
  apis.resource.registerAll([
    {
      slot: 'right-panel',
      id: 'TemplatePanel',
      title: 'Template',
      requires: { network: true },
      component: TemplatePanel,
    },
    {
      slot: 'apps-menu',
      id: 'TemplateAction',
      component: TemplateMenuItem,
      closeOnAction: true,
    },
  ])
},
// No unmount() needed — host cleanup is guaranteed
```

**Path C — Individual registration (for maximum control):**

```typescript
mount({ appId, apis }) {
  if (apis.resource.getSupportedSlots().includes('right-panel')) {
    apis.resource.registerPanel({
      id: 'TemplatePanel',
      title: 'Template',
      requires: { network: true },
      component: TemplatePanel,
    })
  }
},
```

## 9. Verification

The implementation is complete only when all of the following are verified:

1. A runtime-registered panel appears without a `CyApp.components` declaration
2. A runtime-registered menu item appears without a `CyApp.components`
   declaration
3. Disabling an app removes all of its runtime resources immediately
4. Re-enabling the app re-registers its resources correctly
5. A failed `mount()` does not leave orphaned panels or menu items behind
6. Existing manifest-only apps still render correctly
7. An app cannot register a resource under another app's `appId`
8. Registering the same `(appId, slot, id)` twice **upserts** (replaces) the
   existing resource and returns `ok` — no `DuplicateResource` error
9. `window.CyWebApi.resource` is `undefined` at runtime
10. `getSupportedSlots()` returns `['right-panel', 'apps-menu']`
11. A panel registered with `requires.network = true` is hidden when no network
    is loaded and visible when one is loaded
12. A broken panel component is contained by `PluginErrorBoundary` — other
    panels in the same slot continue to render
13. Disabling an app removes its context menu items (via `removeAllByAppId`)
14. Context menu items registered by app A are not removed when app B is disabled
15. When a visible panel is hidden by `requires.network`, the tab selection moves
    to the first visible panel and does not silently jump to a different panel
16. Selecting a panel, then adding a new panel before it, leaves the originally
    selected panel still selected (index-shift regression test)
17. `window.CyWebApi.resource` is `undefined`; `AppContext.apis.resource` is
    a bound `ResourceApi` instance inside `mount()`
18. `window.CyWebApi.contextMenu` (anonymous path) registers items with
    `appId === undefined`; `removeAllByAppId` does not remove them
19. Items registered via `AppContext.apis.contextMenu` carry the correct
    `appId` and are removed by `removeAllByAppId` on app disable
20. TypeScript compile check: `AppContext.apis.resource.registerPanel(...)` has
    no type error (resource is non-optional on `AppContextApis`)
21. TypeScript compile check: `window.CyWebApi.resource` causes a type error
    (resource is absent from the `window.CyWebApi` type declaration)
22. `addContextMenuItem` with empty label returns `fail(InvalidInput)` — same
    behavior as before the factory refactor
23. `addContextMenuItem` with omitted `targetTypes` registers with default
    `['node', 'edge']` — same behavior as before
24. `removeContextMenuItem` with an unknown `itemId` returns
    `fail(ContextMenuItemNotFound)` — same behavior as before
25. `useAppContext()` returns `{ appId, apis }` when rendered inside a
    plugin resource wrapped by `AppIdProvider`
26. `useAppContext()` returns `null` when rendered outside the provider
    (test isolation, standalone rendering)
27. `AppCleanupRegistry.cleanupAllForApp(appId)` invokes all registered
    cleanup functions and does not throw even if one function fails
28. Adding a new store with `registerAppCleanup` requires no changes to
    `appLifecycle.ts` — the new store's cleanup is automatically included
29. `import { useContextMenuApi } from 'cyweb/ContextMenuApi'` causes a
    TypeScript error (the module declaration no longer exists)
30. Upsert: re-registering a panel with a new `title` updates the title
    in the store without changing the `resourceId`, preserving tab selection
31. `registerAll()` registers multiple resources in one call; entries that fail
    validation are skipped (logged) but do not block other entries
32. `getRegisteredResources()` returns only resources registered by the calling
    app (scoped by factory-bound `appId`)
33. `getResourceVisibility('myPanel')` (slot-local id, not full triple) returns
    `{ registered: true, visible: false, hiddenReason: 'requires-network' }`
    when the panel requires a network but none is loaded
34. `registerPanel({ id: 'x', component: 'notAFunction' as any })` returns
    `fail(InvalidInput)` with a message indicating `component` must be a function
35. A panel registered with a custom `errorFallback` displays the custom
    fallback (not the host default) when the component throws
36. A menu item registered with `closeOnAction: true` causes the Apps dropdown
    to close automatically after the item's action fires, without the plugin
    calling `handleClose`
37. An app with `resources: [...]` and no `mount()` renders all declared resources
    after `registerApp` without requiring lifecycle hooks
38. An app with both `resources` and `mount()` sees declarative resources first;
    `mount()` can upsert over them

## 10. Decision Summary

Panels and app menu items can be upgraded to a context-menu-like model, but not
through hidden export discovery. A clean implementation requires a first-class
runtime registry, explicit app ownership, and host-managed cleanup.

This specification adopts that model and keeps `CyApp.components` as a
backward-compatible path during migration.

Key design decisions:

- **Slot model**: `slot: ResourceSlot` replaces `kind`, separating resource type
  from placement so new UI locations can be added as new slot values
- **Per-slot props**: `PanelHostProps` and `MenuItemHostProps` define the host's
  injection contract per slot; renderers cast `component: unknown` to the slot
  type at the call site
- **`component: unknown` in store**: keeps store model free of React imports;
  only renderers (`TabContents.tsx`, `AppMenu/index.tsx`) import React types
- **Factory pattern**: `createResourceApi(appId)` and `createContextMenuApi(appId)`
  bind `appId` at construction, preventing cross-app resource spoofing
- **`AppCleanupRegistry` as extensible cleanup point**: stores register their
  own cleanup functions; `appLifecycle.ts` calls `cleanupAllForApp(appId)` once
  — adding a new registrable resource type requires no changes to appLifecycle
- **Upsert semantics for registration**: `registerPanel` and `registerMenuItem`
  replace existing resources with the same `(appId, slot, id)` triple in place,
  avoiding flicker and preserving tab selection state
- **Capability negotiation**: `getSupportedSlots()` lets apps register
  conditionally without hardcoding slot names
- **Error boundaries**: every plugin resource is wrapped in `PluginErrorBoundary`
  to isolate rendering failures
- **Visibility flags**: `requires` declarative flags let apps express contextual
  visibility rules without reimplementing host state checks
- **Ordering groups**: `order` and `group` are stored on every resource; `group`
  is ignored by renderers in the first rollout but available for future use
- **Stable resource identity**: `(appId, slot, id)` is the persistence key for
  future user customization; plugin authors must use stable, hardcoded IDs
- **Context menu unified design**: `contextMenu` follows the same factory-only,
  mount()-only pattern as `resource`; `useContextMenuApi()` hook and
  `cyweb/ContextMenuApi` expose are **deleted** (not deprecated) because the
  feature has not been publicly released; `appId` is optional in
  `RegisteredContextMenuItem` to support the `window.CyWebApi.contextMenu`
  anonymous path; `removeAllByAppId` skips items with `appId === undefined` so
  anonymous registrations are never auto-cleaned
- **Anonymous path reserved for non-React consumers**: `window.CyWebApi.contextMenu`
  is prohibited in plugin apps (React); plugin components that need interactive
  add/remove behavior store the `apis` object received in `mount()` at module
  scope and call it from component event handlers (see §6.6.1)
- **Anonymous singleton is a plain object literal**: `contextMenuApi` is
  implemented as a standalone object that omits `appId` from `addItem` calls —
  not via a pseudo-`.__anonymous__` accessor on `createContextMenuApi`
- **`cyweb/ContextMenuApi` migration resource spans 9 public artifacts**: the two
  deleted files (`useContextMenuApi.ts`, `useContextMenuApi.test.ts`), the
  internal barrel (`index.ts:7`), webpack expose, `mf-declarations.d.ts`,
  `README.md` (×2), `app-api-specification.md`, `module-federation-design.md`
  — all must be updated atomically; §8.3.1 lists 11 additional non-public
  follow-ups: checklist (×4), example apps (×2), `CyWebApi.ts` (×1),
  `Api.md` (×2), `CLAUDE.md` (×2) (see §8.3)
- **mount() ordering gap acknowledged**: `CyApp.components` resources appear
  immediately after `registerApp`; runtime resources appear after `mount()`
  resolves; `mount()` must complete registrations synchronously to minimise the
  gap; a future `mountedAppIds` tracking mechanism is documented as Future Work
- **`AppIdContext` provides `appId` to plugin components**: the host wraps
  every plugin resource in `AppIdProvider`; plugin components use
  `useAppContext()` to access `appId` and the per-app `apis` object — this
  eliminates the need for module-scope state in most cases
- **No `useResourceApi` hook in v1**: resource registration is available from
  `mount()` or via `useAppContext().apis.resource` in plugin components
- **`AppContextApis` is a distinct type from `CyWebApiType`**: `AppContext.apis`
  is typed as `AppContextApis` (not `CyWebApiType`), so `resource` is
  **required** (not optional) inside `mount()`; TypeScript prevents mount-time
  code from needing an undefined-check on `apis.resource`
- **`contextMenuApi` validation semantics preserved**: factory and anonymous
  singleton share the same validation logic — empty label → `fail(InvalidInput)`;
  omitted `targetTypes` → default `['node', 'edge']`; unknown itemId →
  `fail(ContextMenuItemNotFound)` — these are not changed by the factory refactor
- **`CyWebApiType` is the window-safe shape (Model A)**: `resource` is absent
  from `CyWebApiType` by design; `window.CyWebApi` is declared as `CyWebApiType`
  directly — no `Omit` needed or used anywhere
- **`appState.ts` lifecycle module is an interim pattern (deprecated)**: raw
  top-level `let` variables are deprecated; `useAppContext()` is the recommended
  pattern for plugin components; `appState.ts` remains available only for
  non-component code that cannot access React Context
- **mount() duration warning is the v1 safeguard**: `mountApp` measures elapsed
  time and logs a warning via `logApp.warn` if `mount()` takes more than 100ms;
  `mountedAppIds` rendering gate is the next-iteration concrete task
- **Apps without `mount()` are treated as mounted immediately**: `mountApp` adds
  `cyApp.id` to `mountedApps` in the early-return path so apps using only
  `CyApp.components` are never blocked by a future `mountedAppIds` gate
- **`appState.ts` uses `Map<string, string>` keyed registration state**: a single
  named variable per item does not scale; keys are stable hardcoded strings owned
  per component; `clearAllRegisteredItems()` is called from `unmount()`
- **Module-scope pattern is post-mount only**: `getApis()` returns `null` before
  `mount()` completes; must only be called from user-driven event handlers, never
  during component initialization
- **`AppContext.apis` is no longer the same object as `window.CyWebApi`**:
  `AppContext.ts` documentation updated; `packages/api-types` Window declaration
  updated to reflect that `resource` is absent on `window.CyWebApi`
- **`CyApp.components` made optional**: apps using only runtime registration
  need not declare an empty array
- **`window.CyWebApi.resource` is `undefined`**: the API is only available in
  the per-app `AppContext.apis` passed to `mount()`
- **Resource-identity tab selection**: `SidePanel.tsx` switches from numeric
  index to `resourceId` string for selected tab; prevents silent panel-jump when
  panels are hidden or reordered
- **`PluginErrorBoundary` uses `react-error-boundary`**: consistent with the
  existing `ErrorHandler.tsx` pattern; no new class component introduced
- **Cleanup scope is explicit**: host-owned cleanup applies only to registrations
  made via `AppContext.apis` in `mount()`; callers using the anonymous
  `window.CyWebApi.contextMenu` path are responsible for manual cleanup
- **Declarative `resources` field**: `CyAppWithLifecycle.resources` provides a
  zero-boilerplate path for apps with fixed resources; host registers them
  in `useAppManager.ts` after `registerApp` and before `mountApp`, keeping
  `AppStore` concerned only with serializable metadata; coexists with
  imperative registration via `mount()` using upsert semantics;
  `ResourceDeclaration` is defined in `AppResourceTypes.ts` (not `CyApp.ts`) to
  keep the model layer free of React imports — `CyApp.ts` uses a type-only
  import
- **Batch registration API**: `registerAll()` reduces mount-time boilerplate;
  always returns `ok()` — callers must check `result.data.errors.length` to
  detect partial failures; failed entries are logged and skipped without
  blocking successful ones
- **Introspection API**: `getRegisteredResources()` and
  `getResourceVisibility()` help plugin developers debug registration and
  visibility issues without requiring host-side DevTools
- **`closeOnAction` for menu items**: eliminates the `handleClose` footgun;
  when set to `true`, the host wraps the component in a click-capturing
  container that auto-closes the dropdown via `queueMicrotask` after any
  click, so plugins do not need to call `handleClose` manually
- **Custom error boundary fallback**: `errorFallback` in registration options
  lets plugins provide contextual error messages and "Retry" buttons via
  `resetErrorBoundary`, instead of the generic host fallback
- **Component runtime validation**: `registerPanel` and `registerMenuItem`
  validate that `component` is a function at registration time, catching common
  mistakes (passing strings, objects) before render time

## 11. Implementation Constraints

These constraints must be followed by all implementations of this spec and all
future extensions to the App resource system.

1. **Treat `AppResourceStore` as a generic slot registry.** Do not add
   panel-specific or menu-specific logic to the store itself. Slot-specific
   behavior belongs in renderers.

2. **Add a new `ResourceSlot` value before adding a new UI location.** Do not
   introduce new registry fields or separate stores for new locations.

3. **Define a new `*HostProps` type for every new slot.** Export it from
   `AppResourceTypes.ts` and add it to `@cytoscape-web/api-types`. Renderers must
   inject only the props declared by that type.

4. **Register cleanup via `AppCleanupRegistry`, not in `appLifecycle.ts`.**
   When adding a new registrable resource type, call
   `registerAppCleanup((appId) => store.getState().removeAllByAppId(appId))`
   at module load time. Do **not** add explicit cleanup calls to
   `appLifecycle.ts` — the registry handles this automatically.

5. **Update `getSupportedSlots()` when a new slot is wired.** This keeps
   capability negotiation accurate and allows apps to guard registrations
   conditionally.

6. **Wrap every plugin-owned resource in `PluginErrorBoundary`.** The boundary
   must be per resource, not per slot.

7. **Require stable, hardcoded resource IDs.** Plugin authors must document which
   IDs they register. The `(appId, slot, id)` triple is the future persistence
   key and must not use dynamic values.

8. **Wrap every plugin resource in `AppIdProvider`.** Host renderers must provide
   `AppIdContext` to every plugin component so that `useAppContext()` works
   without additional setup. The provider must be the outermost wrapper, above
   `PluginErrorBoundary`.

9. **Prefer `useAppContext()` over `appState.ts` for plugin components.** The
   `appState.ts` module-scope pattern is an interim solution for non-component
   code only. New plugin components must use `useAppContext()` to access the
   per-app `apis` object.

10. **Validate `component` at registration time.** Both `registerPanel` and
    `registerMenuItem` must verify that `component` is a function or non-null
    object (to accept `React.lazy`, `React.memo`, `React.forwardRef`).
    Return `fail(InvalidInput)` with a descriptive message if
    the check fails.

11. **Pass `customFallback` to `PluginErrorBoundary` when present.** If a
    registered resource has an `errorFallback`, renderers must pass it as the
    `customFallback` prop. The host default is used only when no custom
    fallback is provided.

12. **Process `CyAppWithLifecycle.resources` in `useAppManager.ts`, after
    `registerApp` and before `mountApp`.** Declarative resources must be
    available to renderers immediately, before `mount()` is called. The
    processing goes in `useAppManager.ts` (orchestration layer), NOT inside
    `AppStore.add()` (which handles only serializable metadata). This keeps
    the declarative path fast, synchronous, and separation-of-concerns clean.

13. **Implement `closeOnAction` in the host renderer, not in `PluginErrorBoundary`
    or the store.** The auto-close behavior is rendering logic specific to the
    `apps-menu` slot and belongs in `AppMenu/index.tsx`.
