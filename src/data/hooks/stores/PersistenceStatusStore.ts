import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { PersistenceStatusStore } from '@/models/StoreModel/PersistenceStatusStoreModel'

/**
 * How long `saving` stays reported once a burst has begun.
 *
 * A write is scheduled 300ms after the last mutation (`WRITE_DELAY_MS`) and
 * then usually settles within a frame, so without a floor the `saving` state
 * would last less than one paint — and when start and settle land in the same
 * React batch, the UI would never observe it at all. Holding here rather than
 * in the component is what makes that second case work: the store sees every
 * transition, a subscriber only sees the ones it is rendered between.
 */
export const MIN_SAVING_MS = 700

/** Pending flip from `saving` to `saved`. Module state, not store state. */
let holdTimer: ReturnType<typeof setTimeout> | undefined

const clearHold = (): void => {
  if (holdTimer !== undefined) {
    clearTimeout(holdTimer)
    holdTimer = undefined
  }
}

/**
 * Whether the workspace is reaching IndexedDB, so the toolbar can say so.
 *
 * In-memory only: this describes the current tab's writes and must not itself
 * be persisted. Every write path reports here through `trackWrite`
 * (`./trackWrite.ts`) — including the ones that do not go through
 * `persistenceScheduler`, because an indicator that watched only the scheduler
 * would read "Saved in this browser" while a style or summary write was
 * failing.
 *
 * Status rule, applied per burst of overlapping writes:
 *
 * - any write in flight -> `saving`
 * - burst ended, every write succeeded -> `saved`, `lastSavedAt` stamped
 * - burst ended, at least one write failed -> `failed`, `lastError` kept
 *
 * A failure therefore stays visible until a later burst completes cleanly,
 * which is the point at which saving demonstrably works again.
 *
 * Every IndexedDB mutation reports, deletes and clears included. An earlier
 * version tracked puts alone, on the reasoning that a database too broken to
 * delete is too broken to write — true, but beside the point: a delete that
 * fails on its own leaves memory and disk disagreeing, and the row the user
 * just removed comes back on reload. That is exactly what this indicator
 * exists to tell them.
 */
export const usePersistenceStatusStore = create(
  immer<PersistenceStatusStore>((set, get) => ({
    status: 'idle',
    pending: 0,
    burstFailed: false,
    burstStartedAt: 0,

    writeStarted: () => {
      clearHold()
      set((state) => {
        if (state.pending === 0) {
          state.burstFailed = false
          state.burstStartedAt = Date.now()
        }
        state.pending += 1
        state.status = 'saving'
      })
    },

    writeSettled: (error?: unknown) => {
      set((state) => {
        // Clamped rather than trusted: a stray settle without its start would
        // otherwise leave `pending` negative and the status stuck on 'saving'.
        state.pending = Math.max(0, state.pending - 1)
        if (error !== undefined) {
          state.burstFailed = true
          state.lastError =
            error instanceof Error ? error.message : String(error)
        }
        if (state.pending > 0) {
          return
        }
        if (state.burstFailed) {
          // A failure is the more important of the two states and must not
          // wait out a hold that is reporting the opposite.
          state.status = 'failed'
          return
        }
        state.lastSavedAt = Date.now()
        state.lastError = undefined
        state.status = 'saved'
      })

      if (get().status !== 'saved') {
        clearHold()
        return
      }

      const remaining = MIN_SAVING_MS - (Date.now() - get().burstStartedAt)
      if (remaining <= 0) {
        return
      }
      // Report the (already recorded) save only once it has been visible as
      // `saving` for long enough to read.
      set((state) => {
        state.status = 'saving'
      })
      clearHold()
      holdTimer = setTimeout(() => {
        holdTimer = undefined
        // A write that started during the hold owns the status now.
        if (get().pending > 0 || get().burstFailed) {
          return
        }
        set((state) => {
          state.status = 'saved'
        })
      }, remaining)
    },

    reset: () => {
      clearHold()
      set((state) => {
        state.status = 'idle'
        state.pending = 0
        state.burstFailed = false
        state.burstStartedAt = 0
        state.lastSavedAt = undefined
        state.lastError = undefined
      })
    },
  })),
)
