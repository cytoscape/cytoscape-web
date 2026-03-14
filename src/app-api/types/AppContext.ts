// src/app-api/types/AppContext.ts

import { CyApp } from '../../models/AppModel/CyApp'
import type { CyWebApiType } from '../core'
import type { ContextMenuApi } from '../core/contextMenuApi'
import type { ResourceApi } from './AppResourceTypes'

/**
 * Per-app API object passed to mount(). Extends CyWebApiType and adds
 * `resource` and per-app `contextMenu` as required fields — the host
 * always injects them before calling mount().
 *
 * Intentionally distinct from CyWebApiType:
 *   CyWebApiType   = window.CyWebApi shape — no `resource` (window-safe)
 *   AppContextApis = AppContext.apis shape — `resource` required (mount-safe)
 */
export interface AppContextApis extends CyWebApiType {
  /** Per-app resource registration API. Always provided by the host. */
  readonly resource: ResourceApi
  /**
   * Per-app context menu API (factory-bound to this app's ID).
   * Items registered here are auto-cleaned when the app is disabled.
   * Overrides the anonymous contextMenu from CyWebApiType.
   */
  readonly contextMenu: ContextMenuApi
}

/**
 * Context object passed to external apps during mount().
 *
 * Provides pre-instantiated, per-app API instances. The host creates
 * a unique AppContextApis object for each app — it is NOT the same as
 * window.CyWebApi (which has no `resource` field and uses the anonymous
 * contextMenu singleton).
 */
export interface AppContext {
  /** The unique ID of this app instance */
  readonly appId: string

  /**
   * Per-app API instances. Includes all domain APIs from CyWebApiType
   * plus `resource` (ResourceApi) and a per-app `contextMenu` factory.
   */
  readonly apis: AppContextApis
}

/**
 * Extended CyApp interface with lifecycle callbacks and API version declaration.
 *
 * Backward-compatible — existing apps without lifecycle methods
 * continue to work unchanged.
 */
export interface CyAppWithLifecycle extends CyApp {
  /**
   * Declared API version this app targets (e.g. '1.0').
   * The host may use this for compatibility checks in future releases.
   */
  apiVersion?: string

  /**
   * Called when the app is activated (after React components are registered).
   * Receives an AppContext providing access to all app APIs.
   * If this returns a Promise, the host awaits it before marking
   * the app as ready.
   */
  mount?(context: AppContext): void | Promise<void>

  /**
   * Called when the app is deactivated or unloaded.
   * Apps must clean up DOM nodes, listeners, timers, and async tasks.
   * No async work should survive past unmount().
   * Will always be called, even on page reload.
   */
  unmount?(): void | Promise<void>
}
