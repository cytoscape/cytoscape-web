import { AppDataEntries } from '../AppDataModel'
import { IdType } from '../IdType'

export interface AppDataState {
  /** Local-tier entries: networkId → appId → key → value. */
  readonly appData: AppDataEntries
}

export interface AppDataActions {
  /**
   * Load every persisted local-tier row into the store.
   *
   * Called once from the boot WORKSPACE phase, before the app API is marked
   * ready, so `appData.get()` can stay synchronous and still answer for any
   * network in the workspace — including ones whose network data has not been
   * loaded yet.
   */
  readonly hydrate: () => Promise<void>

  readonly set: (
    networkId: IdType,
    appId: string,
    key: string,
    value: unknown,
  ) => void

  readonly remove: (networkId: IdType, appId: string, key: string) => void

  /** Drop every app's entries for one network. */
  readonly deleteNetwork: (networkId: IdType) => void

  /**
   * Drop every network-scoped entry, keeping the app-scoped ones — emptying
   * the workspace says nothing about data stored with `setGlobal`.
   */
  readonly deleteAllNetworks: () => void

  /** Drop every entry, app-scoped ones included. */
  readonly deleteAll: () => void
}

export type AppDataStore = AppDataState & AppDataActions
