import { describe, expect, it } from 'vitest'

import { buildShareUrl, normalizeBaseName } from './shareUrl'

describe('normalizeBaseName', () => {
  it('treats empty / root as no base segment', () => {
    expect(normalizeBaseName(undefined)).toBe('')
    expect(normalizeBaseName('')).toBe('')
    expect(normalizeBaseName('/')).toBe('')
  })

  it('strips trailing slashes and ensures a single leading slash', () => {
    expect(normalizeBaseName('/cytoscape/')).toBe('/cytoscape')
    expect(normalizeBaseName('/cytoscape')).toBe('/cytoscape')
    expect(normalizeBaseName('cytoscape')).toBe('/cytoscape')
  })
})

describe('buildShareUrl (CW-514)', () => {
  const origin = 'https://web-stage.cytoscape.org'
  const netId = '27bb3a76-e0b7-11ea-99da-0ac135e8bacf'

  it('builds a well-formed absolute URL with no base path', () => {
    expect(buildShareUrl(origin, '/', netId, 'left=open&right=closed')).toBe(
      `https://web-stage.cytoscape.org/0/networks/${netId}?left=open&right=closed`,
    )
  })

  it('includes a normalized base path', () => {
    expect(buildShareUrl(origin, '/cytoscape/', netId, '')).toBe(
      `https://web-stage.cytoscape.org/cytoscape/0/networks/${netId}`,
    )
  })

  it('omits the query separator when there is no query', () => {
    expect(buildShareUrl(origin, '/', netId, '')).toBe(
      `https://web-stage.cytoscape.org/0/networks/${netId}`,
    )
  })

  it('never emits a link without a scheme, even with odd base names', () => {
    // The reported symptom was a scheme-mangled link (e.g. "h0/networks/...").
    const url = buildShareUrl(origin, 'cytoscape', netId, 'a=b')
    expect(url.startsWith('https://')).toBe(true)
  })

  it('keeps a networkId containing slashes as one segment', () => {
    // Slash-collapse runs over the base path, so an unencoded 'a//b' would come
    // back as 'a/b' — a different id, in a link the user then shares.
    expect(buildShareUrl(origin, '/', 'a//b/c', '')).toBe(
      'https://web-stage.cytoscape.org/0/networks/a%2F%2Fb%2Fc',
    )
  })

  it('throws on a malformed origin so the caller can report instead of copying garbage', () => {
    expect(() => buildShareUrl('not-a-url', '/', netId, '')).toThrow()
  })
})
