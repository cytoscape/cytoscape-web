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
 * Current slots:
 *   'right-panel'    — tabbed side panel on the right
 *   'apps-menu'      — dropdown in the Apps toolbar button
 *   'search-bar'     — network search bar at the top of the Workspace tab
 *   'modal-launcher' — host-rendered modal dialogs, opened imperatively
 *
 * Reserved for future rollouts:
 *   'left-panel', 'bottom-panel', 'tools-menu', 'status-bar'
 */
export type ResourceSlot =
  | 'right-panel'
  | 'apps-menu'
  | 'search-bar'
  | 'modal-launcher'

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

// ── Network search provider registration ────────────────────────

/** The query submitted through the host's network search bar. */
export interface NetworkSearchQuery {
  /** The trimmed text the user submitted. */
  readonly query: string
}

/** Props injected by the host into every 'search-bar' optionsComponent. */
export interface NetworkSearchOptionsHostProps {
  /** Closes the "More Options" popover. */
  requestClose: () => void
}

/**
 * Options for registering a network search provider in the 'search-bar'
 * slot. The host owns the search input; the provider supplies metadata,
 * an optional extra-parameters panel, and the submit handler.
 */
export interface RegisterNetworkSearchProviderOptions {
  id: string
  /** Display name shown in the provider selector. Required, non-empty. */
  name: string
  /** Short text describing what this provider searches. Shown as a tooltip. */
  description?: string
  /**
   * http(s) or data:image URI rendered at a fixed size next to the search
   * input. If omitted, the host renders a fallback avatar with the
   * provider's initial.
   */
  icon?: string
  /** http(s) URL opened in a new tab from the provider list. */
  website?: string
  /** Placeholder text for the host-owned search input. */
  placeholder?: string
  /**
   * Optional panel with extra search parameters, shown in the
   * "More Options" popover. Mandatory input stays in the host search field;
   * anything else the search needs belongs here, backed by the app's own
   * state so onSubmit can read it.
   */
  optionsComponent?: React.ComponentType<NetworkSearchOptionsHostProps>
  /**
   * Invoked when the user submits a non-empty query. While a returned
   * promise is pending the host shows progress and disables the search
   * button; a rejection is logged and surfaced as an error message.
   */
  onSubmit: (query: NetworkSearchQuery) => void | Promise<void>
  /** Custom error fallback for the options popover (same as RegisterPanelOptions.errorFallback). */
  errorFallback?: React.ComponentType<{
    error: Error
    resetErrorBoundary: () => void
  }>
}

// ── Modal registration ──────────────────────────────────────────

/**
 * Props injected by the host into every 'modal-launcher' component.
 *
 * The component renders the dialog *contents* — DialogTitle,
 * DialogContent, DialogActions — while the host owns the Dialog shell
 * itself (its CyDialog wrapper plus a structural Close button). Backdrop
 * click and Escape are inert per
 * docs/specifications/DIALOG_DISMISS_POLICY.md, so the component's own
 * buttons (and the host's Close "X") are the only exits.
 */
export interface ModalHostProps {
  /**
   * Closes this modal — the same close path as the host-rendered
   * Close "X". Wire Cancel/Done buttons to this.
   */
  requestClose: () => void
}

/**
 * Options for registering a modal in the 'modal-launcher' slot.
 *
 * Registration only declares the modal; nothing renders until the app
 * calls `openModal(id)` — typically from app logic with no mounted
 * component, such as a search provider's onSubmit or a menu action.
 * The host renders the component inside its own React tree (host theme,
 * error boundary, Suspense) wrapped in the host's dialog shell, and
 * closes it automatically when the app is deactivated.
 */
export interface RegisterModalOptions {
  id: string
  /**
   * Renders the dialog contents (DialogTitle/DialogContent/DialogActions)
   * inside the host's dialog shell. May be React.lazy — the host shows a
   * loading fallback while the chunk resolves.
   */
  component: React.ComponentType<ModalHostProps>
  /**
   * Maximum dialog width (MUI Dialog `maxWidth`).
   * @default 'sm'
   */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  /**
   * Stretch the dialog to `maxWidth` (MUI Dialog `fullWidth`).
   * @default false
   */
  fullWidth?: boolean
  /** Custom error fallback (same as RegisterPanelOptions.errorFallback). */
  errorFallback?: React.ComponentType<{
    error: Error
    resetErrorBoundary: () => void
  }>
}

/**
 * Entry for batch registration via registerAll(). Discriminated by `slot`,
 * since each slot has its own registration options ('search-bar' entries
 * have no `component`, for example).
 */
export type RegisterResourceEntry =
  | ({ slot: 'right-panel' } & RegisterPanelOptions)
  | ({ slot: 'apps-menu' } & RegisterMenuItemOptions)
  | ({ slot: 'search-bar' } & RegisterNetworkSearchProviderOptions)
  | ({ slot: 'modal-launcher' } & RegisterModalOptions)

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
  getSupportedSlots(): ApiResult<{ slots: ResourceSlot[] }>

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

  /**
   * Register a network search provider in the 'search-bar' slot. Uses
   * upsert semantics. The host renders the search bar in the Workspace
   * tab once at least one provider is registered by an active app.
   */
  registerNetworkSearchProvider(
    options: RegisterNetworkSearchProviderOptions,
  ): ApiResult<{ resourceId: string }>

  unregisterNetworkSearchProvider(providerId: string): ApiResult

  /**
   * Register a modal in the 'modal-launcher' slot. Uses upsert semantics.
   * Nothing renders until `openModal(id)` is called.
   */
  registerModal(options: RegisterModalOptions): ApiResult<{ resourceId: string }>

  /** Unregister a modal. If it is currently open, it is closed first. */
  unregisterModal(modalId: string): ApiResult

  /**
   * Open a registered 'modal-launcher' resource. Payload-less by design —
   * apps carry any payload in their own stores. Idempotent when the modal
   * is already open. Fails with RESOURCE_NOT_FOUND when no modal with
   * this id is registered by this app. Open modals are closed
   * automatically when the app is deactivated.
   */
  openModal(id: string): ApiResult

  /**
   * Close a modal opened by this app — the same path as the injected
   * `requestClose` and the host's Close "X". Idempotent when not open;
   * fails with RESOURCE_NOT_FOUND when the modal is not registered.
   */
  closeModal(id: string): ApiResult

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
  getRegisteredResources(): ApiResult<{ resources: RegisteredResourceInfo[] }>

  /**
   * Returns the visibility evaluation result for a resource registered
   * by this app. The `id` parameter is the slot-local id passed to
   * `registerPanel` / `registerMenuItem`. `requires.selection` is
   * evaluated against the current network's live selection.
   */
  getResourceVisibility(id: string): ApiResult<ResourceVisibilityResult>
}
