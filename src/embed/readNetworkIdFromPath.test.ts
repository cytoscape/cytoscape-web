// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { readNetworkIdFromPath } from './readNetworkIdFromPath'

describe('readNetworkIdFromPath', () => {
  it('reads the UUID after embed/', () => {
    expect(readNetworkIdFromPath('/embed/abc-123')).toBe('abc-123')
  })

  it('accepts a trailing slash and a base path', () => {
    expect(readNetworkIdFromPath('/cytoscape/embed/abc-123/')).toBe('abc-123')
  })

  it('returns undefined without a UUID', () => {
    expect(readNetworkIdFromPath('/embed/')).toBeUndefined()
    expect(readNetworkIdFromPath('/embed.html')).toBeUndefined()
  })
})
