import type { Core } from 'cytoscape'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ResolvedNodeGraphics } from '../../../models/StoreModel/NodeGraphicsStoreModel'
import { applyNodeGraphics, resetNodeGraphics } from './nodeGraphicsApply'

const graphics = (
  image: string,
  overrides: Partial<ResolvedNodeGraphics> = {},
): ResolvedNodeGraphics => ({
  image,
  fit: 'contain',
  opacity: 1,
  crossOrigin: 'null',
  containment: 'inside',
  hookId: 'hook-1',
  ...overrides,
})

/**
 * Stub cy exposing one fake node per id in `nodeIds`. Ids outside that set
 * return an empty collection, mimicking a node deleted between the hook running
 * and this apply.
 */
const stubCy = (nodeIds: string[] = ['n1', 'n2', 'n3']) => {
  const nodes = new Map<
    string,
    {
      style: ReturnType<typeof vi.fn>
      removeStyle: ReturnType<typeof vi.fn>
      empty: () => boolean
      width: () => number
      height: () => number
    }
  >()
  for (const id of nodeIds) {
    nodes.set(id, {
      style: vi.fn(),
      removeStyle: vi.fn(),
      empty: () => false,
      width: () => 40,
      height: () => 40,
    })
  }
  const missing = {
    style: vi.fn(),
    removeStyle: vi.fn(),
    empty: () => true,
    width: () => 0,
    height: () => 0,
  }

  const startBatch = vi.fn()
  const endBatch = vi.fn()
  const cy = {
    startBatch,
    endBatch,
    getElementById: (id: string) => nodes.get(id) ?? missing,
  } as unknown as Core

  return { cy, nodes, missing, startBatch, endBatch }
}

describe('applyNodeGraphics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets every background property on the target node', () => {
    const { cy, nodes } = stubCy()

    applyNodeGraphics(cy, { n1: graphics('https://example.com/a.png') })

    expect(nodes.get('n1')!.style).toHaveBeenCalledWith({
      'background-image': 'https://example.com/a.png',
      'background-fit': 'contain',
      'background-image-opacity': 1,
      'background-image-crossorigin': 'null',
      'background-image-containment': 'inside',
    })
  })

  it('never touches a node absent from both the previous and next overlay', () => {
    // The load-bearing guarantee: Vizmapper-styled nodes must be left alone.
    const { cy, nodes } = stubCy()

    applyNodeGraphics(cy, { n1: graphics('https://example.com/a.png') })

    expect(nodes.get('n2')!.style).not.toHaveBeenCalled()
    expect(nodes.get('n2')!.removeStyle).not.toHaveBeenCalled()
    expect(nodes.get('n3')!.style).not.toHaveBeenCalled()
    expect(nodes.get('n3')!.removeStyle).not.toHaveBeenCalled()
  })

  it('does nothing at all when both overlays are empty', () => {
    const { cy, startBatch } = stubCy()

    applyNodeGraphics(cy, {})

    expect(startBatch).not.toHaveBeenCalled()
  })

  it('skips a node whose image is reference-identical to the last apply', () => {
    const { cy, nodes } = stubCy()
    const same = graphics('https://example.com/a.png')

    applyNodeGraphics(cy, { n1: same })
    expect(nodes.get('n1')!.style).toHaveBeenCalledTimes(1)

    applyNodeGraphics(cy, { n1: same })
    expect(nodes.get('n1')!.style).toHaveBeenCalledTimes(1)

    resetNodeGraphics(cy)
  })

  it('reapplies when the image object changes', () => {
    const { cy, nodes } = stubCy()

    applyNodeGraphics(cy, { n1: graphics('https://example.com/a.png') })
    applyNodeGraphics(cy, { n1: graphics('https://example.com/b.png') })

    expect(nodes.get('n1')!.style).toHaveBeenCalledTimes(2)
    resetNodeGraphics(cy)
  })

  it('removes the bypass for a node dropped from the overlay', () => {
    const { cy, nodes } = stubCy()

    applyNodeGraphics(cy, { n1: graphics('https://example.com/a.png') })
    applyNodeGraphics(cy, {})

    expect(nodes.get('n1')!.removeStyle).toHaveBeenCalledTimes(1)
    // Every property this module sets must be named, or clearing leaves a
    // partial bypass behind.
    const propList = nodes.get('n1')!.removeStyle.mock.calls[0][0] as string
    for (const prop of [
      'background-image',
      'background-fit',
      'background-image-opacity',
      'background-image-crossorigin',
      'background-image-containment',
    ]) {
      expect(propList).toContain(prop)
    }
    resetNodeGraphics(cy)
  })

  it('does not call removeStyle for a node that never had an image', () => {
    const { cy, nodes } = stubCy()

    applyNodeGraphics(cy, { n1: graphics('https://example.com/a.png') })
    applyNodeGraphics(cy, { n2: graphics('https://example.com/b.png') })

    expect(nodes.get('n1')!.removeStyle).toHaveBeenCalledTimes(1)
    expect(nodes.get('n3')!.removeStyle).not.toHaveBeenCalled()
    resetNodeGraphics(cy)
  })

  it('skips an id with no matching element', () => {
    const { cy, missing } = stubCy(['n1'])

    expect(() =>
      applyNodeGraphics(cy, { gone: graphics('https://example.com/a.png') }),
    ).not.toThrow()
    expect(missing.style).not.toHaveBeenCalled()
    resetNodeGraphics(cy)
  })

  it('batches the whole pass', () => {
    const { cy, startBatch, endBatch } = stubCy()

    applyNodeGraphics(cy, {
      n1: graphics('https://example.com/a.png'),
      n2: graphics('https://example.com/b.png'),
    })

    expect(startBatch).toHaveBeenCalledTimes(1)
    expect(endBatch).toHaveBeenCalledTimes(1)
    resetNodeGraphics(cy)
  })

  it('ends the batch even when a style write throws', () => {
    const { cy, nodes, endBatch } = stubCy()
    nodes.get('n1')!.style.mockImplementation(() => {
      throw new Error('bad value')
    })

    expect(() =>
      applyNodeGraphics(cy, { n1: graphics('https://example.com/a.png') }),
    ).not.toThrow()
    expect(endBatch).toHaveBeenCalledTimes(1)
    resetNodeGraphics(cy)
  })

  it('keeps applying later nodes after one node throws', () => {
    // The guard is per node, so one malformed value costs one image — not every
    // image queued behind it in the same pass.
    const { cy, nodes } = stubCy()
    nodes.get('n1')!.style.mockImplementation(() => {
      throw new Error('bad value')
    })

    applyNodeGraphics(cy, {
      n1: graphics('https://example.com/a.png'),
      n2: graphics('https://example.com/b.png'),
      n3: graphics('https://example.com/c.png'),
    })

    expect(nodes.get('n2')!.style).toHaveBeenCalledTimes(1)
    expect(nodes.get('n3')!.style).toHaveBeenCalledTimes(1)
    resetNodeGraphics(cy)
  })

  it('keeps clearing later nodes after one removeStyle throws', () => {
    const { cy, nodes } = stubCy()
    applyNodeGraphics(cy, {
      n1: graphics('https://example.com/a.png'),
      n2: graphics('https://example.com/b.png'),
    })
    nodes.get('n1')!.removeStyle.mockImplementation(() => {
      throw new Error('cannot remove')
    })

    applyNodeGraphics(cy, {})

    expect(nodes.get('n2')!.removeStyle).toHaveBeenCalledTimes(1)
    resetNodeGraphics(cy)
  })

  describe('SVG sizing', () => {
    it('wraps an SVG data URI to the node box', () => {
      const { cy, nodes } = stubCy()
      const svg = 'data:image/svg+xml,' + encodeURIComponent('<svg/>')

      applyNodeGraphics(cy, { n1: graphics(svg) })

      const applied = nodes.get('n1')!.style.mock.calls[0][0][
        'background-image'
      ] as string
      const decoded = decodeURIComponent(
        applied.substring('data:image/svg+xml,'.length),
      )
      expect(decoded).toContain('viewBox="0 0 40 40"')
      resetNodeGraphics(cy)
    })

    it('leaves a raster URL unwrapped', () => {
      const { cy, nodes } = stubCy()

      applyNodeGraphics(cy, { n1: graphics('https://example.com/a.png') })

      expect(nodes.get('n1')!.style.mock.calls[0][0]['background-image']).toBe(
        'https://example.com/a.png',
      )
      resetNodeGraphics(cy)
    })

    it('rewraps the same graphics when the node box changes', () => {
      // A stylesheet change resizes nodes without changing hook output. The SVG
      // is wrapped to the node box, so the same graphics must be rewritten.
      const svg = 'data:image/svg+xml,' + encodeURIComponent('<svg/>')
      const same = graphics(svg)
      let size = 40
      const node = {
        style: vi.fn(),
        removeStyle: vi.fn(),
        empty: () => false,
        width: () => size,
        height: () => size,
      }
      const cy = {
        startBatch: vi.fn(),
        endBatch: vi.fn(),
        getElementById: () => node,
      } as unknown as Core

      applyNodeGraphics(cy, { n1: same })
      size = 80
      applyNodeGraphics(cy, { n1: same })

      expect(node.style).toHaveBeenCalledTimes(2)
      const second = node.style.mock.calls[1][0]['background-image'] as string
      expect(
        decodeURIComponent(second.substring('data:image/svg+xml,'.length)),
      ).toContain('viewBox="0 0 80 80"')
      resetNodeGraphics(cy)
    })

    it('applies the requested fit to the wrapped SVG', () => {
      // Cytoscape's background-fit cannot act on an image already sized to the
      // node, so cover has to be baked into the wrapper.
      const { cy, nodes } = stubCy()
      const svg =
        'data:image/svg+xml,' +
        encodeURIComponent('<svg viewBox="0 0 200 50"/>')

      applyNodeGraphics(cy, { n1: graphics(svg, { fit: 'cover' }) })

      const applied = nodes.get('n1')!.style.mock.calls[0][0][
        'background-image'
      ] as string
      expect(
        decodeURIComponent(applied.substring('data:image/svg+xml,'.length)),
      ).toContain('preserveAspectRatio="xMidYMid slice"')
      resetNodeGraphics(cy)
    })

    it('does not wrap when the node reports a zero size', () => {
      // Happens if this is called before cy.style() installs the stylesheet.
      const svg = 'data:image/svg+xml,' + encodeURIComponent('<svg/>')
      const nodes = new Map()
      const node = {
        style: vi.fn(),
        removeStyle: vi.fn(),
        empty: () => false,
        width: () => 0,
        height: () => 0,
      }
      nodes.set('n1', node)
      const cy = {
        startBatch: vi.fn(),
        endBatch: vi.fn(),
        getElementById: (id: string) => nodes.get(id),
      } as unknown as Core

      applyNodeGraphics(cy, { n1: graphics(svg) })

      expect(node.style.mock.calls[0][0]['background-image']).toBe(svg)
      resetNodeGraphics(cy)
    })
  })

  describe('image cache cap', () => {
    it('refuses a new URL past the cap and still admits a cached one', () => {
      // Counted here, on the URL Cytoscape actually caches: SVG wrapping turns
      // one hook image into a distinct URL per node size, so counting hook
      // images instead would let the cache grow without bound.
      const { cy, nodes } = stubCy(['n1'])
      const node = nodes.get('n1')!

      for (let i = 0; i < 2000; i++) {
        applyNodeGraphics(cy, { n1: graphics(`https://example.com/${i}.png`) })
      }
      expect(node.style).toHaveBeenCalledTimes(2000)

      applyNodeGraphics(cy, { n1: graphics('https://example.com/new.png') })
      expect(node.style).toHaveBeenCalledTimes(2000)

      // Already cached, so it costs no new Image and still goes through.
      applyNodeGraphics(cy, { n1: graphics('https://example.com/0.png') })
      expect(node.style).toHaveBeenCalledTimes(2001)
      resetNodeGraphics(cy)
    })
  })

  describe('resetNodeGraphics', () => {
    it('forces the next apply to repaint rather than diff', () => {
      const { cy, nodes } = stubCy()
      const same = graphics('https://example.com/a.png')

      applyNodeGraphics(cy, { n1: same })
      resetNodeGraphics(cy)
      applyNodeGraphics(cy, { n1: same })

      // Without the reset, the second call would be skipped as unchanged — and
      // after cy.remove('*') that would leave the node with no image.
      expect(nodes.get('n1')!.style).toHaveBeenCalledTimes(2)
      resetNodeGraphics(cy)
    })

    it('does not remove bypasses from nodes it forgets about', () => {
      const { cy, nodes } = stubCy()

      applyNodeGraphics(cy, { n1: graphics('https://example.com/a.png') })
      resetNodeGraphics(cy)
      applyNodeGraphics(cy, {})

      expect(nodes.get('n1')!.removeStyle).not.toHaveBeenCalled()
    })

    it('keeps instances independent', () => {
      const first = stubCy()
      const second = stubCy()
      const same = graphics('https://example.com/a.png')

      applyNodeGraphics(first.cy, { n1: same })
      applyNodeGraphics(second.cy, { n1: same })

      expect(first.nodes.get('n1')!.style).toHaveBeenCalledTimes(1)
      expect(second.nodes.get('n1')!.style).toHaveBeenCalledTimes(1)
      resetNodeGraphics(first.cy)
      resetNodeGraphics(second.cy)
    })
  })
})
