import Dexie from 'dexie'

import { logDb } from '../../debug'
import { currentVersion, DB_NAME, initializeDb } from './index'

// Opens the database explicitly at startup and classifies why it failed.
//
// Before this existed, initializeDb() was never called by application code —
// Dexie opened lazily on the first query inside getWorkspaceFromDb, so the
// missing-object-store audit, the ready/versionchange logging and
// registerDebugTool('db', db) were all dead in production, and an open failure
// surfaced as an unhandled rejection with a blank shell.
//
// The case that actually bites is a schema downgrade: IndexedDB refuses to
// open a database at a version below the one on disk, and currentVersion has
// moved seven times so far.
//
// It needs two builds on one *origin* (scheme + host + port). Any preview
// scheme that gives each branch its own hostname is therefore safe: a distinct
// origin means a distinct IndexedDB. What is not safe is localhost:5500, a
// single origin for every branch you check out:
// run a branch whose schema is ahead, switch back, and the app cannot open the
// database it left behind. Rarer but worse, a production rollback past a
// version bump does the same to every user who booted the newer build.
//
// Either way it used to present as a blank screen with no hint that clearing
// cyweb-db is the fix.

export type DbOpenResult =
  | { kind: 'ok' }
  | { kind: 'schema-too-new'; onDiskVersion?: number; expectedVersion: number }
  | { kind: 'unavailable'; reason: string }

/**
 * Reads the on-disk version without upgrading it.
 *
 * A Dexie instance with no `.version()` call opens at whatever version is on
 * disk and never migrates. dexie-observable deliberately ignores dynamically
 * opened databases, so this probe writes no `_changes` rows and creates no
 * sync node — it cannot disturb cross-tab sync.
 *
 * `indexedDB.databases()` would be the other route, but Firefox does not
 * support it; this works everywhere Dexie does.
 */
const readOnDiskVersion = async (): Promise<number | undefined> => {
  const probe = new Dexie(DB_NAME)
  try {
    await probe.open()
    return probe.verno
  } catch {
    return undefined
  } finally {
    probe.close()
  }
}

export const openDatabaseForStartup = async (): Promise<DbOpenResult> => {
  try {
    await initializeDb()
    return { kind: 'ok' }
  } catch (e) {
    // Compare by name, not instanceof: Dexie builds its error names by
    // concatenation and compares them by name internally, and an instanceof
    // against a re-exported class can fail across the promise-wrapping
    // boundary. Dexie.errnames.Version === 'VersionError'.
    const name = (e as { name?: string })?.name

    if (name === Dexie.errnames.Version) {
      const onDiskVersion = await readOnDiskVersion()
      logDb.error(
        `[startupOpen] on-disk schema v${onDiskVersion ?? '?'} is newer than this build's v${currentVersion}`,
      )
      return {
        kind: 'schema-too-new',
        onDiskVersion,
        expectedVersion: currentVersion,
      }
    }

    // Private browsing (Firefox InvalidStateError, Chrome UnknownError),
    // quota exhaustion, or a corrupt database. Distinct from the above:
    // there is nothing useful to clear.
    logDb.error('[startupOpen] IndexedDB is unavailable', e)
    return { kind: 'unavailable', reason: String(name ?? e) }
  }
}
