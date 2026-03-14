// src/models/StoreModel/ContextMenuItemStoreModel.ts

import { IdType } from '../IdType'

/**
 * The target element type that triggers a context menu item.
 * - 'node'   — item appears when right-clicking a node
 * - 'edge'   — item appears when right-clicking an edge
 * - 'canvas' — item appears when right-clicking empty canvas
 */
export type ContextMenuTarget = 'node' | 'edge' | 'canvas'

/**
 * Context passed to the handler when the user clicks a registered menu item.
 */
export interface ContextMenuHandlerContext {
  /** The type of element that was right-clicked */
  type: ContextMenuTarget
  /** The element ID (undefined for canvas clicks) */
  id?: IdType
  /** The network in which the click occurred */
  networkId: IdType
}

/**
 * Configuration for a context menu item submitted by an external app.
 */
export interface ContextMenuItemConfig {
  /** Display label for the menu item */
  label: string
  /**
   * Which target types trigger this item.
   * Defaults to `['node', 'edge']` if omitted.
   */
  targetTypes?: ContextMenuTarget[]
  /** Called when the user clicks the item */
  handler: (context: ContextMenuHandlerContext) => void
}

/**
 * A registered context menu item — config + assigned itemId.
 *
 * `appId` is optional: items registered via `AppContext.apis.contextMenu`
 * (per-app factory) carry the bound appId. Items registered via the
 * anonymous `window.CyWebApi.contextMenu` singleton have `appId: undefined`.
 */
export interface RegisteredContextMenuItem extends ContextMenuItemConfig {
  readonly itemId: string
  /** The app that registered this item. Undefined for anonymous registrations. */
  readonly appId?: string
}

// ── Store model ─────────────────────────────────────────────────

export interface ContextMenuItemState {
  items: RegisteredContextMenuItem[]
}

export interface ContextMenuItemActions {
  addItem(item: RegisteredContextMenuItem): void
  removeItem(itemId: string): void
  /**
   * Remove all items registered by the given appId.
   * Items with `appId === undefined` (anonymous) are never removed.
   */
  removeAllByAppId(appId: string): void
}

export type ContextMenuItemStoreModel = ContextMenuItemState &
  ContextMenuItemActions
