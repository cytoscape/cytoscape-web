// src/app-api/types/AppResourceTypes.ts
//
// Types for the App Resource runtime registration system (Phase 2).
// Defines the slot model, host-injected props per slot, registration
// options, and the public ResourceApi interface.

import type { AppContextApis } from './AppContext'
import type { ApiError, ApiResult } from './ApiResult'

// ── Slot model ──────────────────────────────────────────────────

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
export type ResourceSlot = 'right-panel' | 'apps-menu'

/**
 * Icon for an 'apps-menu' entry — a raw SVG path `d` string (concatenate
 * multiple subpaths into one `d` if the source icon has several `<path>`
 * elements) plus an optional `viewBox` for icons not authored on the
 * default 0-24 grid. Rendered inside the host's own fixed-size `<SvgIcon>`
 * so sizing/color stay host-controlled. Plain data — never a component.
 *
 * No curated "pick a built-in icon by name" option: too few apps would use
 * it to justify either maintaining a hand-picked list against MUI upgrades,
 * or shipping/dynamically-resolving the full MUI icon set (which also
 * defeats tree-shaking).
 *
 * Duplicated from models/AppModel/RegisteredAppResource.ts to keep the
 * model layer free of app-api imports (same convention as ResourceSlot
 * above). Must stay in sync.
 */
export interface MenuIcon {
  svgPath: string
  viewBox?: string
}

// ── Per-slot host props ─────────────────────────────────────────

/** Props injected by the host into every 'right-panel' component. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PanelHostProps {
  // Empty in first rollout. Future: isActive, requestFocus, closePanel.
}

// ── Registration options ────────────────────────────────────────

export interface RegisterPanelOptions {
  id: string
  /** Display label for the panel tab. Falls back to `id` if omitted. */
  title?: string
  order?: number
  group?: string
  requires?: {
    /** true → resource is hidden unless a network is currently loaded */
    network?: boolean
    /** true → resource is hidden unless at least one element is selected */
    selection?: boolean
  }
  component: React.ComponentType<PanelHostProps>
  /**
   * Custom fallback component rendered when this panel throws a render error.
   * If omitted, the host's default PluginFallback is used.
   */
  errorFallback?: React.ComponentType<{
    error: Error
    resetErrorBoundary: () => void
  }>
}

/**
 * Registers a single entry in the Apps dropdown. Deliberately has no
 * `component` field — the host renders every 'apps-menu' entry itself as a
 * standard MUI menu item, so an app can never inject arbitrary React (and
 * therefore arbitrary sizing/styling) into the shared menu.
 *
 * For anything beyond a plain action — a parameter form, a progress modal,
 * custom hooks/state — call `apis.dialog.open(...)` from `onClick`. That
 * renders in its own modal layer (chrome owned by the host), never inline
 * in the menu.
 */
export interface RegisterMenuItemOptions {
  id: string
  /** Display label for the menu item. */
  label: string
  /** Optional tooltip shown on hover. */
  tooltip?: string
  /** Optional icon — see `MenuIcon`. Never a component. */
  icon?: MenuIcon
  order?: number
  group?: string
  requires?: {
    network?: boolean
    selection?: boolean
  }
  /**
   * Called with this app's per-app API object when the item is clicked.
   * The host closes the dropdown immediately beforehand (matching how the
   * host's own built-in menu items already behave) — the click handler
   * doesn't need to (and can't) keep the dropdown open while it runs. If it
   * returns a Promise, the host awaits it only to log a failure; it never
   * blocks the UI on it.
   */
  onClick: (apis: AppContextApis) => void | Promise<void>
  /**
   * Optional extra enablement check, called by the host right before the
   * menu is rendered — a plain function snapshot, not a reactive hook.
   * Combined with `requires`. Prefer `requires` for the common cases
   * (network loaded, selection non-empty) since those are evaluated reactively
   * from the host's own stores; reach for `isEnabled` only for conditions `requires`
   * can't express — it receives the app's per-app API object so it can
   * check things like the current network or selection itself.
   */
  isEnabled?: (apis: AppContextApis) => boolean
}

/** Entry for batch registration via registerAll(). */
export type RegisterResourceEntry =
  | ({ slot: 'right-panel' } & RegisterPanelOptions)
  | ({ slot: 'apps-menu' } & RegisterMenuItemOptions)

// ── Introspection types ─────────────────────────────────────────

/** Returned by getRegisteredResources(). */
export interface RegisteredResourceInfo {
  resourceId: string // full triple: appId::slot::id
  slot: ResourceSlot
  id: string
  title?: string
  order?: number
  requires?: {
    network?: boolean
    selection?: boolean
  }
}

/** Returned by getResourceVisibility(). */
export interface ResourceVisibilityResult {
  registered: boolean
  visible: boolean
  hiddenReason?:
    | 'app-inactive'
    | 'requires-network'
    | 'requires-selection'
    | 'slot-not-rendered'
}

// ── Declarative resource registration ───────────────────────────

/**
 * Declarative resource entry used in CyAppWithLifecycle.resources.
 * Same shape as RegisterResourceEntry — the host registers these
 * automatically when the app is loaded.
 */
export type ResourceDeclaration = RegisterResourceEntry

// ── Public API interface ────────────────────────────────────────

/**
 * Per-app resource registration API.
 *
 * Each instance is bound to a specific appId at creation time
 * (via `createResourceApi(appId)`). This prevents apps from
 * registering resources under another app's identity.
 *
 * Available via `AppContext.apis.resource` in `mount()` or
 * `useAppContext().apis.resource` in plugin components.
 * NOT available on `window.CyWebApi`.
 */
export interface ResourceApi {
  /**
   * Returns the set of UI slots this host version supports.
   * Apps should register resources only for supported slots.
   */
  getSupportedSlots(): ResourceSlot[]

  // ── Individual Registration (upsert semantics) ──────────────

  /**
   * Register a panel in the 'right-panel' slot. Uses upsert semantics:
   * if a panel with the same `id` is already registered by this app,
   * it is replaced in place (preserving tab selection).
   */
  registerPanel(
    options: RegisterPanelOptions,
  ): ApiResult<{ resourceId: string }>

  unregisterPanel(panelId: string): ApiResult

  /**
   * Register a menu item in the 'apps-menu' slot. Uses upsert semantics.
   */
  registerMenuItem(
    options: RegisterMenuItemOptions,
  ): ApiResult<{ resourceId: string }>

  unregisterMenuItem(menuItemId: string): ApiResult

  unregisterAll(): ApiResult

  // ── Batch Registration ──────────────────────────────────────

  /**
   * Register multiple resources in a single call. Uses upsert semantics
   * per entry. Entries that fail validation are skipped (logged) but do
   * not block other entries.
   *
   * Always returns `ok()` — check `result.data.errors.length > 0` to
   * detect partial failures.
   */
  registerAll(entries: RegisterResourceEntry[]): ApiResult<{
    registered: Array<{ resourceId: string }>
    errors: Array<{ id: string; slot: ResourceSlot; error: ApiError }>
  }>

  // ── Introspection ───────────────────────────────────────────

  /**
   * Returns all resources registered by this app.
   */
  getRegisteredResources(): RegisteredResourceInfo[]

  /**
   * Returns the visibility evaluation result for a resource registered
   * by this app. The `id` parameter is the slot-local id passed to
   * `registerPanel` / `registerMenuItem`.
   */
  getResourceVisibility(id: string): ResourceVisibilityResult
}
