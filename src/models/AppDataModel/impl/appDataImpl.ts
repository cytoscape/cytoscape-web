// src/models/AppDataModel/impl/appDataImpl.ts
//
// Pure state operations for the local app-data tier. No React, no Zustand —
// `AppDataStore` wraps these and adds persistence.

import { IdType } from '../../IdType'
import { APP_DATA_GLOBAL_SCOPE, AppDataEntries, AppDataRow } from '../AppData'

export interface AppDataState {
  readonly appData: AppDataEntries
}

/**
 * Primary key for a local-tier row.
 *
 * Every segment is URI-encoded before joining, so an app id, network id or
 * key that itself contains the separator cannot forge another entry's row id.
 */
export const appDataRowId = (
  appId: string,
  networkId: IdType,
  key: string,
): string =>
  `${encodeURIComponent(appId)}::${encodeURIComponent(networkId)}::${encodeURIComponent(key)}`

/** Set one entry, creating the network and app levels as needed. */
export const setEntry = (
  state: AppDataState,
  networkId: IdType,
  appId: string,
  key: string,
  value: unknown,
): AppDataState => {
  const networkEntries = state.appData[networkId] ?? {}
  const appEntries = networkEntries[appId] ?? {}
  return {
    ...state,
    appData: {
      ...state.appData,
      [networkId]: {
        ...networkEntries,
        [appId]: { ...appEntries, [key]: value },
      },
    },
  }
}

/** Remove one entry. Leaves empty app/network levels behind — harmless. */
export const removeEntry = (
  state: AppDataState,
  networkId: IdType,
  appId: string,
  key: string,
): AppDataState => {
  const appEntries = state.appData[networkId]?.[appId]
  if (appEntries === undefined || !(key in appEntries)) {
    return state
  }
  const rest = { ...appEntries }
  delete rest[key]
  return {
    ...state,
    appData: {
      ...state.appData,
      [networkId]: { ...state.appData[networkId], [appId]: rest },
    },
  }
}

/** Drop every app's entries for one network. */
export const deleteNetwork = (
  state: AppDataState,
  networkId: IdType,
): AppDataState => {
  if (state.appData[networkId] === undefined) {
    return state
  }
  const rest = { ...state.appData }
  delete rest[networkId]
  return { ...state, appData: rest }
}

/**
 * Drop every network-scoped entry, keeping the app-scoped ones.
 *
 * Used by the "delete all networks" cascade: emptying the workspace says
 * nothing about data an app stored with `setGlobal`, which is not tied to any
 * network.
 */
export const deleteAllNetworks = (state: AppDataState): AppDataState => {
  const globalEntries = state.appData[APP_DATA_GLOBAL_SCOPE]
  return {
    ...state,
    appData:
      globalEntries === undefined
        ? {}
        : { [APP_DATA_GLOBAL_SCOPE]: globalEntries },
  }
}

/** Drop every entry, app-scoped ones included. */
export const deleteAll = (state: AppDataState): AppDataState => ({
  ...state,
  appData: {},
})

/** Rebuild the whole state from persisted rows (boot hydration). */
export const fromRows = (rows: AppDataRow[]): AppDataEntries => {
  const entries: AppDataEntries = {}
  for (const row of rows) {
    const networkEntries = (entries[row.networkId] ??= {})
    const appEntries = (networkEntries[row.appId] ??= {})
    appEntries[row.key] = row.value
  }
  return entries
}
