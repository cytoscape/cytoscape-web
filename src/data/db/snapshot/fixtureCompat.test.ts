import * as fs from 'fs'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  closeDb,
  deleteDb,
  getNetworkFromDb,
  getWorkspaceFromDb,
  initializeDb,
  ObjectStoreNames,
} from '../index'
import { importDatabaseSnapshot } from './index'

/**
 * Backward-compatibility tests: every historical DB snapshot fixture in
 * test/fixtures/db-snapshots/ must import successfully into the current
 * schema, and every network it contains must be readable afterwards.
 *
 * These fixtures were created for exactly this purpose (see
 * test/fixtures/db-snapshots/db-snapshots.md) but nothing consumed them
 * until now. Note that the fixtures store `metadata.version` on the native
 * IndexedDB scale (e.g. 70) while current exports use Dexie's verno (e.g. 7);
 * import intentionally does not check the version, which these tests pin.
 */
const FIXTURE_DIR = path.resolve(
  __dirname,
  '../../../../test/fixtures/db-snapshots',
)

const fixtureFiles = fs
  .readdirSync(FIXTURE_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()

describe('historical snapshot fixtures import into the current schema', () => {
  beforeEach(async () => {
    await deleteDb()
    await initializeDb()
  })

  afterEach(async () => {
    await closeDb()
  })

  it('has fixtures to test against', () => {
    expect(fixtureFiles.length).toBeGreaterThan(0)
  })

  it.each(fixtureFiles)(
    'imports %s and can read back its networks',
    async (fixtureFile) => {
      const snapshotJson = fs.readFileSync(
        path.join(FIXTURE_DIR, fixtureFile),
        'utf8',
      )
      const snapshot = JSON.parse(snapshotJson)

      const result = await importDatabaseSnapshot(snapshotJson)

      expect(result.success).toBe(true)
      expect(result.errors ?? []).toEqual([])

      // Every store present in the fixture imported the expected record count
      const networks = snapshot.data[ObjectStoreNames.CyNetworks] ?? []
      expect(result.importedCounts[ObjectStoreNames.CyNetworks]).toBe(
        networks.length,
      )
      expect(result.importedCounts[ObjectStoreNames.Workspace]).toBe(
        (snapshot.data[ObjectStoreNames.Workspace] ?? []).length,
      )

      // Each imported network must be individually readable
      for (const network of networks) {
        const fromDb = await getNetworkFromDb(network.id)
        expect(fromDb, `network ${network.id} from ${fixtureFile}`).toBeDefined()
      }

      // The imported workspace must be resolvable (not a freshly created one)
      const fixtureWorkspace = snapshot.data[ObjectStoreNames.Workspace]?.[0]
      if (fixtureWorkspace !== undefined) {
        const ws = await getWorkspaceFromDb(fixtureWorkspace.id)
        expect(ws.id).toBe(fixtureWorkspace.id)
        expect(ws.networkIds).toEqual(fixtureWorkspace.networkIds)
      }
    },
    30000,
  )
})
