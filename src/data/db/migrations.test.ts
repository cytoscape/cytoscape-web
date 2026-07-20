import { Dexie } from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { applyMigrations, migrations } from './migrations'

/**
 * Regression tests for the Dexie migration mechanism.
 *
 * REVIEW.md (P0): in production, the CyDB constructor calls
 * `this.version(currentVersion).stores(Keys)` BEFORE `applyMigrations(this,
 * currentVersion)`. Dexie's `version()` sets `verno` synchronously, so by the
 * time applyMigrations reads `db.verno` it already equals the target version
 * and the `currentDbVersion >= versionNumber` guard ALWAYS early-returns.
 * Net effect: migrations registered in the `migrations` array can never run.
 *
 * The tests below pin both halves of that story:
 *  1. applyMigrations is a no-op once a version >= target has been declared
 *     (the production ordering) — even with a migration registered.
 *  2. applyMigrations DOES register versions when verno is below the target
 *     (proving the guard, not the registration logic, is what blocks it).
 */
describe('applyMigrations', () => {
  const testDbs: Dexie[] = []

  afterEach(async () => {
    // Restore the (normally empty) module-level migrations array
    migrations.length = 0
    for (const db of testDbs) {
      await db.delete().catch(() => {})
    }
    testDbs.length = 0
  })

  it('is a no-op when the schema version was already declared (production constructor ordering)', async () => {
    const db = new Dexie('migrations-test-noop')
    testDbs.push(db)

    const upgradeFn = vi.fn(async () => 0)
    migrations.push({ version: 9, upgradeFn })

    // Mimic the CyDB constructor: declare current version first...
    db.version(9).stores({ items: 'id' })
    expect(db.verno).toBe(9)

    const versionSpy = vi.spyOn(db, 'version')

    // ...then applyMigrations with the same target, as db/index.ts does.
    await applyMigrations(db, 9)

    // Early return: no version registration at all, migration never attached.
    expect(versionSpy).not.toHaveBeenCalled()
    expect(upgradeFn).not.toHaveBeenCalled()
  })

  it('registers target version and migrations when verno is below the target', async () => {
    const db = new Dexie('migrations-test-registers')
    testDbs.push(db)

    const upgradeFn = vi.fn(async () => 0)
    migrations.push({ version: 2, upgradeFn })

    expect(db.verno).toBe(0)
    const versionSpy = vi.spyOn(db, 'version')

    await applyMigrations(db, 3)

    // Both the target version and the migration's version were declared
    expect(versionSpy).toHaveBeenCalledWith(3)
    expect(versionSpy).toHaveBeenCalledWith(2)
    expect(db.verno).toBe(3)
  })

  it('migration upgrade functions run on open when registration happens before a version bump', async () => {
    // Seed a v1 database with a string-typed field
    const seed = new Dexie('migrations-test-upgrade')
    seed.version(1).stores({ items: 'id' })
    await seed.open()
    await seed.table('items').put({ id: 'a', count: '5' })
    seed.close()

    // Reopen at v2 with a data-transforming migration, registered the way
    // applyMigrations would register it if it were reachable
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
