import { describe, expect, it } from 'vitest'

import { clearSandboxDb, DB_NAME, getDb, initializeDb } from './index'

// The editor scope: the address bar is `/`, so DB_NAME is cyweb-db. Clearing
// here would destroy the user's workspace, so it must refuse.
describe('clearSandboxDb in the editor scope', () => {
  it('refuses and leaves every row in place', async () => {
    expect(DB_NAME).toBe('cyweb-db')
    await initializeDb()
    const db = await getDb()
    await db.table('summaries').put({ externalId: 'keep-me', name: 'kept' })

    expect(await clearSandboxDb()).toBe(false)
    expect(await db.table('summaries').get('keep-me')).toBeDefined()

    await db.table('summaries').delete('keep-me')
  })
})
