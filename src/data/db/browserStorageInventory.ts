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
  // Written by MUI's CssVarsProvider (`App.tsx`) when the toolbar's
  // appearance menu picks system, light or dark; with none, the app follows
  // the system setting. MUI's
  // default `modeStorageKey` and `colorSchemeStorageKey` plus `-light`/`-dark`.
  'mui-mode',
  'mui-color-scheme-light',
  'mui-color-scheme-dark',
] as const

export type CywebLocalStorageKey = (typeof CYWEB_LOCAL_STORAGE_KEYS)[number]

/**
 * dexie-observable's localStorage keys all end in the database name:
 * `Dexie.Observable/latestRevision/<db>`, `Dexie.Observable/intercomm/<db>`
 * and `Dexie.Observable/deadnode:<id>/<db>`. Only those for one of
 * Cytoscape Web's databases are ours; another app on the origin may use the
 * library for its own.
 */
export const DEXIE_OBSERVABLE_KEY_PREFIX = 'Dexie.Observable/'

/**
 * localStorage key prefixes written by libraries on Cytoscape Web's behalf.
 * Matched with `startsWith`, never a regular expression.
 */
export const CYWEB_LOCAL_STORAGE_PREFIXES: readonly string[] = [
  // keycloak-js: the state of a login redirect that never came back. The key
  // carries no owner, only a random state id, so every one on the origin
  // goes; at worst that restarts a login redirect that is in flight.
  'kc-callback-',
]

const isCywebDexieObservableKey = (key: string): boolean => {
  if (!key.startsWith(DEXIE_OBSERVABLE_KEY_PREFIX)) {
    return false
  }
  const database = key.slice(key.lastIndexOf('/') + 1)
  return CYWEB_DATABASE_NAMES.includes(database)
}

/** sessionStorage keys Cytoscape Web writes. Each tab has its own copy. */
export const CYWEB_SESSION_STORAGE_KEYS = [
  'cyweb.tab.viewState',
  'cyweb.tab.networkId',
  'cyweb.llm.apiKeys',
] as const

export type CywebSessionStorageKey = (typeof CYWEB_SESSION_STORAGE_KEYS)[number]

const isCywebLocalKey = (key: string): boolean =>
  (CYWEB_LOCAL_STORAGE_KEYS as readonly string[]).includes(key) ||
  isCywebDexieObservableKey(key) ||
  CYWEB_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))

/**
 * Remove Cytoscape Web's keys from localStorage and leave every other key on
 * the origin alone. Never throws: storage can be disabled or throw on access.
 *
 * @returns false when storage could not be read or written.
 */
export const removeCywebLocalStorage = (storage?: Storage): boolean => {
  try {
    // Resolved in here, not as a default parameter: the `localStorage` getter
    // itself throws SecurityError when the browser blocks site data.
    const target = storage ?? globalThis.localStorage
    if (target === undefined) {
      return true
    }
    // Collect first: removing while indexing shifts the remaining keys.
    const keys: string[] = []
    for (let i = 0; i < target.length; i++) {
      const key = target.key(i)
      if (key !== null && isCywebLocalKey(key)) {
        keys.push(key)
      }
    }
    keys.forEach((key) => target.removeItem(key))
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
export const removeCywebSessionStorage = (storage?: Storage): boolean => {
  try {
    // Inside the try for the same reason as removeCywebLocalStorage.
    const target = storage ?? globalThis.sessionStorage
    if (target === undefined) {
      return true
    }
    CYWEB_SESSION_STORAGE_KEYS.forEach((key) => target.removeItem(key))
    return true
  } catch {
    return false
  }
}
