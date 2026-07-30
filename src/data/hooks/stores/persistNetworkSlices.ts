import { StateCreator, StoreApi } from 'zustand'

import { logStore } from '../../../debug'
import { IdType } from '../../../models/IdType'
import { cancelWrite, scheduleWrite } from './persistenceScheduler'
import { isHydrating } from './hydrationContext'

/**
 * Zustand middleware that persists per-network slices to IndexedDB.
 *
 * After every `set`, the networkId → slice map is diffed against its
 * previous value by object identity — cheap thanks to Immer structural
 * sharing: only slices whose network was actually mutated get a new
 * reference. Each changed slice is written keyed by the network that
 * changed, NOT by workspace.currentNetworkId (REVIEW.md R2-2), so
 * mutations to non-current networks (hierarchy sub-networks, App API
 * calls, async layout completion) are persisted correctly.
 *
 * Writes are fire-and-forget with an explicit error log (REVIEW.md R2-5:
 * failures used to surface as unhandled promise rejections).
 *
 * NOTE: this only works for stores whose slices are Immer-managed plain
 * data, where mutation produces a new slice reference. NetworkStore is
 * excluded: its cy-backed networks mutate in place, so slice references
 * never change (see REVIEW.md).
 */
export interface NetworkSlicePersistOptions<S, V> {
  /** Label used in log messages, e.g. 'TableStore' */
  label: string
  /** Selects the networkId → slice map from store state */
  selectSlices: (state: S) => Record<IdType, V>
  /** Writes one network's slice to IndexedDB */
  putSlice: (networkId: IdType, slice: V) => Promise<unknown>
  /** Optional: removes one network's row when its slice is deleted */
  removeSlice?: (networkId: IdType) => Promise<unknown>
}

export const persistNetworkSlices =
  <S, V>(config: StateCreator<S>, options: NetworkSlicePersistOptions<S, V>) =>
  (
    set: StoreApi<S>['setState'],
    get: StoreApi<S>['getState'],
    api: StoreApi<S>,
  ) =>
    config(
      (args: any, replace?: any) => {
        const before = options.selectSlices(get())
        set(args, replace)

        if (isHydrating()) {
          return
        }

        const after = options.selectSlices(get())
        if (before === after) {
          return
        }

        for (const networkId of Object.keys(after)) {
          if (before[networkId] !== after[networkId]) {
            // Coalesced write (REVIEW.md A2): a burst of mutations to the
            // same network produces one put of the LATEST slice, read at
            // flush time
            scheduleWrite(
              `${options.label}:${networkId}`,
              options.label,
              () => {
                const latest = options.selectSlices(get())[networkId]
                if (latest === undefined) {
                  // Slice deleted while the write was pending
                  return Promise.resolve()
                }
                return options.putSlice(networkId, latest)
              },
            )
          }
        }
        for (const networkId of Object.keys(before)) {
          if (!(networkId in after)) {
            // A stale pending put must never resurrect a deleted row
            cancelWrite(`${options.label}:${networkId}`)
            if (options.removeSlice !== undefined) {
              void options.removeSlice(networkId).catch((e) => {
                logStore.error(
                  `[${options.label}] Failed to delete from IndexedDB`,
                  e,
                )
              })
            }
          }
        }
      },
      get,
      api,
    )
