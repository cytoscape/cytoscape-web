import { Dexie, Transaction } from 'dexie'

export interface DexieMigration {
  version: number
  upgradeFn: (tx: Transaction) => Promise<number>
}

export const migrations: DexieMigration[] = [
  // Example migration, version must be uniq
  // {
  //   version: 2,
  //   upgradeFn: async (tx: Transaction) => {
  //     return await tx
  //       .table('summaries')
  //       .toCollection()
  //       .modify((summary) => {
  //         summary.modificationTime = new Date(summary.modificationTime)
  //       })
  //   },
  // },
]

/**
 * Registers every migration on the Dexie instance.
 *
 * Must be called from the DB constructor, BEFORE the database is opened.
 * Registration is unconditional: Dexie itself compares each registered
 * version against the on-disk version during open() and runs only the
 * upgrade functions the user's database actually needs.
 *
 * Do NOT gate registration on db.verno — Dexie's version() sets verno
 * synchronously at declaration time, so after the schema declaration in the
 * constructor verno always equals the current version regardless of what is
 * on disk. A verno-based guard therefore skips registration for every user
 * (see REVIEW.md R2-1).
 */
export const registerMigrations = (db: Dexie): void => {
  migrations.forEach((migration) => {
    db.version(migration.version).upgrade(migration.upgradeFn)
  })
}
