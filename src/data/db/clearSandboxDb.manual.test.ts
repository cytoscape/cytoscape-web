import { describe, expect, it, vi } from 'vitest'

import { clearSandboxDb, DB_NAME, getDb, initializeDb } from './index'

// Hoisted above the import of ./index, so DB_NAME resolves in the manual
// scope exactly as it does when a tab loads /manual/*.
vi.mock('./dbScope', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./dbScope')>()
  return { ...actual, currentDbScope: () => 'manual' as const }
})

describe('clearSandboxDb in the manual scope', () => {
  it('opens the sandbox database, not the editor one', () => {
    expect(DB_NAME).toBe('cyweb-manual-db')
  })

  it('empties the object stores', async () => {
    await initializeDb()
    const db = await getDb()
    await db.table('summaries').put({ externalId: 'demo', name: 'demo' })
    await db.table('uiState').put({ id: 'uistate' })

    expect(await clearSandboxDb()).toBe(true)
    expect(await db.table('summaries').count()).toBe(0)
    expect(await db.table('uiState').count()).toBe(0)
  })
})
