import { describe, expect, it } from 'vitest'

import { intersects, isGraphVisible } from './viewportRecovery'

/** Minimal cytoscape stand-in exposing only what isGraphVisible reads. */
const fakeCy = (options: {
  elementCount?: number
  boundingBox?: { x1: number; y1: number; x2: number; y2: number }
  extent?: { x1: number; y1: number; x2: number; y2: number }
  throws?: boolean
}): any => ({
  elements: () => ({
    length: options.elementCount ?? 1,
    boundingBox: () => {
      if (options.throws === true) {
        throw new Error('renderer not ready')
      }
      return options.boundingBox
    },
  }),
  extent: () => options.extent,
})

describe('intersects', () => {
  it('detects overlapping rectangles', () => {
    expect(
      intersects(
        { x1: 0, y1: 0, x2: 10, y2: 10 },
        { x1: 5, y1: 5, x2: 15, y2: 15 },
      ),
    ).toBe(true)
  })

  it('rejects disjoint rectangles', () => {
    expect(
      intersects(
        { x1: 0, y1: 0, x2: 10, y2: 10 },
        { x1: 20, y1: 20, x2: 30, y2: 30 },
      ),
    ).toBe(false)
  })

  it('rejects rectangles that only touch at an edge', () => {
    expect(
      intersects(
        { x1: 0, y1: 0, x2: 10, y2: 10 },
        { x1: 10, y1: 0, x2: 20, y2: 10 },
      ),
    ).toBe(false)
  })
})

describe('isGraphVisible', () => {
  it('is true when the graph overlaps the viewport', () => {
    const cy = fakeCy({
      boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
      extent: { x1: 50, y1: 50, x2: 150, y2: 150 },
    })

    expect(isGraphVisible(cy)).toBe(true)
  })

  it('is false when a layout has moved the graph out of frame', () => {
    // This is the one case that justifies overriding a deliberate camera:
    // the user would otherwise be looking at blank canvas.
    const cy = fakeCy({
      boundingBox: { x1: 5000, y1: 5000, x2: 5100, y2: 5100 },
      extent: { x1: 0, y1: 0, x2: 100, y2: 100 },
    })

    expect(isGraphVisible(cy)).toBe(false)
  })

  it('treats a single node inside the viewport as visible', () => {
    // A lone node has a zero-area bounding box, which a strict overlap test
    // would report as invisible and re-fit on every position sync.
    const cy = fakeCy({
      boundingBox: { x1: 50, y1: 50, x2: 50, y2: 50 },
      extent: { x1: 0, y1: 0, x2: 100, y2: 100 },
    })

    expect(isGraphVisible(cy)).toBe(true)
  })

  it('treats an empty graph as visible so nothing re-fits', () => {
    expect(isGraphVisible(fakeCy({ elementCount: 0 }))).toBe(true)
  })

  it('defaults to visible when the renderer reports no geometry', () => {
    const cy = fakeCy({
      boundingBox: { x1: NaN, y1: NaN, x2: NaN, y2: NaN },
      extent: { x1: 0, y1: 0, x2: 100, y2: 100 },
    })

    expect(isGraphVisible(cy)).toBe(true)
  })

  it('defaults to visible when the renderer throws', () => {
    expect(isGraphVisible(fakeCy({ throws: true }))).toBe(true)
  })

  it('defaults to visible when there is no cytoscape instance', () => {
    expect(isGraphVisible(null)).toBe(true)
    expect(isGraphVisible(undefined)).toBe(true)
  })
})
