/**
 * Global flag used to prevent infinite write loops during cross-tab synchronization.
 *
 * When a tab receives a BroadcastChannel message that the database has been mutated
 * by another tab, it fetches the updated data and sets it into the local Zustand store.
 * The Zustand store mutation would normally trigger the persistence layer to write
 * the data back to IndexedDB.
 *
 * To prevent this, `isHydrating` is set to true during the sync process. The persistence
 * layer (`persistNetworkSlices` and manual store DB puts) must check this flag and skip
 * writing to the DB if it is true.
 */
let hydratingCount = 0

export const isHydrating = (): boolean => hydratingCount > 0

export const setHydrating = (value: boolean): void => {
  if (value) {
    hydratingCount++
  } else {
    hydratingCount = Math.max(0, hydratingCount - 1)
  }
}
