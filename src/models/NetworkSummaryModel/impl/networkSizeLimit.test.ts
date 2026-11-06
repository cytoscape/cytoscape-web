// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  fitsNetworkSizeLimits,
  type NetworkSizeLimits,
} from './networkSizeLimit'

const LIMITS: NetworkSizeLimits = {
  maxEdgeCountThreshold: 20_000,
  maxNetworkElementsThreshold: 26_000,
  maxNetworkFileSize: 500 * 1024 * 1024,
}
const MB = 1024 * 1024

describe('fitsNetworkSizeLimits', () => {
  it('accepts a network at or under the edge threshold, whatever its size', () => {
    // The rule NDEx loading has always used: few enough edges is enough.
    expect(
      fitsNetworkSizeLimits(
        { nodeCount: 100_000, edgeCount: 20_000, cx2FileSize: 900 * MB },
        LIMITS,
      ),
    ).toBe(true)
  })

  it('accepts more edges only with few enough elements in a small enough file', () => {
    expect(
      fitsNetworkSizeLimits(
        { nodeCount: 5_000, edgeCount: 20_001, cx2FileSize: 10 * MB },
        LIMITS,
      ),
    ).toBe(true)
  })

  it.each([
    ['too many nodes and edges', 6_000, 20_001, 10 * MB],
    ['exactly the element threshold', 5_999, 20_001, 10 * MB],
    ['a file at the size limit', 1_000, 20_001, 500 * MB],
  ])('refuses more edges with %s', (_case, nodeCount, edgeCount, size) => {
    expect(
      fitsNetworkSizeLimits(
        { nodeCount, edgeCount, cx2FileSize: size },
        LIMITS,
      ),
    ).toBe(false)
  })

  it('checks only the file size when the counts are unknown', () => {
    expect(fitsNetworkSizeLimits({ cx2FileSize: 499 * MB }, LIMITS)).toBe(true)
    expect(fitsNetworkSizeLimits({ cx2FileSize: 500 * MB }, LIMITS)).toBe(false)
  })

  it('treats one missing count as unknown, never as zero', () => {
    // Zero would pass the edge threshold and skip the size check entirely.
    expect(
      fitsNetworkSizeLimits({ nodeCount: 10, cx2FileSize: 600 * MB }, LIMITS),
    ).toBe(false)
    expect(
      fitsNetworkSizeLimits({ edgeCount: 10, cx2FileSize: 600 * MB }, LIMITS),
    ).toBe(false)
  })
})
