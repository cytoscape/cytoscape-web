import type { DexieOptions } from 'dexie'

/**
 * Dexie options that put a database in memory instead of the browser's
 * IndexedDB, for scopes where `isInMemoryScope` holds (the embed).
 *
 * Each call returns a new `fake-indexeddb` factory, so databases opened through
 * it are visible to this document only and vanish with it. Two embeds on one
 * host page share the host's partitioned IndexedDB, but not this.
 *
 * `addons: []` keeps dexie-observable off: it writes a `localStorage` key per
 * database and polls every 500 ms, all for cross-tab sync, which the embed does
 * not run.
 *
 * Loaded with a dynamic import so `fake-indexeddb` ships only to the embed.
 */
export const loadInMemoryBackend = async (): Promise<DexieOptions> => {
  const { IDBFactory, IDBKeyRange } = await import('fake-indexeddb')
  return {
    indexedDB: new IDBFactory(),
    IDBKeyRange,
    addons: [],
  }
}
