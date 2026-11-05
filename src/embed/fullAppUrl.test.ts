import { afterEach, describe, expect, it, vi } from 'vitest'

import { fullAppUrl } from './fullAppUrl'

describe('fullAppUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('links to the app on the same deployment by default', () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_EMBED_APP_URL', '')
    expect(fullAppUrl('abc')).toBe(`${window.location.origin}/0/networks/abc`)
  })

  it('links to the app dev server in dev', () => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_EMBED_APP_URL', '')
    expect(fullAppUrl('abc')).toBe('http://localhost:5500/0/networks/abc')
  })

  it('links to VITE_EMBED_APP_URL when set, with or without a trailing slash', () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_EMBED_APP_URL', 'https://web.cytoscape.org')
    expect(fullAppUrl('abc')).toBe('https://web.cytoscape.org/0/networks/abc')
    vi.stubEnv('VITE_EMBED_APP_URL', 'https://example.org/cytoscape/')
    expect(fullAppUrl('a b')).toBe(
      'https://example.org/cytoscape/0/networks/a%20b',
    )
  })

  it('carries a hierarchy selection as the full app deep-link parameters', () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_EMBED_APP_URL', 'https://web.cytoscape.org/')
    const url = new URL(
      fullAppUrl('h1', {
        nodeIds: ['134'],
        subsystemId: '134',
        subnetworkNodeIds: ['482', '483'],
        networkViewTab: 1,
      }),
    )
    expect(url.pathname).toBe('/0/networks/h1')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      selectednodes: '134',
      activeNetworkView: 'h1_134',
      selectedSubnetworkNodes: '482 483',
      activeNetworkViewTab: '1',
    })
  })

  it('adds no parameters for an empty selection', () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_EMBED_APP_URL', 'https://web.cytoscape.org/')
    expect(fullAppUrl('h1', { nodeIds: [], subnetworkNodeIds: ['482'] })).toBe(
      'https://web.cytoscape.org/0/networks/h1',
    )
  })
})
