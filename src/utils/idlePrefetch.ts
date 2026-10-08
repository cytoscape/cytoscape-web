/**
 * Runs non-critical work in browser idle time so it stays clear of startup.
 *
 * Returns a cancel function so React effects can clean up (important under
 * StrictMode's double effect invocation).
 */
export const runOnIdle = (work: () => void): (() => void) => {
  // Safari has no requestIdleCallback; fall back to a timer long enough to
  // stay clear of the boot-critical work.
  if (typeof requestIdleCallback === 'function') {
    const handle = requestIdleCallback(work, { timeout: 5000 })
    return () => cancelIdleCallback(handle)
  }
  const handle = setTimeout(work, 2000)
  return () => clearTimeout(handle)
}

/**
 * Schedules a lazy-chunk load for browser idle time so the download is paid
 * before the user first needs the feature, without competing with startup.
 */
export const prefetchOnIdle = (load: () => Promise<unknown>): (() => void) =>
  runOnIdle(() => {
    // Chunk-load failures surface when the feature actually loads; a failed
    // prefetch must never take anything down.
    void load().catch(() => undefined)
  })
