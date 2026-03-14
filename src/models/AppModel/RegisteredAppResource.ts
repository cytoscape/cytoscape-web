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
   * Must be a function (validated at registration time).
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
   * dropdown when the menu item's onClick handler completes.
   * @default false
   */
  readonly closeOnAction?: boolean
}
