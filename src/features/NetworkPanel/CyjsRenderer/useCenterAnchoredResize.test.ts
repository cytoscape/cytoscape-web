import { renderHook } from '@testing-library/react'
import type { Core } from 'cytoscape'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCenterAnchoredResize } from './useCenterAnchoredResize'

// ── ResizeObserver stub ───────────────────────────────────────────────────────
// jsdom has no ResizeObserver; this one records its instances so a test can
// notify the observed element of a size change.

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  readonly observed: Element[] = []
  disconnected = false

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this)
  }

  observe(target: Element): void {
    this.observed.push(target)
  }

  unobserve(): void {}

  disconnect(): void {
    this.disconnected = true
  }

  notify(): void {
    this.callback([], this as unknown as ResizeObserver)
  }
}

const latestObserver = (): FakeResizeObserver => {
  const observer = FakeResizeObserver.instances.at(-1)
  if (observer === undefined) throw new Error('No ResizeObserver created')
  return observer
}

// ── Cytoscape.js stand-in ─────────────────────────────────────────────────────
// Like the real instance, it caches the container size: width()/height()
// report the size as of the last resize(), not the container's current size.
// The pan is always relative to that cached size.

interface Size {
  width: number
  height: number
}

const createCy = (cached: Size, options: { destroyed?: boolean } = {}) => {
  const container: Size = { ...cached }
  const size: Size = { ...cached }
  const render = vi.fn()
  // Cytoscape.js's own resize: refreshes the cached size, never pans. The hook
  // replaces `resize` on the instance, so tests assert on this one.
  const nativeResize = vi.fn(() => {
    size.width = container.width
    size.height = container.height
  })
  return {
    container,
    width: vi.fn(() => size.width),
    height: vi.fn(() => size.height),
    resize: nativeResize as () => void,
    nativeResize,
    panBy: vi.fn(),
    destroyed: vi.fn(() => options.destroyed === true),
    renderer: vi.fn(() => ({ render })),
    render,
  }
}

type FakeCy = ReturnType<typeof createCy>

const renderWith = (cy: object | null) => {
  const element = document.createElement('div')
  const containerRef = { current: element }
  const result = renderHook(
    ({ instance }) =>
      useCenterAnchoredResize(instance as unknown as Core | null, containerRef),
    { initialProps: { instance: cy } },
  )
  return { ...result, element }
}

/** Change the container's size and deliver the observer notification. */
const resizeTo = (
  cy: Pick<FakeCy, 'container'>,
  width: number,
  height: number,
): void => {
  cy.container.width = width
  cy.container.height = height
  latestObserver().notify()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCenterAnchoredResize', () => {
  beforeEach(() => {
    FakeResizeObserver.instances = []
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('observes the container once the cy instance exists', () => {
    const { element } = renderWith(createCy({ width: 800, height: 600 }))

    expect(latestObserver().observed).toEqual([element])
  })

  it('does nothing before the cy instance exists', () => {
    renderWith(null)

    expect(FakeResizeObserver.instances).toHaveLength(0)
  })

  it('does not pan when the size matches the one cy already has', () => {
    const cy = createCy({ width: 800, height: 600 })
    renderWith(cy)

    latestObserver().notify()

    expect(cy.panBy).not.toHaveBeenCalled()
    expect(cy.render).not.toHaveBeenCalled()
  })

  it('pans by half the width lost when a side panel grows', () => {
    const cy = createCy({ width: 800, height: 600 })
    renderWith(cy)

    resizeTo(cy, 600, 600)

    expect(cy.panBy).toHaveBeenCalledWith({ x: -100, y: 0 })
    // The size must be updated before panning, or the pan is applied against
    // the stale canvas size.
    expect(cy.nativeResize.mock.invocationCallOrder[0]).toBeLessThan(
      cy.panBy.mock.invocationCallOrder[0],
    )
  })

  it('pans by half the height gained when the bottom panel shrinks', () => {
    const cy = createCy({ width: 800, height: 400 })
    renderWith(cy)

    resizeTo(cy, 800, 500)

    expect(cy.panBy).toHaveBeenCalledWith({ x: 0, y: 50 })
  })

  // Regression: a network switch that also opens or closes the right panel
  // (a hierarchy network does both). The new cy instance cached its size — and
  // the saved viewport was restored against it — before the panel moved, so the
  // container had already changed by the observer's first notification. Taking
  // that first notification as the baseline lost the change entirely.
  it('pans for a change that happened before the first notification', () => {
    const cy = createCy({ width: 250, height: 533 })
    cy.container.width = 574
    cy.container.height = 536
    renderWith(cy)

    latestObserver().notify()

    expect(cy.panBy).toHaveBeenCalledWith({ x: 162, y: 1.5 })
  })

  // Regression: Cytoscape.js resizes itself too — its own debounced
  // ResizeObserver, window `resize` and container-style MutationObserver all
  // call cy.resize(). When one of those ran before this hook's observer (a
  // style change on the container right after a network switch), it refreshed
  // the cached size WITHOUT panning, the hook then saw no change, and the view
  // drifted by half the difference on every visit to a hierarchy network.
  it('keeps the center when Cytoscape.js resizes itself', () => {
    const cy = createCy({ width: 800, height: 600 })
    renderWith(cy)
    cy.container.width = 600

    cy.resize()
    latestObserver().notify()

    expect(cy.panBy.mock.calls).toEqual([[{ x: -100, y: 0 }]])
  })

  it('keeps the center without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const cy = createCy({ width: 800, height: 600 })
    renderWith(cy)
    cy.container.width = 600

    cy.resize()

    expect(cy.panBy).toHaveBeenCalledWith({ x: -100, y: 0 })
  })

  it('restores the native resize on unmount', () => {
    const cy = createCy({ width: 800, height: 600 })
    const { unmount } = renderWith(cy)
    expect(cy.resize).not.toBe(cy.nativeResize)

    unmount()

    expect(cy.resize).toBe(cy.nativeResize)
  })

  it('draws synchronously after resizing and panning', () => {
    const cy = createCy({ width: 800, height: 600 })
    renderWith(cy)

    resizeTo(cy, 600, 600)

    // cy.resize() clears the canvases; without a draw in the same callback the
    // browser paints them blank (flicker) until the next animation frame.
    expect(cy.render).toHaveBeenCalledTimes(1)
    expect(cy.panBy.mock.invocationCallOrder[0]).toBeLessThan(
      cy.render.mock.invocationCallOrder[0],
    )
  })

  it('still pans when the instance has no renderer', () => {
    const cy = {
      ...createCy({ width: 800, height: 600 }),
      renderer: vi.fn(() => undefined),
    }
    renderWith(cy)

    expect(() => resizeTo(cy, 600, 600)).not.toThrow()

    expect(cy.panBy).toHaveBeenCalledWith({ x: -100, y: 0 })
  })

  it('accumulates relative to the previous size across a drag', () => {
    const cy = createCy({ width: 800, height: 600 })
    renderWith(cy)

    resizeTo(cy, 790, 600)
    resizeTo(cy, 760, 590)

    expect(cy.panBy.mock.calls).toEqual([
      [{ x: -5, y: 0 }],
      [{ x: -15, y: -5 }],
    ])
  })

  it('does not pan when a hidden container comes back at the same size', () => {
    const cy = createCy({ width: 800, height: 600 })
    renderWith(cy)

    resizeTo(cy, 0, 0)
    resizeTo(cy, 800, 600)

    expect(cy.panBy).not.toHaveBeenCalled()
  })

  it('measures from the last visible size when cy was resized while hidden', () => {
    const cy = createCy({ width: 800, height: 600 })
    renderWith(cy)

    // Hidden: cy now caches 0 x 0, which is no baseline for the next change.
    resizeTo(cy, 0, 0)
    resizeTo(cy, 700, 600)

    expect(cy.panBy.mock.calls).toEqual([[{ x: -50, y: 0 }]])
  })

  it('does not touch a destroyed cy instance', () => {
    const cy = createCy({ width: 800, height: 600 }, { destroyed: true })
    renderWith(cy)

    resizeTo(cy, 600, 600)

    expect(cy.nativeResize).not.toHaveBeenCalled()
    expect(cy.panBy).not.toHaveBeenCalled()
  })

  it('disconnects on unmount', () => {
    const { unmount } = renderWith(createCy({ width: 800, height: 600 }))
    const observer = latestObserver()

    unmount()

    expect(observer.disconnected).toBe(true)
  })

  it('observes again for a new cy instance, measured from its own size', () => {
    const first = createCy({ width: 800, height: 600 })
    const second = createCy({ width: 600, height: 600 })
    const { rerender } = renderWith(first)
    const firstObserver = latestObserver()

    rerender({ instance: second })
    const secondObserver = latestObserver()
    secondObserver.notify()

    expect(firstObserver.disconnected).toBe(true)
    expect(secondObserver).not.toBe(firstObserver)
    expect(second.panBy).not.toHaveBeenCalled()
  })

  it('is a no-op where ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined)

    expect(() =>
      renderWith(createCy({ width: 800, height: 600 })),
    ).not.toThrow()
  })
})
