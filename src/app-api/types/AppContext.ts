// src/app-api/types/AppContext.ts

import { CyApp } from '../../models/AppModel/CyApp'
import type { ElementApi } from '../core/elementApi'
import type { NetworkApi } from '../core/networkApi'
import type { SelectionApi } from '../core/selectionApi'
import type { ViewportApi } from '../core/viewportApi'

/**
 * Context object passed to external apps during mount().
 *
 * Provides pre-instantiated app API instances. The host creates
 * these within a React rendering context and passes the resolved
 * objects, so apps can use them outside of React components.
 *
 * NOTE: API fields are added incrementally as app API hooks are
 * implemented in Phase 1a–1e. This initial version declares the
 * shape but marks unimplemented APIs as optional.
 */
export interface AppContext {
  /** The unique ID of this app instance */
  readonly appId: string

  /** Pre-instantiated app API instances */
  readonly apis: {
    // Populated in Phase 1a
    element: ElementApi
    // Populated in Phase 1b
    network: NetworkApi
    // Populated in Phase 1c
    selection: SelectionApi
    viewport: ViewportApi
    // Populated in Phase 1d
    // table: TableApi
    // visualStyle: VisualStyleApi
    // Populated in Phase 1e
    // layout: LayoutApi
    // export: ExportApi
  }
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
