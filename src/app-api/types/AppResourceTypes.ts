// src/app-api/types/AppResourceTypes.ts
//
// Types for the App Resource runtime registration system (Phase 2).
// Defines the slot model, host-injected props per slot, registration
// options, and the public ResourceApi interface.

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

// ── Per-slot host props ─────────────────────────────────────────

/** Props injected by the host into every 'right-panel' component. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PanelHostProps {
  // Empty in first rollout. Future: isActive, requestFocus, closePanel.
}

/**
 * Props injected by the host into every 'apps-menu' component.
 *
 * When `closeOnAction: true` on the registration, the host wraps the
 * component in a click-capturing container that auto-closes the dropdown
 * via `queueMicrotask`. Plugins do NOT need to call `handleClose` in
 * that case — it is still injected for edge cases.
 *
 * When `closeOnAction: false` (default), the plugin MUST call
 * `handleClose` manually when appropriate.
 */
export interface MenuItemHostProps {
  handleClose: () => void
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

export interface RegisterMenuItemOptions {
  id: string
  /** Display label for the menu item. Falls back to `id` if omitted. */
  title?: string
  order?: number
  group?: string
  requires?: {
    network?: boolean
    selection?: boolean
  }
  component: React.ComponentType<MenuItemHostProps>
  /**
   * If true, the host automatically closes the Apps dropdown after the menu
   * item component's onClick handler completes.
   * @default false
   */
  closeOnAction?: boolean
  /** Custom error fallback (same as RegisterPanelOptions.errorFallback). */
  errorFallback?: React.ComponentType<{
    error: Error
    resetErrorBoundary: () => void
  }>
}

/** Entry for batch registration via registerAll(). */
export interface RegisterResourceEntry {
  slot: ResourceSlot
  id: string
  title?: string
  order?: number
  group?: string
  requires?: {
    network?: boolean
    selection?: boolean
  }
  component: React.ComponentType<any>
  /** Custom error fallback. */
  errorFallback?: React.ComponentType<{
    error: Error
    resetErrorBoundary: () => void
  }>
  /** For 'apps-menu' only: auto-close after action. */
  closeOnAction?: boolean
}

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
 * Same fields as RegisterResourceEntry — the host registers these
 * automatically when the app is loaded.
 */
export interface ResourceDeclaration {
  slot: ResourceSlot
  id: string
  title?: string
  order?: number
  group?: string
  requires?: {
    network?: boolean
    selection?: boolean
  }
  component: React.ComponentType<any>
  errorFallback?: React.ComponentType<{
    error: Error
    resetErrorBoundary: () => void
  }>
  closeOnAction?: boolean
}

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
