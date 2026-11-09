// @vitest-environment node
import 'fake-indexeddb/auto'

import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'

import { loadInMemoryBackend } from './inMemoryBackend'

describe('loadInMemoryBackend', () => {
  it('keeps the database out of the global IndexedDB', async () => {
    const options = await loadInMemoryBackend()
    const db = new Dexie('in-memory-probe', options)
    db.version(1).stores({ rows: 'id' })
    await db.table('rows').put({ id: 'a' })

    const globalNames = (await indexedDB.databases()).map((d) => d.name)
    expect(globalNames).not.toContain('in-memory-probe')
    expect(await db.table('rows').get('a')).toEqual({ id: 'a' })
    db.close()
  })

  it('gives each call its own store', async () => {
    const first = new Dexie('shared-name', await loadInMemoryBackend())
    first.version(1).stores({ rows: 'id' })
    await first.table('rows').put({ id: 'a' })

    const second = new Dexie('shared-name', await loadInMemoryBackend())
    second.version(1).stores({ rows: 'id' })
    expect(await second.table('rows').count()).toBe(0)

    first.close()
    second.close()
  })
})
