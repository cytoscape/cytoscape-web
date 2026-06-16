import {
  DEFAULT_MANIFEST_URL,
  EXTERNAL_APPS_ENABLED,
} from '../../../app-api/constants'
import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
import { fetchManifest } from './fetchManifest'
import { obtainCatalogEntries } from './obtainCatalogEntries'
import { parseManifest } from './parseManifest'

vi.mock('./fetchManifest', () => ({
  fetchManifest: vi.fn(),
}))
jest.mock('./parseManifest', () => ({
  parseManifest: jest.fn(),
}))

const mockFetchManifest = fetchManifest as import('vitest').MockedFunction<
  typeof fetchManifest
>
const mockParseManifest = parseManifest as jest.MockedFunction<
  typeof parseManifest
>

const entry: AppCatalogEntry = {
  id: 'myApp',
  url: 'http://localhost:2222/remoteEntry.js',
  author: 'Dev',
}

describe('obtainCatalogEntries', () => {
  beforeEach(() => {
    mockFetchManifest.mockReset()
    mockParseManifest.mockReset()
  })

  it('external app loading is enabled', () => {
    expect(EXTERNAL_APPS_ENABLED).toBe(true)
  })

  it('fetches from the default manifest URL when source is undefined', async () => {
    mockFetchManifest.mockResolvedValue([entry])

    const result = await obtainCatalogEntries(undefined)

    expect(mockFetchManifest).toHaveBeenCalledWith(DEFAULT_MANIFEST_URL)
    expect(result).toEqual([entry])
  })

  it('fetches from the provided URL for a url source', async () => {
    mockFetchManifest.mockResolvedValue([entry])

    const result = await obtainCatalogEntries({
      type: 'url',
      url: 'https://example.org/catalog.json',
    })

    expect(mockFetchManifest).toHaveBeenCalledWith(
      'https://example.org/catalog.json',
    )
    expect(result).toEqual([entry])
  })

  it('parses inline content for an inline source', async () => {
    mockParseManifest.mockReturnValue([entry])

    const result = await obtainCatalogEntries({
      type: 'inline',
      content: JSON.stringify([entry]),
    })

    expect(mockParseManifest).toHaveBeenCalledWith([entry])
    expect(mockFetchManifest).not.toHaveBeenCalled()
    expect(result).toEqual([entry])
  })

  it('returns an empty catalog when inline content is invalid JSON', async () => {
    const result = await obtainCatalogEntries({
      type: 'inline',
      content: 'not-json',
    })

    expect(result).toEqual([])
    expect(mockParseManifest).not.toHaveBeenCalled()
    expect(mockFetchManifest).not.toHaveBeenCalled()
  })
})
