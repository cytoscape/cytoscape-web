import Dexie, { Table as DxTable } from 'dexie'

import { logDb } from '../../debug'
import { currentDbScope, profileDbNameFor } from './dbScope'

/**
 * The browser-level database: settings that belong to this browser, not to a
 * workspace (#705, #849).
 *
 * `cyweb-db` is deleted whole by Clear Local Workspace, Load Workspace and the
 * boot-failure reset. Anything the user set up once for this browser has to
 * live somewhere those paths do not reach, and that is this database:
 * `deleteDb()` never touches it.
 *
 * What does NOT belong here: secrets. IndexedDB is plaintext on disk and
 * readable by every script in the origin, with no expiry. API keys stay in
 * sessionStorage (see `features/LLMQuery/store/llmKeySession.ts`).
 *
 * This module deliberately does not import `./index`, is not opened during
 * boot, and does not write through `scheduleWrite`:
 *
 * - It opens on first use, and a failure is never fatal. Reads fall back to
 *   "not saved", so the caller's defaults apply.
 * - `suspendWritesUntilReload()` is a global switch a workspace reset flips.
 *   Routed through it, a setting saved after a reset would be dropped.
 */

// `cyweb-profile-db` for the editor, `cyweb-manual-profile-db` for the in-app
// manual. Fixed for the life of the document: see dbScope.ts.
export const PROFILE_DB_NAME: string = profileDbNameFor(currentDbScope())

// Adding a store needs a new version number, never an edit to one that has
// already run in any browser: Dexie does not re-run a version it has on disk.
export const profileDbVersion: number = 1

export const ProfileStoreNames = {
  // Key/value rows. A new setting is a new key, with no version bump.
  Settings: 'settings',
} as const

export type ProfileStoreNames =
  (typeof ProfileStoreNames)[keyof typeof ProfileStoreNames]

interface ProfileSettingRow {
  key: string
  value: unknown
}

class CyProfileDB extends Dexie {
  [ProfileStoreNames.Settings]!: DxTable<ProfileSettingRow, string>

  constructor(dbName: string) {
    // `addons: []` keeps dexie-observable off this database. It registers
    // itself globally when `./index` loads, and would add its `_changes` and
    // `_syncNodes` stores and track every write for a cross-tab sync nothing
    // here subscribes to.
    super(dbName, { addons: [] })
    this.version(profileDbVersion).stores({
      [ProfileStoreNames.Settings]: 'key',
    })
  }
}

let profileDb: CyProfileDB | undefined

const getProfileDb = (): CyProfileDB => {
  profileDb ??= new CyProfileDB(PROFILE_DB_NAME)
  return profileDb
}

/**
 * Read one setting, or undefined when it was never saved or the database
 * cannot be read.
 *
 * The result is `unknown` on purpose. A stored row is input like any other:
 * the user can edit it, and it outlives the build that wrote it. Every caller
 * validates before use.
 */
export const getProfileSetting = async (key: string): Promise<unknown> => {
  try {
    const row = await getProfileDb()[ProfileStoreNames.Settings].get(key)
    return row?.value
  } catch (e) {
    logDb.warn(`[getProfileSetting] Could not read setting "${key}"`, e)
    return undefined
  }
}

/** Save one setting. Rejects when the database cannot take the write. */
export const putProfileSetting = async (
  key: string,
  value: unknown,
): Promise<void> => {
  try {
    await getProfileDb()[ProfileStoreNames.Settings].put({ key, value })
  } catch (e) {
    logDb.error(`[putProfileSetting] Could not save setting "${key}"`, e)
    throw e
  }
}

/** Remove one setting. Rejects when the database cannot take the write. */
export const deleteProfileSetting = async (key: string): Promise<void> => {
  try {
    await getProfileDb()[ProfileStoreNames.Settings].delete(key)
  } catch (e) {
    logDb.error(`[deleteProfileSetting] Could not delete setting "${key}"`, e)
    throw e
  }
}

/** Close the connection. The next call opens a new one. */
export const closeProfileDb = (): void => {
  profileDb?.close()
  profileDb = undefined
}

/**
 * Delete the whole profile database. No product path calls this: the profile
 * is meant to outlive every workspace reset. It exists so tests can start
 * clean.
 */
export const deleteProfileDb = async (): Promise<void> => {
  closeProfileDb()
  await new Dexie(PROFILE_DB_NAME, { addons: [] }).delete()
}
