// @vitest-environment node
import { Dexie } from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { migrations, registerMigrations } from './migrations'

/**
 * Regression tests for the Dexie migration mechanism (REVIEW.md R2-1).
 *
 * The original implementation (`applyMigrations`) gated registration on
 * `db.verno >= targetVersion`. Because the production CyDB constructor
 * declares `version(currentVersion).stores(Keys)` first — and Dexie's
 * `version()` sets `verno` synchronously — the guard was always true and
 * migrations could never register. The fix (`registerMigrations`) registers
 * unconditionally and lets Dexie decide at open() which upgrade functions
 * the on-disk version actually needs.
 */
describe('registerMigrations', () => {
  const testDbs: Dexie[] = []

  afterEach(async () => {
    // Restore the (normally empty) module-level migrations array
    migrations.length = 0
    for (const db of testDbs) {
      await db.delete().catch(() => {})
    }
    testDbs.length = 0
  })

  // The R2-1 regression test: this exact flow silently skipped the
  // migration before the fix.
  it('a registered migration runs under the production constructor ordering', async () => {
    // A user's existing on-disk DB at the previous schema version,
    // holding a record in the old shape (string count)
    const seed = new Dexie('migrations-test-prod-flow')
    seed.version(8).stores({ items: 'id' })
    await seed.open()
    await seed.table('items').put({ id: 'a', count: '5' })
    seed.close()

    // The app ships a migration for the new version
    migrations.push({
      version: 9,
      upgradeFn: async (tx) => {
        return await tx
          .table('items')
          .toCollection()
          .modify((item) => {
            item.count = Number(item.count)
          })
      },
    })

    // Mimic the CyDB constructor exactly: declare current version first,
    // then register migrations
    const db = new Dexie('migrations-test-prod-flow')
    testDbs.push(db)
    db.version(9).stores({ items: 'id' })
    registerMigrations(db)
    await db.open()

    const migrated = await db.table('items').get('a')
    expect(migrated.count).toBe(5)
  })

  it('registers migrations even when their version is already declared', () => {
    const db = new Dexie('migrations-test-same-version')
    testDbs.push(db)

    const upgradeFn = vi.fn(async () => 0)
    migrations.push({ version: 9, upgradeFn })

    db.version(9).stores({ items: 'id' })
    expect(db.verno).toBe(9)

    // Must attach the upgrade to the existing version declaration rather
    // than early-returning (Dexie's version() returns the existing
    // Version instance for an already-declared number)
    registerMigrations(db)

    const registered = (db as any)._versions.find(
      (v: any) => v._cfg.version === 9,
    )
    expect(registered._cfg.contentUpgrade).toBeDefined()
  })

  it('a migration below the declared version does not skip an already-current database', async () => {
    // Fresh install: no on-disk data, DB opens directly at the current
    // version — the migration must simply not run
    const upgradeFn = vi.fn(async () => 0)
    migrations.push({ version: 8, upgradeFn })

    const db = new Dexie('migrations-test-fresh-install')
    testDbs.push(db)
    db.version(9).stores({ items: 'id' })
    registerMigrations(db)
    await db.open()

    expect(upgradeFn).not.toHaveBeenCalled()
    expect(db.verno).toBe(9)
  })

  it('migration upgrade functions run on open when registration happens before a version bump', async () => {
    // Seed a v1 database with a string-typed field
    const seed = new Dexie('migrations-test-upgrade')
    seed.version(1).stores({ items: 'id' })
    await seed.open()
    await seed.table('items').put({ id: 'a', count: '5' })
    seed.close()

    // Reopen at v2 with a data-transforming migration, registered the way
    // registerMigrations registers it
    const db = new Dexie('migrations-test-upgrade')
    testDbs.push(db)
    db.version(1).stores({ items: 'id' })
    db.version(2).upgrade(async (tx) => {
      await tx
        .table('items')
        .toCollection()
        .modify((item) => {
          item.count = Number(item.count)
        })
    })
    await db.open()

    const migrated = await db.table('items').get('a')
    expect(migrated.count).toBe(5)
  })
})
