// src/app-api/core/appDataApi.ts
//
// Per-app factory for the app-data storage API. Each instance is bound to one
// appId at creation time, so an app can never read or overwrite another app's
// keys. Available via AppContext.apis.appData in mount() — NOT on
// window.CyWebApi, which has no app identity to scope entries to.
//
// Two tiers behind one API:
//
//   export: false (default) — AppDataStore + the `appData` IndexedDB store.
//                             Local; never reaches CX2 or NDEx.
//   export: true            — the network's `cyAppData` opaque aspect. Rides
//                             along with every export, save, clone and merge,
//                             and marks the network modified so an NDEx-backed
//                             network is actually saved (#680).

import { useAppDataStore } from '../../data/hooks/stores/AppDataStore'
import { useOpaqueAspectStore } from '../../data/hooks/stores/OpaqueAspectStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import {
  APP_DATA_GLOBAL_SCOPE,
  CY_APP_DATA_ASPECT_TAG,
  CyAppDataRecord,
} from '../../models/AppDataModel'
import { IdType } from '../../models/IdType'
import type { ApiFailure, ApiResult } from '../types/ApiResult'
import { AppCodes, fail, ok } from '../types/ApiResult'
import type { AppDataApi, SetAppDataOptions } from '../types/AppDataTypes'
import { MAX_APP_DATA_VALUE_BYTES } from '../types/AppDataTypes'

/**
 * Normalize a caller's value into what gets stored.
 *
 * A JSON round trip does three jobs at once: it rejects what IndexedDB and
 * CX2 cannot represent (cycles, BigInt, functions), it enforces the size cap
 * on the encoded form rather than guessing at the object's footprint, and it
 * detaches the stored copy from the caller's object so later mutation of that
 * object does not silently rewrite stored state.
 */
const normalizeValue = (
  key: string,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; failure: ApiFailure } => {
  if (value === undefined) {
    return {
      ok: false,
      failure: fail(
        AppCodes.INVALID_INPUT,
        `value is required for key "${key}"; use remove() to discard a key`,
      ),
    }
  }

  let json: string
  try {
    json = JSON.stringify(value)
  } catch (e) {
    return {
      ok: false,
      failure: fail(AppCodes.APP_DATA_NOT_SERIALIZABLE, key, String(e)),
    }
  }
  // JSON.stringify returns undefined for a bare function or symbol, and drops
  // them silently inside objects — only the top-level case is recoverable.
  if (json === undefined) {
    return {
      ok: false,
      failure: fail(
        AppCodes.APP_DATA_NOT_SERIALIZABLE,
        key,
        `${typeof value} has no JSON representation`,
      ),
    }
  }

  const size = new TextEncoder().encode(json).length
  if (size > MAX_APP_DATA_VALUE_BYTES) {
    return {
      ok: false,
      failure: fail(
        AppCodes.APP_DATA_TOO_LARGE,
        key,
        size,
        MAX_APP_DATA_VALUE_BYTES,
      ),
    }
  }

  return { ok: true, value: JSON.parse(json) }
}

/** True when `networkId` is a network of the current workspace. */
const isWorkspaceNetwork = (networkId: IdType): boolean =>
  useWorkspaceStore.getState().workspace.networkIds.includes(networkId)

/** This network's `cyAppData` records, or an empty list. */
const exportedRecords = (networkId: IdType): CyAppDataRecord[] => {
  const aspect =
    useOpaqueAspectStore.getState().opaqueAspects[networkId]?.[
      CY_APP_DATA_ASPECT_TAG
    ]
  return Array.isArray(aspect) ? (aspect as CyAppDataRecord[]) : []
}

/** A well-formed record belonging to `appId`. */
const ownedBy = (record: unknown, appId: string): record is CyAppDataRecord =>
  typeof record === 'object' &&
  record !== null &&
  (record as CyAppDataRecord).appId === appId &&
  typeof (record as CyAppDataRecord).key === 'string'

/**
 * Replace this app's `key` record in the aspect, or drop it when `value` is
 * absent. Records belonging to other apps — installed or not — are copied
 * through untouched, so a round trip never destroys another host's app data.
 */
const writeExported = (
  networkId: IdType,
  appId: string,
  key: string,
  entry?: CyAppDataRecord,
): void => {
  const kept = exportedRecords(networkId).filter(
    (record) => !(ownedBy(record, appId) && record.key === key),
  )
  const next = entry === undefined ? kept : [...kept, entry]
  useOpaqueAspectStore
    .getState()
    .update(networkId, CY_APP_DATA_ASPECT_TAG, next)
  useWorkspaceStore.getState().setNetworkModified(networkId, true)
}

/** This app's local entries for a scope. */
const localEntries = (
  networkId: IdType,
  appId: string,
): Record<string, unknown> =>
  useAppDataStore.getState().appData[networkId]?.[appId] ?? {}

/**
 * Own-property test, never `in`.
 *
 * Entries live in a plain object, so `'toString' in entries` is true for every
 * scope and `key in` would report inherited `Object.prototype` members as
 * stored values — `get(networkId, 'toString')` returned the function itself.
 */
const hasEntry = (entries: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(entries, key)

/**
 * The one key name app data cannot hold.
 *
 * Boot hydration rebuilds the store with `entries[row.key] = row.value`, and a
 * plain assignment to `__proto__` runs the Object.prototype setter — it would
 * replace the scope object's prototype instead of storing a value. Rejected on
 * write, and by `AppDataRowSchema` on read, so neither path can reach that
 * assignment.
 */
const RESERVED_KEY = '__proto__'

/**
 * Create a per-app AppDataApi bound to `appId`.
 */
export const createAppDataApi = (appId: string): AppDataApi => {
  /** Shared by `set` and `setGlobal`; `exportTier` is false for the latter. */
  const setEntry = (
    networkId: IdType,
    key: string,
    value: unknown,
    exportTier: boolean,
  ): ApiResult => {
    if (key.trim() === '') {
      return fail(
        AppCodes.INVALID_INPUT,
        'key is required and must be non-empty',
      )
    }
    if (key === RESERVED_KEY) {
      return fail(AppCodes.INVALID_INPUT, `key "${RESERVED_KEY}" is reserved`)
    }
    const normalized = normalizeValue(key, value)
    if (!normalized.ok) {
      return normalized.failure
    }

    if (exportTier) {
      writeExported(networkId, appId, key, {
        appId,
        key,
        value: normalized.value,
      })
      // A key lives in exactly one tier; moving it must not leave the old
      // copy behind for get() to find.
      if (hasEntry(localEntries(networkId, appId), key)) {
        useAppDataStore.getState().remove(networkId, appId, key)
      }
    } else {
      useAppDataStore.getState().set(networkId, appId, key, normalized.value)
      if (
        exportedRecords(networkId).some(
          (record) => ownedBy(record, appId) && record.key === key,
        )
      ) {
        writeExported(networkId, appId, key)
      }
    }
    return ok()
  }

  const getEntry = (
    networkId: IdType,
    key: string,
  ): ApiResult<{ value: unknown }> => {
    const local = localEntries(networkId, appId)
    if (hasEntry(local, key)) {
      return ok({ value: local[key] })
    }
    const record = exportedRecords(networkId).find(
      (candidate) => ownedBy(candidate, appId) && candidate.key === key,
    )
    if (record !== undefined) {
      return ok({ value: record.value })
    }
    return fail(AppCodes.APP_DATA_NOT_FOUND, key)
  }

  /**
   * This app's entries for a scope, both tiers merged.
   *
   * A local function, not `this.getAll()`: the API object is handed to apps and
   * `const { keys } = ctx.apis.appData` is ordinary usage, which leaves `this`
   * undefined and turned `keys()` into an APP3 failure.
   */
  const allEntries = (networkId: IdType): Record<string, unknown> => {
    const entries: Record<string, unknown> = {
      ...localEntries(networkId, appId),
    }
    for (const record of exportedRecords(networkId)) {
      if (ownedBy(record, appId)) {
        entries[record.key] = record.value
      }
    }
    return entries
  }

  const removeEntry = (networkId: IdType, key: string): ApiResult => {
    if (hasEntry(localEntries(networkId, appId), key)) {
      useAppDataStore.getState().remove(networkId, appId, key)
    }
    if (
      exportedRecords(networkId).some(
        (record) => ownedBy(record, appId) && record.key === key,
      )
    ) {
      writeExported(networkId, appId, key)
    }
    return ok()
  }

  return {
    // ── Network-scoped ──────────────────────────────────────────

    set(networkId, key, value, options: SetAppDataOptions = {}): ApiResult {
      try {
        if (!isWorkspaceNetwork(networkId)) {
          return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
        }
        return setEntry(networkId, key, value, options.export === true)
      } catch (e) {
        return fail(AppCodes.OPERATION_FAILED, String(e))
      }
    },

    get(networkId, key): ApiResult<{ value: unknown }> {
      try {
        return getEntry(networkId, key)
      } catch (e) {
        return fail(AppCodes.OPERATION_FAILED, String(e))
      }
    },

    getAll(networkId): ApiResult<{ entries: Record<string, unknown> }> {
      try {
        return ok({ entries: allEntries(networkId) })
      } catch (e) {
        return fail(AppCodes.OPERATION_FAILED, String(e))
      }
    },

    remove(networkId, key): ApiResult {
      try {
        return removeEntry(networkId, key)
      } catch (e) {
        return fail(AppCodes.OPERATION_FAILED, String(e))
      }
    },

    keys(networkId): ApiResult<{ keys: string[] }> {
      try {
        return ok({ keys: Object.keys(allEntries(networkId)) })
      } catch (e) {
        return fail(AppCodes.OPERATION_FAILED, String(e))
      }
    },

    // ── App-scoped ──────────────────────────────────────────────

    setGlobal(key, value): ApiResult {
      try {
        return setEntry(APP_DATA_GLOBAL_SCOPE, key, value, false)
      } catch (e) {
        return fail(AppCodes.OPERATION_FAILED, String(e))
      }
    },

    getGlobal(key): ApiResult<{ value: unknown }> {
      try {
        return getEntry(APP_DATA_GLOBAL_SCOPE, key)
      } catch (e) {
        return fail(AppCodes.OPERATION_FAILED, String(e))
      }
    },

    removeGlobal(key): ApiResult {
      try {
        return removeEntry(APP_DATA_GLOBAL_SCOPE, key)
      } catch (e) {
        return fail(AppCodes.OPERATION_FAILED, String(e))
      }
    },
  }
}
