// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchManifest } from './fetchManifest'

describe('fetchManifest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // apps.json is served without Cache-Control, so a browser may reuse a copy
  // heuristically; a reload does not refetch fetch() requests. After a
  // deployment ships a fixed version of a broken core app, the old catalog
  // would load the broken one again.
  it('asks the server every time instead of trusting a cached copy', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [],
    }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchManifest('/cytoscape/apps.json')

    expect(fetchMock).toHaveBeenCalledWith('/cytoscape/apps.json', {
      cache: 'no-cache',
    })
  })
})
