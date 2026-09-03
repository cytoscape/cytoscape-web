// src/models/AppModel/RegisteredAppResource.ts
//
// Internal model for a registered app resource. Stored in AppResourceStore.
// `component` is typed as `unknown` to keep the model layer free of React
// imports — host renderers cast to the appropriate slot-specific prop type.

/**
 * Identifies a specific host-managed UI location that plugins can occupy.
 * Duplicated from AppResourceTypes.ts to keep the model layer free of
 * app-api imports. Must stay in sync.
 */
export type ResourceSlot =
  | 'right-panel'
  | 'apps-menu'
  | 'search-bar'
  | 'modal-launcher'

/**
 * A registered app resource — the internal representation stored in
 * AppResourceStore. Created by the host when an app calls
 * `registerPanel()`, `registerMenuItem()`, or declares `resources`.
 *
 * The identity triple `(appId, slot, id)` uniquely identifies a resource.
 */
export interface RegisteredAppResource {
  readonly id: string
  readonly appId: string
  readonly slot: ResourceSlot
  /**
   * 'right-panel': the tab title (falls back to `id`). 'apps-menu': the
   * menu label. 'search-bar': the provider's display name.
   */
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
   * model free of React imports. Host renderers cast to the appropriate
   * slot-specific prop type at the call site.
   * Required for 'right-panel' and 'modal-launcher' (validated at
   * registration time). For 'search-bar' it holds the optional "More
   * Options" panel (optionsComponent) and may be absent. Never present for
   * 'apps-menu': the host renders every menu entry itself from the fields
   * below.
   */
  readonly component?: unknown
  /**
   * Optional custom error fallback component. Typed as `unknown` here;
   * renderers cast to React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>.
   * If omitted, the host's default PluginFallback is used.
   */
  readonly errorFallback?: unknown

  // ── 'apps-menu' slot only ──────────────────────────────────────
  // The label lives in `title` and the icon URI in `icon` (shared with
  // 'search-bar'). Entries are plain data: the host owns 100% of the
  // rendering, so a menu item can never distort the shared dropdown.

  /** Optional hover text. */
  readonly tooltip?: string
  /**
   * Invoked with the app's per-app API object when the item is clicked.
   * Typed with an `unknown` argument to keep the model layer free of
   * app-api imports; the host casts to the real signature at the call site.
   */
  readonly onClick?: (apis: unknown) => void | Promise<void>
  /**
   * Optional extra enablement check, called by the host right before the
   * menu is shown (a plain snapshot). Combined with `requires`. Same
   * `unknown` convention as `onClick`.
   */
  readonly isEnabled?: (apis: unknown) => boolean

  // ── 'search-bar' slot only ─────────────────────────────────────
  // A network search provider stores its display name in `title` and its
  // optionsComponent in `component`; the fields below carry the rest of
  // its registration metadata.

  /** Short text describing what this provider searches. */
  readonly description?: string
  /**
   * http(s) URL, data:image URI, or root-relative host asset path. Used by
   * 'search-bar' (provider icon) and 'apps-menu' (menu item icon) alike; the
   * host renders either through UriIcon (SVG tinted, raster unchanged).
   */
  readonly icon?: string
  /** http(s) URL of the provider's website. */
  readonly website?: string
  /** Placeholder text for the host-owned search input. */
  readonly placeholder?: string
  /**
   * The provider's submit handler. Typed as `unknown` to keep the model
   * layer free of app-api imports; the host casts to
   * `(query: NetworkSearchQuery) => void | Promise<void>` at the call site.
   */
  readonly onSubmit?: unknown

  // ── 'modal-launcher' slot only ─────────────────────────────────
  // Plain literals rather than MUI's Breakpoint type: the model layer
  // stays MUI-free. The host's dialog shell forwards them to CyDialog.

  /** Maximum dialog width. Defaults to 'sm' when undefined. */
  readonly maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  /** Stretch the dialog to `maxWidth`. Defaults to false when undefined. */
  readonly fullWidth?: boolean
}
