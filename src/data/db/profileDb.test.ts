// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import { logDb } from '../../debug'
import {
  closeProfileDb,
  deleteProfileDb,
  deleteProfileSetting,
  getProfileSetting,
  PROFILE_DB_NAME,
  ProfileStoreNames,
  putProfileSetting,
} from './profileDb'

/** The object stores of a database, read without Dexie. */
const objectStoresOf = async (name: string): Promise<string[]> =>
  await new Promise<string[]>((resolve, reject) => {
    const request = indexedDB.open(name)
    request.onsuccess = () => {
      const stores = Array.from(request.result.objectStoreNames)
      request.result.close()
      resolve(stores)
    }
    request.onerror = () => reject(request.error)
  })

afterEach(async () => {
  vi.restoreAllMocks()
  await deleteProfileDb()
})

describe('profile database', () => {
  it('is the browser-level database, not the workspace one', () => {
    expect(PROFILE_DB_NAME).toBe('cyweb-profile-db')
  })

  it('returns undefined for a setting that was never saved', async () => {
    expect(await getProfileSetting('missing')).toBeUndefined()
  })

  it('reads back what was saved', async () => {
    await putProfileSetting('llmQueryOptions', { provider: 'ollama' })

    expect(await getProfileSetting('llmQueryOptions')).toEqual({
      provider: 'ollama',
    })
  })

  it('replaces a setting saved under the same key', async () => {
    await putProfileSetting('k', 'first')
    await putProfileSetting('k', 'second')

    expect(await getProfileSetting('k')).toBe('second')
  })

  it('deletes one setting and leaves the others', async () => {
    await putProfileSetting('a', 1)
    await putProfileSetting('b', 2)

    await deleteProfileSetting('a')

    expect(await getProfileSetting('a')).toBeUndefined()
    expect(await getProfileSetting('b')).toBe(2)
  })

  it('survives a close: the next call reopens it', async () => {
    await putProfileSetting('k', 'kept')

    closeProfileDb()

    expect(await getProfileSetting('k')).toBe('kept')
  })

  it('holds the settings store and nothing else', async () => {
    await putProfileSetting('k', 'v')
    closeProfileDb()

    expect(await objectStoresOf(PROFILE_DB_NAME)).toEqual([
      ProfileStoreNames.Settings,
    ])
  })

  it('treats a prototype-polluting key as an ordinary key', async () => {
    await putProfileSetting('__proto__', { polluted: true })

    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(await getProfileSetting('__proto__')).toEqual({ polluted: true })
    expect(await getProfileSetting('other')).toBeUndefined()
  })

  it('reports an unreadable database as a missing setting', async () => {
    await putProfileSetting('k', 'v')
    closeProfileDb()
    const warn = vi.spyOn(logDb, 'warn').mockImplementation(() => {})
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('IndexedDB is not available')
    })

    expect(await getProfileSetting('k')).toBeUndefined()
    expect(warn).toHaveBeenCalled()
  })

  it('rejects a write the database cannot take', async () => {
    closeProfileDb()
    vi.spyOn(logDb, 'error').mockImplementation(() => {})
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('IndexedDB is not available')
    })

    await expect(putProfileSetting('k', 'v')).rejects.toThrow()
  })
})
