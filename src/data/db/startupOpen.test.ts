import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'

import { currentVersion, DB_NAME, deleteDb } from './index'
import { openDatabaseForStartup } from './startupOpen'

// The suite shares one fake-indexeddb, so a test that leaves a v99 database
// behind breaks every later test that opens cyweb-db. Always clean up.
afterEach(async () => {
  await deleteDb()
})

describe('openDatabaseForStartup', () => {
  it('opens a healthy database', async () => {
    expect(await openDatabaseForStartup()).toEqual({ kind: 'ok' })
  })

  it('classifies an on-disk schema newer than this build', async () => {
    // Exactly the branch-deploy case: a reviewer opens a newer deploy, then
    // goes back to an older one in the same browser profile.
    const future = new Dexie(DB_NAME)
    future.version(99).stores({ workspace: 'id' })
    await future.open()
    future.close()

    expect(await openDatabaseForStartup()).toEqual({
      kind: 'schema-too-new',
      onDiskVersion: 99,
      expectedVersion: currentVersion,
    })
  })

  it('reports the on-disk version without upgrading it', async () => {
    const future = new Dexie(DB_NAME)
    future.version(42).stores({ workspace: 'id' })
    await future.open()
    future.close()

    await openDatabaseForStartup()

    // The version-less probe must not have migrated the database out from
    // under the user while merely reporting on it.
    const check = new Dexie(DB_NAME)
    await check.open()
    const verno = check.verno
    check.close()
    expect(verno).toBe(42)
  })

  it('leaves no dexie-observable _changes rows behind', async () => {
    const future = new Dexie(DB_NAME)
    future.version(77).stores({ workspace: 'id', _changes: '++rev' })
    await future.open()
    await future.table('_changes').clear()
    future.close()

    await openDatabaseForStartup()

    // dexie-observable ignores dynamically-opened databases, so the probe
    // cannot pollute cross-tab sync.
    const check = new Dexie(DB_NAME)
    await check.open()
    const changeCount = await check.table('_changes').count()
    check.close()
    expect(changeCount).toBe(0)
  })
})
