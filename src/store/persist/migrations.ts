import { Transaction, Dexie } from 'dexie'

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

export const applyMigrations = async (
  db: Dexie,
  versionNumber: number,
): Promise<void> => {
  // Current version of the existing DB in user's browser.
  // This is always an integer
  const currentDbVersion: number = await db.verno

  if (currentDbVersion >= versionNumber) {
    console.log(
      `IndexedDB is already at version ${currentDbVersion}, no migration needed`,
    )
    return
  }

  // Create the given version
  db.version(versionNumber).upgrade(async (tx) => {})

  // needed for dexie observables to add it's tables
  migrations.forEach(async (migration) => {
    await db.version(migration.version).upgrade(migration.upgradeFn)
  })

  const version = await db.verno
  console.log(`IndexedDB migrated to version ${version}`)
}
