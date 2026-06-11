import { EXTERNAL_APPS_ENABLED } from '../../../app-api/constants'
import { fetchManifest } from './fetchManifest'
import { obtainCatalogEntries } from './obtainCatalogEntries'

vi.mock('./fetchManifest', () => ({
  fetchManifest: vi.fn(),
}))

const mockFetchManifest = fetchManifest as import('vitest').MockedFunction<
  typeof fetchManifest
>

describe('obtainCatalogEntries', () => {
  beforeEach(() => {
    mockFetchManifest.mockReset()
  })

  it('returns an empty catalog without fetching when external apps are disabled', async () => {
    expect(EXTERNAL_APPS_ENABLED).toBe(false)

    const result = await obtainCatalogEntries(undefined)

    expect(result).toEqual([])
    expect(mockFetchManifest).not.toHaveBeenCalled()
  })
})