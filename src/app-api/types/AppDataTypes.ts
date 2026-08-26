// src/app-api/types/AppDataTypes.ts
//
// Public types for the per-app data domain (`AppContext.apis.appData`).

import type { IdType } from '@/models/IdType'
import type { ApiResult } from './ApiResult'

/** Largest JSON-encoded value one entry may hold, in bytes. */
export const MAX_APP_DATA_VALUE_BYTES = 5 * 1024 * 1024

export interface SetAppDataOptions {
  /**
   * Whether the entry travels with the network.
   *
   * `false` (default) stores it locally, keyed to the network id. It never
   * appears in a CX2 download, an NDEx save, or "Open in Cytoscape" — derived
   * caches stay out of every network the user shares.
   *
   * `true` stores it in the network's `cyAppData` opaque aspect, so it is
   * saved to NDEx and present in every export, and marks the network modified.
   * Opt in per key, for results that are meant to follow the network.
   */
  readonly export?: boolean
}

/**
 * Per-app key/value storage, bound to one `appId`.
 *
 * Reads are scoped to the calling app: one app can neither read nor overwrite
 * another app's keys, and `getAll`/`keys` never report them.
 *
 * Entries survive the app being disabled and re-enabled — results the user
 * paid compute for outlive a toggle. Use `remove` to discard them.
 *
 * Values must survive a JSON round trip. They are stored as the round-tripped
 * copy, so later mutation of the object you passed in does not change what is
 * stored. Each value is capped at `MAX_APP_DATA_VALUE_BYTES`.
 */
export interface AppDataApi {
  // ── Network-scoped ────────────────────────────────────────────

  /**
   * Store `value` under `key` for `networkId`.
   *
   * Upsert. A key lives in exactly one tier: setting it with a different
   * `options.export` moves it, rather than leaving a stale copy behind.
   */
  set(
    networkId: IdType,
    key: string,
    value: unknown,
    options?: SetAppDataOptions,
  ): ApiResult

  /**
   * Read one key for `networkId`, from whichever tier holds it.
   *
   * Fails with `APP11` when nothing is stored under `key` — an absent key and
   * a stored `null` are distinguishable.
   */
  get(networkId: IdType, key: string): ApiResult<{ value: unknown }>

  /** Every key this app stored for `networkId`, both tiers merged. */
  getAll(networkId: IdType): ApiResult<{ entries: Record<string, unknown> }>

  /** Remove one key for `networkId`. Succeeds even if the key was absent. */
  remove(networkId: IdType, key: string): ApiResult

  /** The key names `getAll` would return, without the values. */
  keys(networkId: IdType): ApiResult<{ keys: string[] }>

  // ── App-scoped (no network) ───────────────────────────────────

  /**
   * Store `value` under `key` for this app, independent of any network.
   *
   * Always local: there is no network for an app-scoped entry to travel with.
   */
  setGlobal(key: string, value: unknown): ApiResult

  /** Read one app-scoped key. Fails with `APP11` when absent. */
  getGlobal(key: string): ApiResult<{ value: unknown }>

  /** Remove one app-scoped key. Succeeds even if the key was absent. */
  removeGlobal(key: string): ApiResult
}
