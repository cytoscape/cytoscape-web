import { render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  closeProfileDb,
  deleteProfileDb,
  PROFILE_DB_NAME,
  putProfileSetting,
} from '@/data/db/profileDb'
import { LLM_API_KEYS_SESSION_KEY } from '@/features/LLMQuery/store/storageKeys'

import { BrowserStorageView } from './BrowserStorageView'

const databaseNames = async (): Promise<Array<string | undefined>> =>
  (await indexedDB.databases()).map((info) => info.name)

beforeEach(async () => {
  window.sessionStorage.clear()
  await deleteProfileDb()
})

afterEach(async () => {
  vi.restoreAllMocks()
  await deleteProfileDb()
})

describe('BrowserStorageView', () => {
  it('counts what the profile database holds', async () => {
    await putProfileSetting('llmQueryOptions', {
      provider: 'custom',
      baseUrl: 'https://llm.example.org/v1',
      model: 'my-model',
    })
    closeProfileDb()

    render(<BrowserStorageView />)

    const table = await screen.findByTestId('manual-browser-storage-profile-db')
    expect(within(table).getByText(/cyweb-profile-db/)).toBeTruthy()
    const row = within(table).getByText(
      'LLM Query provider, endpoint and model',
    ).parentElement
    expect(row?.textContent).toContain('1')
    // Counts only: what is stored is never put on the page
    expect(document.body.innerHTML).not.toContain('llm.example.org')
  })

  it('does not create the profile database by looking for it', async () => {
    // The view lists the databases once per database it inspects, and only
    // opens one that is listed. Waiting for both listings to settle is what
    // makes the assertions below mean "after the inspection finished": the
    // session table is on the page from the first render.
    const listDatabases = vi.spyOn(indexedDB, 'databases')
    const openDatabase = vi.spyOn(indexedDB, 'open')

    render(<BrowserStorageView />)

    await waitFor(() => expect(listDatabases).toHaveBeenCalledTimes(2))
    await Promise.all(listDatabases.mock.results.map((call) => call.value))
    // One more turn of the event loop, for an open that would follow
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(openDatabase).not.toHaveBeenCalledWith(PROFILE_DB_NAME)
    expect(screen.queryByTestId('manual-browser-storage-profile-db')).toBeNull()
    expect(await databaseNames()).not.toContain(PROFILE_DB_NAME)
  })

  it('says an API key is kept for one tab, and never shows it', () => {
    window.sessionStorage.setItem(
      LLM_API_KEYS_SESSION_KEY,
      JSON.stringify({ openAiKey: 'sk-secret-value', customKey: '' }),
    )

    render(<BrowserStorageView />)

    const table = screen.getByTestId('manual-browser-storage-session')
    expect(within(table).getByText(/until you close it/)).toBeTruthy()
    expect(within(table).getByText(/LLM Query API key/)).toBeTruthy()
    expect(document.body.innerHTML).not.toContain('sk-secret-value')
  })
})
