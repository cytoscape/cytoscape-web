import { logStore } from '../../../debug'

/**
 * Trailing write coalescer for IndexedDB persistence (REVIEW.md A2).
 *
 * Before this existed, every store mutation triggered an immediate
 * full-slice serialize + IndexedDB put — every renderer click serialized
 * the entire network view (O(n) over up to 26k elements) on the main
 * thread. Writes are now coalesced per key (one key per store+network):
 * a burst of mutations produces a single write of the LATEST state,
 * `WRITE_DELAY_MS` after the burst ends.
 *
 * Durability: pending writes are flushed when the page becomes hidden and
 * on beforeunload, so the at-risk window is a crash within the delay —
 * comparable to the previous fire-and-forget writes, which gave no
 * completion guarantee either.
 *
 * The `execute` callback is invoked at FLUSH time, so it must read the
 * latest state itself (don't capture a snapshot at schedule time).
 */

export const WRITE_DELAY_MS = 300

interface PendingWrite {
  timer: ReturnType<typeof setTimeout>
  execute: () => Promise<unknown>
  label: string
}

const pendingWrites = new Map<string, PendingWrite>()

// Set once the database was deleted for a reset or an import: see
// suspendWritesUntilReload
let suspended = false

// Writes whose `execute()` has started but not settled. A key leaves
// `pendingWrites` the moment it starts running, so without this a write that
// fired on its own timer would be invisible to `flushPendingWrites` and a
// caller could read the row back before the put landed.
const inFlightWrites = new Set<Promise<void>>()

const runWrite = async (key: string): Promise<void> => {
  const pending = pendingWrites.get(key)
  if (pending === undefined) {
    return
  }
  pendingWrites.delete(key)
  clearTimeout(pending.timer)

  const write = (async () => {
    try {
      await pending.execute()
    } catch (e) {
      logStore.error(
        `[${pending.label}] Failed to persist to IndexedDB (key: ${key})`,
        e,
      )
    }
  })()
  inFlightWrites.add(write)
  try {
    await write
  } finally {
    inFlightWrites.delete(write)
  }
}

/**
 * Schedule (or reschedule) the write for `key`. A later call with the
 * same key replaces the earlier one and restarts the delay.
 */
export const scheduleWrite = (
  key: string,
  label: string,
  execute: () => Promise<unknown>,
): void => {
  if (suspended) {
    return
  }
  const existing = pendingWrites.get(key)
  if (existing !== undefined) {
    clearTimeout(existing.timer)
  }
  const timer = setTimeout(() => void runWrite(key), WRITE_DELAY_MS)
  pendingWrites.set(key, { timer, execute, label })
}

/**
 * Cancel the pending write for `key` (e.g. the slice was deleted — a
 * stale put must not resurrect the row after its delete).
 */
export const cancelWrite = (key: string): void => {
  const pending = pendingWrites.get(key)
  if (pending !== undefined) {
    clearTimeout(pending.timer)
    pendingWrites.delete(key)
  }
}

/**
 * Execute every pending write immediately. Used on page-hide/unload and
 * by tests.
 *
 * The returned promise settles once every queued write AND every write
 * already running has finished, so a test can read the row back straight
 * after awaiting it. The in-flight half matters because a key leaves
 * `pendingWrites` as soon as its own timer fires: without it, a flush called
 * a moment too late would settle while the put was still open. Unload
 * handlers ignore the promise — the page is going away either way.
 */
export const flushPendingWrites = async (): Promise<void> => {
  await Promise.all([
    ...Array.from(pendingWrites.keys()).map(async (key) => await runWrite(key)),
    ...Array.from(inFlightWrites),
  ])
}

/**
 * Drop every pending write and ignore new ones until the page reloads.
 *
 * For a workspace reset or import: once the database is deleted, the stores
 * still hold the old workspace until the reload. A write that fires in that
 * window (one already pending, or one scheduled by an edit, or the unload
 * flush) would put the old state into the fresh database.
 */
export const suspendWritesUntilReload = (): void => {
  suspended = true
  pendingWrites.forEach((pending) => clearTimeout(pending.timer))
  pendingWrites.clear()
}

/** Undo suspendWritesUntilReload, for tests (the app reloads instead). */
export const resumeWritesForTesting = (): void => {
  suspended = false
}

/** Number of writes currently waiting — exposed for tests/debugging. */
export const pendingWriteCount = (): number => pendingWrites.size

// Best-effort durability: flush when the tab is hidden or closing.
// (IndexedDB writes started here usually complete; this narrows the
// at-risk window to a hard crash within WRITE_DELAY_MS.)
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flushPendingWrites()
    }
  })
  window.addEventListener('beforeunload', () => {
    void flushPendingWrites()
  })
}
