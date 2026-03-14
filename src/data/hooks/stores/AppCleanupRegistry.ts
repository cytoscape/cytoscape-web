// src/data/hooks/stores/AppCleanupRegistry.ts
//
// Extensible cleanup registry for per-app resource cleanup.
// Each store that manages per-app registrations calls registerAppCleanup()
// once at module load time. When an app is unmounted or mount() fails,
// appLifecycle.ts calls cleanupAllForApp(appId) — a single call that
// delegates to all registered cleanup functions.
//
// Adding a new registrable resource type (e.g., keyboard shortcuts) only
// requires a registerAppCleanup() call in the new store — no changes to
// appLifecycle.ts.

import { logApp } from '../../../debug'

type AppCleanupFn = (appId: string) => void

const cleanupFns: AppCleanupFn[] = []

/**
 * Register a cleanup function that will be called when an app is unmounted
 * or when mount() fails. Each store that manages per-app registrations
 * should call this once at module load time.
 *
 * @example
 * // In AppResourceStore.ts, at module level:
 * registerAppCleanup((appId) => useAppResourceStore.getState().removeAllByAppId(appId))
 */
export const registerAppCleanup = (fn: AppCleanupFn): void => {
  cleanupFns.push(fn)
}

/**
 * Run all registered cleanup functions for the given appId.
 * Called from appLifecycle.ts — this is the single cleanup entry point.
 * Each cleanup function is wrapped in a try/catch so one failing cleanup
 * does not prevent others from running.
 */
export const cleanupAllForApp = (appId: string): void => {
  for (const fn of cleanupFns) {
    try {
      fn(appId)
    } catch (err) {
      logApp.warn(`[AppCleanupRegistry]: cleanup failed for ${appId}:`, err)
    }
  }
}

/**
 * Reset the registry (for testing only).
 * @internal
 */
export const _resetCleanupRegistry = (): void => {
  cleanupFns.length = 0
}
