import { Transaction, Dexie } from 'dexie'
import { ObjectStoreNames } from './db'

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
  // needed for dexie observables to add it's tables
  db.version(versionNumber).upgrade(async (tx) => {})
  // migrations.forEach(async (migration) => {
  //   await db.version(migration.version).upgrade(migration.upgradeFn)
  // })
  // db.tables.forEach(function (table) {
  //   console.log(
  //     '!! Schema of ' + table.name + ': ' + JSON.stringify(table.schema),
  //   )
  // })
}
