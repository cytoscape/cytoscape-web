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
export type ResourceSlot = 'right-panel' | 'apps-menu' | 'search-bar'

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
   * Required for 'right-panel' and 'apps-menu' (validated at registration
   * time). For 'search-bar' it holds the optional "More Options" panel
   * (optionsComponent) and may be absent.
   */
  readonly component?: unknown
  /**
   * Optional custom error fallback component. Typed as `unknown` here;
   * renderers cast to React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>.
   * If omitted, the host's default PluginFallback is used.
   */
  readonly errorFallback?: unknown
  /**
   * For 'apps-menu' slot only. If true, the host automatically closes the
   * dropdown when the menu item's onClick handler completes.
   * @default false
   */
  readonly closeOnAction?: boolean

  // ── 'search-bar' slot only ─────────────────────────────────────
  // A network search provider stores its display name in `title` and its
  // optionsComponent in `component`; the fields below carry the rest of
  // its registration metadata.

  /** Short text describing what this provider searches. */
  readonly description?: string
  /** http(s) or data:image URI for the provider icon. */
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
}
