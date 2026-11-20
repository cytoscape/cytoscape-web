// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

import { CONSENT_STORAGE_KEY } from '@/data/hooks/useCrashDataConsent'
import { DESKTOP_PERMISSION_NOTICE_STORAGE_KEY } from '@/data/hooks/useCytoscapeDesktopPermissionNotice'
import {
  TAB_NETWORK_KEY,
  TAB_VIEW_STATE_KEY,
} from '@/data/tabState/storageKeys'
import { DEBUG_OVERRIDE_KEY } from '@/debug'
import { LLM_API_KEYS_SESSION_KEY } from '@/features/LLMQuery/store/storageKeys'
import { NETWORK_SEARCH_STORAGE_KEY } from '@/features/NetworkSearch/store/networkSearchProviderSelectionStore'
import { ONBOARDING_STORAGE_KEY } from '@/features/Onboarding/store/onboardingPersistence'
import {
  CYWEB_DATABASE_NAMES,
  CYWEB_LOCAL_STORAGE_KEYS,
  CYWEB_SESSION_STORAGE_KEYS,
} from '@/data/db/browserStorageInventory'
import { dbNameFor, profileDbNameFor } from '@/data/db/dbScope'

/**
 * Clear Local Cache deletes what this inventory names and nothing else, so a
 * key the app writes without listing it survives the clear (#989). The
 * BrowserStorageView beside this file shows the same inventory. It lives here,
 * not beside the inventory in src/data, because it imports the features that
 * own the keys (src/data/layering.test.ts).
 */

const SRC = join(__dirname, '..', '..', '..')

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)
      ? [path]
      : []
  })

/**
 * Every file that writes Web Storage: which storage, and each key it writes,
 * by the name of the constant the file passes. A new writer fails the scan
 * below until it is added here, and a writer that starts writing a second key
 * fails until that key is added here and to the inventory.
 */
const WRITERS: Record<
  string,
  { storage: 'local' | 'session'; keys: Record<string, string> }
> = {
  'debug.ts': { storage: 'local', keys: { DEBUG_OVERRIDE_KEY } },
  'data/hooks/useCrashDataConsent.ts': {
    storage: 'local',
    keys: { CONSENT_STORAGE_KEY },
  },
  'data/hooks/useCytoscapeDesktopPermissionNotice.ts': {
    storage: 'local',
    keys: { DESKTOP_PERMISSION_NOTICE_STORAGE_KEY },
  },
  'features/Onboarding/store/onboardingPersistence.ts': {
    storage: 'local',
    keys: { ONBOARDING_STORAGE_KEY },
  },
  // zustand's `persist` middleware defaults to localStorage.
  'features/NetworkSearch/store/networkSearchProviderSelectionStore.ts': {
    storage: 'local',
    keys: { NETWORK_SEARCH_STORAGE_KEY },
  },
  'data/tabState/tabNetwork.ts': {
    storage: 'session',
    keys: { TAB_NETWORK_KEY },
  },
  'data/tabState/tabViewState.ts': {
    storage: 'session',
    keys: { TAB_VIEW_STATE_KEY },
  },
  'features/LLMQuery/store/llmKeySession.ts': {
    storage: 'session',
    keys: { LLM_API_KEYS_SESSION_KEY },
  },
}

const WRITES_STORAGE =
  /\b(localStorage|sessionStorage)\.setItem\(|import\s*\{[^}]*\bpersist\b[^}]*\}\s*from\s*'zustand\/middleware'/

/**
 * The key argument of every write in a file, as written: the first argument
 * of each `setItem(` call, and the `name` of a zustand `persist` store.
 */
const keyArguments = (source: string): string[] => [
  ...[
    ...source.matchAll(
      /\b(?:localStorage|sessionStorage)\.setItem\(\s*([^,)]+)/g,
    ),
  ].map((match) => match[1].trim()),
  ...(/\bpersist\(/.test(source)
    ? [...source.matchAll(/\bname:\s*([^,}\s]+)/g)].map((match) => match[1])
    : []),
]

describe('browser storage inventory', () => {
  it('lists every Web Storage writer in src/', () => {
    const writers = sourceFiles(SRC)
      .filter((file) => WRITES_STORAGE.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file))
      .sort()

    expect(writers).toEqual(Object.keys(WRITERS).sort())
  })

  it('knows every key each writer writes', () => {
    for (const [file, { keys }] of Object.entries(WRITERS)) {
      const written = keyArguments(readFileSync(join(SRC, file), 'utf8'))

      expect(written.length, file).toBeGreaterThan(0)
      for (const argument of written) {
        expect(Object.keys(keys), `${file} writes ${argument}`).toContain(
          argument,
        )
      }
    }
  })

  it('lists every written key in the inventory for its storage', () => {
    for (const { storage, keys } of Object.values(WRITERS)) {
      const inventory: readonly string[] =
        storage === 'local'
          ? CYWEB_LOCAL_STORAGE_KEYS
          : CYWEB_SESSION_STORAGE_KEYS
      for (const key of Object.values(keys)) {
        expect(inventory).toContain(key)
      }
    }
  })

  /**
   * MUI's CssVarsProvider persists the color mode itself, with no setItem in
   * our code to find. With its storage-key props left at their defaults it
   * writes `mui-mode` and `mui-color-scheme-light`/`-dark` (MUI 5,
   * `InitColorSchemeScript` defaultConfig).
   */
  it('lists the keys of every CssVarsProvider', () => {
    const providers = sourceFiles(SRC)
      .filter((file) =>
        /import\s*\{[^}]*CssVarsProvider[^}]*\}\s*from\s*'@mui\//.test(
          readFileSync(file, 'utf8'),
        ),
      )
      .map((file) => relative(SRC, file))

    expect(providers).toEqual(['App.tsx'])
    const app = readFileSync(join(SRC, 'App.tsx'), 'utf8')
    // Custom keys would move the writes to names the inventory does not list.
    expect(app).not.toMatch(/modeStorageKey|colorSchemeStorageKey/)
    expect(CYWEB_LOCAL_STORAGE_KEYS).toEqual(
      expect.arrayContaining([
        'mui-mode',
        'mui-color-scheme-light',
        'mui-color-scheme-dark',
      ]),
    )
  })

  it('names both scopes of both databases', () => {
    expect([...CYWEB_DATABASE_NAMES].sort()).toEqual(
      [
        dbNameFor('app'),
        dbNameFor('manual'),
        profileDbNameFor('app'),
        profileDbNameFor('manual'),
      ].sort(),
    )
  })
})
