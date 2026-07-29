import { describe, expect, it } from 'vitest'

import { ensureTrailingSlash } from './baseUrl'

describe('ensureTrailingSlash', () => {
  it('appends a slash when missing', () => {
    expect(ensureTrailingSlash('/cytoscape')).toBe('/cytoscape/')
  })

  it('leaves an existing trailing slash alone', () => {
    expect(ensureTrailingSlash('/cytoscape/')).toBe('/cytoscape/')
  })

  it('turns the empty base into the root path', () => {
    expect(ensureTrailingSlash('')).toBe('/')
  })

  it('leaves the bare root path alone', () => {
    expect(ensureTrailingSlash('/')).toBe('/')
  })
})
