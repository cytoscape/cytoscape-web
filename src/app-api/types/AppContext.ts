// src/app-api/types/AppContext.ts

import { CyApp } from '../../models/AppModel/CyApp'
import type { CyWebApiType } from '../core'

/**
 * Context object passed to external apps during mount().
 *
 * Provides pre-instantiated app API instances. The host creates
 * these within a React rendering context and passes the resolved
 * objects, so apps can use them outside of React components.
 *
 * NOTE: `apis` is the same singleton as `window.CyWebApi` at runtime —
 * the host passes the `CyWebApi` object (assembled in Phase 1f) directly.
 */
export interface AppContext {
  /** The unique ID of this app instance */
  readonly appId: string

  /**
   * Pre-instantiated app API instances.
   * At runtime this is the same object as `window.CyWebApi`.
   */
  readonly apis: CyWebApiType
}

/**
 * Extended CyApp interface with lifecycle callbacks.
 *
 * Backward-compatible — existing apps without lifecycle methods
 * continue to work unchanged.
 */
export interface CyAppWithLifecycle extends CyApp {
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
