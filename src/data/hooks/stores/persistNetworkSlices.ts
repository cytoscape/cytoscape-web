import { StateCreator, StoreApi } from 'zustand'

import { logStore } from '../../../debug'
import { IdType } from '../../../models/IdType'

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
        const after = options.selectSlices(get())
        if (before === after) {
          return
        }

        const writes: Array<Promise<unknown>> = []
        for (const networkId of Object.keys(after)) {
          if (before[networkId] !== after[networkId]) {
            writes.push(options.putSlice(networkId, after[networkId]))
          }
        }
        if (options.removeSlice !== undefined) {
          for (const networkId of Object.keys(before)) {
            if (!(networkId in after)) {
              writes.push(options.removeSlice(networkId))
            }
          }
        }

        if (writes.length > 0) {
          logStore.info(`[${options.label}] Persisting to IndexedDB`)
          void Promise.all(writes).catch((e) => {
            logStore.error(
              `[${options.label}] Failed to persist to IndexedDB`,
              e,
            )
          })
        }
      },
      get,
      api,
    )
