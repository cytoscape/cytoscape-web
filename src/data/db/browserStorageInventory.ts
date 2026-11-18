/**
 * Everything Cytoscape Web keeps in this browser, by name.
 *
 * One list with two readers: Help › Developer › Clear Local Cache deletes
 * exactly what is named here (`clearLocalCache.ts`), and the manual's storage
 * page (`features/Manual/components/BrowserStorageView.tsx`) shows it. A key
 * added to the app and missed here survives the clear, so
 * `features/Manual/components/browserStorageInventory.test.ts` checks every
 * writer against this file.
 *
 * Plain strings on purpose: this module is imported by the boot shell, before
 * React and the feature modules load, so it cannot import the features that
 * own the keys. The test imports their constants instead.
 */

import { dbNameFor, profileDbNameFor } from './dbScope'

/**
 * Every IndexedDB database Cytoscape Web creates: the editor's workspace and
 * profile databases, and the manual's sandbox copies of both.
 */
export const CYWEB_DATABASE_NAMES: readonly string[] = [
  dbNameFor('app'),
  profileDbNameFor('app'),
  dbNameFor('manual'),
  profileDbNameFor('manual'),
]

/** localStorage keys Cytoscape Web writes. */
export const CYWEB_LOCAL_STORAGE_KEYS = [
  'cyweb.onboarding',
  'cytoscapeWebCrashDataConsent',
  'cytoscapeWebDesktopPermissionNoticeSeen',
  'cyweb-network-search',
  'cyweb-debug-enabled',
  // Written by the `debug` package when developer logging is switched on.
  'debug',
] as const

export type CywebLocalStorageKey = (typeof CYWEB_LOCAL_STORAGE_KEYS)[number]

/**
 * localStorage key prefixes written by libraries on Cytoscape Web's behalf.
 * Matched with `startsWith`, never a regular expression.
 */
export const CYWEB_LOCAL_STORAGE_PREFIXES: readonly string[] = [
  // dexie-observable: `latestRevision/<db>`, `intercomm/<db>`, `deadnode:<id>`.
  'Dexie.Observable/',
  // keycloak-js: the state of a login redirect that never came back.
  'kc-callback-',
]

/** sessionStorage keys Cytoscape Web writes. Each tab has its own copy. */
export const CYWEB_SESSION_STORAGE_KEYS = [
  'cyweb.tab.viewState',
  'cyweb.tab.networkId',
  'cyweb.llm.apiKeys',
] as const

export type CywebSessionStorageKey = (typeof CYWEB_SESSION_STORAGE_KEYS)[number]

const isCywebLocalKey = (key: string): boolean =>
  (CYWEB_LOCAL_STORAGE_KEYS as readonly string[]).includes(key) ||
  CYWEB_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))

/**
 * Remove Cytoscape Web's keys from localStorage and leave every other key on
 * the origin alone. Never throws: storage can be disabled or throw on access.
 *
 * @returns false when storage could not be read or written.
 */
export const removeCywebLocalStorage = (
  storage: Storage | undefined = globalThis.localStorage,
): boolean => {
  if (storage === undefined) {
    return true
  }
  try {
    // Collect first: removing while indexing shifts the remaining keys.
    const keys: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key !== null && isCywebLocalKey(key)) {
        keys.push(key)
      }
    }
    keys.forEach((key) => storage.removeItem(key))
    return true
  } catch {
    return false
  }
}

/**
 * Remove Cytoscape Web's keys from this tab's sessionStorage. Never throws.
 *
 * @returns false when storage could not be written.
 */
export const removeCywebSessionStorage = (
  storage: Storage | undefined = globalThis.sessionStorage,
): boolean => {
  if (storage === undefined) {
    return true
  }
  try {
    CYWEB_SESSION_STORAGE_KEYS.forEach((key) => storage.removeItem(key))
    return true
  } catch {
    return false
  }
}
