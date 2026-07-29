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
export type ResourceSlot = 'right-panel' | 'apps-menu'

/**
 * Icon for an 'apps-menu' entry — a raw SVG path `d` string (concatenate
 * multiple non-overlapping subpaths into one `d` if the source icon has
 * several `<path>` elements) plus an optional `viewBox` for icons not
 * authored on the default 0-24 grid. Rendered inside the host's own
 * fixed-size `<SvgIcon>` so sizing/color stay host-controlled. Plain data —
 * apps can never hand the host a React component for an icon.
 *
 * No curated "pick a built-in icon by name" option: a short list covers few
 * enough real icon needs that almost every app ends up needing custom
 * artwork anyway, and a name-based lookup against the full MUI icon set
 * would mean shipping/maintaining that whole set (or resolving names
 * dynamically, which defeats tree-shaking) just to save an app pasting in
 * path data it already has.
 */
export interface MenuIcon {
  svgPath: string
  viewBox?: string
}

/**
 * A registered app resource — the internal representation stored in
 * AppResourceStore. Created by the host when an app calls
 * `registerPanel()`, `registerMenuItem()`, or declares `resources`.
 *
 * The identity triple `(appId, slot, id)` uniquely identifies a resource.
 *
 * Fields below `group` split by slot: 'right-panel' entries use `component`
 * (+ `errorFallback`); 'apps-menu' entries use `label`/`tooltip`/`icon`/
 * `onClick`/`isEnabled` instead — apps-menu entries never carry a component,
 * so the host owns 100% of the rendering for shared menu chrome.
 */
export interface RegisteredAppResource {
  readonly id: string
  readonly appId: string
  readonly slot: ResourceSlot
  /** 'right-panel' tab title. Falls back to `id` if omitted. */
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

  // ── 'right-panel' only ──────────────────────────────────────────

  /**
   * The React component to render. Typed as `unknown` here to keep the store
   * model free of React imports. Host renderers cast to the appropriate
   * slot-specific prop type at the call site.
   * Must be a function (validated at registration time).
   */
  readonly component?: unknown
  /**
   * Optional custom error fallback component. Typed as `unknown` here;
   * renderers cast to React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>.
   * If omitted, the host's default PluginFallback is used.
   */
  readonly errorFallback?: unknown

  // ── 'apps-menu' only ─────────────────────────────────────────────

  /** Display label for the menu item. */
  readonly label?: string
  /** Optional tooltip shown on hover. */
  readonly tooltip?: string
  /** Optional icon — see `MenuIcon`. Never a component. */
  readonly icon?: MenuIcon
  /**
   * Invoked with this app's per-app API object when the item is clicked.
   * Typed `unknown` here (model layer stays free of app-api/React imports);
   * the host casts to the real signature at the call site.
   */
  readonly onClick?: (apis: unknown) => void | Promise<void>
  /**
   * Optional extra enablement check, called by the host right before the
   * menu is rendered (a plain function snapshot — mirrors Cytoscape
   * Desktop's `TaskFactory.isReady()`). Combined with `requires`.
   */
  readonly isEnabled?: () => boolean
}
