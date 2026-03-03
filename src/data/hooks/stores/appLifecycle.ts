// src/data/hooks/stores/appLifecycle.ts
//
// Pure helper functions for CyAppWithLifecycle mount/unmount calls.
// These are extracted from useAppManager so they can be unit-tested
// without fighting the module-level top-level await in useAppManager.ts.

import type { AppContext, CyAppWithLifecycle } from '../../../app-api/types/AppContext'
import { logApp } from '../../../debug'
import type { CyApp } from '../../../models/AppModel/CyApp'

/**
 * Calls mount() on a CyApp if it implements CyAppWithLifecycle.mount.
 * Records the app ID in mountedApps if mount completes successfully.
 * Re-throws if mount() throws so the caller can circuit-break.
 */
export const mountApp = async (
  cyApp: CyApp,
  context: AppContext,
  mountedApps: Set<string>,
): Promise<void> => {
  const lifecycle = cyApp as CyAppWithLifecycle
  if (typeof lifecycle.mount !== 'function') return

  try {
    await lifecycle.mount(context)
    mountedApps.add(cyApp.id)
    logApp.info(`[appLifecycle]: App ${cyApp.id} mounted`)
  } catch (err) {
    logApp.error(`[appLifecycle]: mount() failed for ${cyApp.id}:`, err)
    throw err
  }
}

/**
 * Calls unmount() on a CyApp if it was previously mounted (i.e. its ID is in
 * mountedApps). Removes the ID from mountedApps regardless. Swallows
 * unmount() errors so callers always complete cleanup.
 */
export const unmountApp = async (
  cyApp: CyApp,
  mountedApps: Set<string>,
): Promise<void> => {
  if (!mountedApps.has(cyApp.id)) return

  // Remove first so subsequent calls are no-ops even if unmount() throws
  mountedApps.delete(cyApp.id)

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
