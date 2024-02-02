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

export const applyMigrations = async (db: Dexie): Promise<void> => {
  // needed for dexie observables to add it's tables
  db.version(2).stores({})
  migrations.forEach(async (migration) => {
    await db.version(migration.version).upgrade(migration.upgradeFn)
  })
}
