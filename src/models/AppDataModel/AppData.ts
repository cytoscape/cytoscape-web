// src/models/AppDataModel/AppData.ts
//
// Storage model behind the app API's `appData` domain: per-app key/value data
// an app owns, in two tiers.
//
//   Local tier (default)    — this model's state, persisted to the `appData`
//                             IndexedDB store. Never leaves the browser.
//   Exported tier (opt-in)  — the `cyAppData` opaque aspect, so entries ride
//                             along with CX2 export, NDEx save, clone and
//                             merge like any other unrecognized aspect.
//
// Only the local tier needs a state shape of its own; the exported tier lives
// in `OpaqueAspectStore` and is defined here only by its record shape.

import { IdType } from '../IdType'

/**
 * Opaque-aspect name shared by every app's exported entries.
 *
 * One aspect for all apps rather than one aspect per app: apps then cannot
 * collide in the CX2 aspect namespace, and a host that does not know this
 * aspect passes the whole thing through untouched.
 */
export const CY_APP_DATA_ASPECT_TAG = 'cyAppData'

/**
 * One record inside the `cyAppData` opaque aspect.
 *
 * `appId` scopes the record to its owning app. Records whose `appId` belongs
 * to an app that is not installed are never read, written or dropped — they
 * survive a round trip through Cytoscape Web so another host's app data is
 * not destroyed by a save.
 */
export interface CyAppDataRecord {
  readonly appId: string
  readonly key: string
  readonly value: unknown
}

/**
 * The `networkId` under which app-scoped (non-network) entries are stored.
 *
 * An empty id can never collide with a real network id, so `setGlobal` is the
 * same code path as `set` with this scope rather than a second store.
 */
export const APP_DATA_GLOBAL_SCOPE: IdType = ''

/** Local-tier state: networkId → appId → key → value. */
export interface AppDataEntries {
  [networkId: IdType]: {
    [appId: string]: {
      [key: string]: unknown
    }
  }
}

/**
 * One local-tier row as it is stored in IndexedDB.
 *
 * A row per key, not per network: a write re-serializes only the entry that
 * changed, where a network-wide row would re-serialize every key the app owns
 * on that network on every call (#592).
 */
export interface AppDataRow {
  /** Primary key — see `appDataRowId`. */
  id: string
  appId: string
  networkId: IdType
  key: string
  value: unknown
}
