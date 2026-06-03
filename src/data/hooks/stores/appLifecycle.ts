// src/data/hooks/stores/appLifecycle.ts
//
// Pure helper functions for CyAppWithLifecycle mount/unmount calls.
// These are extracted from useAppManager so they can be unit-tested
// without fighting the module-level top-level await in useAppManager.ts.

import type {
  AppContext,
  CyAppWithLifecycle,
} from '../../../app-api/types/AppContext'
import { logApp } from '../../../debug'
import type { CyApp } from '../../../models/AppModel/CyApp'
import { cleanupAllForApp } from './AppCleanupRegistry'

/**
 * Calls mount() on a CyApp if it implements CyAppWithLifecycle.mount.
 * Records the app ID in mountedApps if mount completes successfully.
 *
 * Apps without mount() are treated as mounted immediately — their ID is
 * added to mountedApps in the early-return path. This ensures they are
 * never blocked by a future mountedAppIds rendering gate.
 *
 * On failure, runs cleanupAllForApp to remove any partial registrations
 * made during mount() before the error occurred.
 *
 * Re-throws if mount() throws so the caller can circuit-break.
 */
export const mountApp = async (
  cyApp: CyApp,
  context: AppContext,
  mountedApps: Set<string>,
): Promise<void> => {
  const lifecycle = cyApp as CyAppWithLifecycle
  if (typeof lifecycle.mount !== 'function') {
    // No lifecycle callback — treat as mounted immediately so renderers
    // show CyApp.components resources without waiting.
    mountedApps.add(cyApp.id)
    return
  }

  const t0 = performance.now()
  try {
    await lifecycle.mount(context)
    const elapsed = performance.now() - t0
    if (elapsed > 100) {
      logApp.warn(
        `[appLifecycle]: mount() for ${cyApp.id} took ${elapsed.toFixed(0)}ms. ` +
          'Resource registrations should complete synchronously to avoid rendering delays. ' +
          'Move async I/O out of mount() or defer it after registerPanel().',
      )
    }
    mountedApps.add(cyApp.id)
    logApp.info(`[appLifecycle]: App ${cyApp.id} mounted`)
  } catch (err) {
    cleanupAllForApp(cyApp.id)
    logApp.error(`[appLifecycle]: mount() failed for ${cyApp.id}:`, err)
    throw err
  }
}

/**
 * Calls unmount() on a CyApp if it was previously mounted (i.e. its ID is in
 * mountedApps). Removes the ID from mountedApps regardless.
 *
 * Host-owned cleanup (cleanupAllForApp) runs BEFORE unmount() so the UI is
 * clean even if unmount() throws.
 *
 * Swallows unmount() errors so callers always complete cleanup.
 */
export const unmountApp = async (
  cyApp: CyApp,
  mountedApps: Set<string>,
): Promise<void> => {
  if (!mountedApps.has(cyApp.id)) return

  // Remove first so subsequent calls are no-ops even if unmount() throws
  mountedApps.delete(cyApp.id)

  // Host-owned cleanup — delegates to all registered stores via the
  // cleanup registry. Runs before unmount() so the UI is clean even
  // if the plugin's unmount() throws.
  cleanupAllForApp(cyApp.id)

  const lifecycle = cyApp as CyAppWithLifecycle
  if (typeof lifecycle.unmount !== 'function') return

  try {
    await lifecycle.unmount()
    logApp.info(`[appLifecycle]: App ${cyApp.id} unmounted`)
  } catch (err) {
    logApp.warn(`[appLifecycle]: unmount() failed for ${cyApp.id}:`, err)
  }
}

/**
 * Calls unmount() on every app that is currently in mountedApps.
 * Intended for use in beforeunload handlers.
 * Runs all unmounts in parallel for speed.
 */
export const unmountAllApps = async (
  appRegistry: Map<string, CyApp>,
  mountedApps: Set<string>,
): Promise<void> => {
  await Promise.all(
    [...mountedApps].map(async (appId) => {
      const cyApp = appRegistry.get(appId)
      if (cyApp !== undefined) {
        await unmountApp(cyApp, mountedApps)
      } else {
        mountedApps.delete(appId)
      }
    }),
  )
}
