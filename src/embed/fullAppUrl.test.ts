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
})
