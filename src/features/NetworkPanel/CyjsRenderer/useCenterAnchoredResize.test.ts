import { renderHook } from '@testing-library/react'
import type { Core } from 'cytoscape'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCenterAnchoredResize } from './useCenterAnchoredResize'

// ── ResizeObserver stub ───────────────────────────────────────────────────────
// jsdom has no ResizeObserver; this one records its instances so a test can
// deliver a size to the observed element.

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

  resize(width: number, height: number): void {
    const entry = { contentRect: { width, height } } as ResizeObserverEntry
    this.callback([entry], this as unknown as ResizeObserver)
  }
}

const latestObserver = (): FakeResizeObserver => {
  const observer = FakeResizeObserver.instances.at(-1)
  if (observer === undefined) throw new Error('No ResizeObserver created')
  return observer
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const createCy = (destroyed = false) => {
  const render = vi.fn()
  return {
    resize: vi.fn(),
    panBy: vi.fn(),
    destroyed: vi.fn(() => destroyed),
    renderer: vi.fn(() => ({ render })),
    render,
  }
}

const renderWith = (cy: object | null) => {
  const container = document.createElement('div')
  const containerRef = { current: container }
  const result = renderHook(
    ({ instance }) =>
      useCenterAnchoredResize(instance as unknown as Core | null, containerRef),
    { initialProps: { instance: cy } },
  )
  return { ...result, container }
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
    const { container } = renderWith(createCy())

    expect(latestObserver().observed).toEqual([container])
  })

  it('does nothing before the cy instance exists', () => {
    renderWith(null)

    expect(FakeResizeObserver.instances).toHaveLength(0)
  })

  it('only records the first measurement', () => {
    const cy = createCy()
    renderWith(cy)

    latestObserver().resize(800, 600)

    expect(cy.resize).not.toHaveBeenCalled()
    expect(cy.panBy).not.toHaveBeenCalled()
  })

  it('pans by half the width lost when a side panel grows', () => {
    const cy = createCy()
    renderWith(cy)
    const observer = latestObserver()

    observer.resize(800, 600)
    observer.resize(600, 600)

    expect(cy.resize).toHaveBeenCalledTimes(1)
    expect(cy.panBy).toHaveBeenCalledWith({ x: -100, y: 0 })
    // The size must be updated before panning, or the pan is applied against
    // the stale canvas size.
    expect(cy.resize.mock.invocationCallOrder[0]).toBeLessThan(
      cy.panBy.mock.invocationCallOrder[0],
    )
  })

  it('draws synchronously after resizing and panning', () => {
    const cy = createCy()
    renderWith(cy)
    const observer = latestObserver()

    observer.resize(800, 600)
    observer.resize(600, 600)

    // cy.resize() clears the canvases; without a draw in the same callback the
    // browser paints them blank (flicker) until the next animation frame.
    expect(cy.render).toHaveBeenCalledTimes(1)
    expect(cy.panBy.mock.invocationCallOrder[0]).toBeLessThan(
      cy.render.mock.invocationCallOrder[0],
    )
  })

  it('still pans when the instance has no renderer', () => {
    const cy = { ...createCy(), renderer: vi.fn(() => undefined) }
    renderWith(cy)
    const observer = latestObserver()

    observer.resize(800, 600)
    expect(() => observer.resize(600, 600)).not.toThrow()

    expect(cy.panBy).toHaveBeenCalledWith({ x: -100, y: 0 })
  })

  it('pans by half the height gained when the bottom panel shrinks', () => {
    const cy = createCy()
    renderWith(cy)
    const observer = latestObserver()

    observer.resize(800, 400)
    observer.resize(800, 500)

    expect(cy.panBy).toHaveBeenCalledWith({ x: 0, y: 50 })
  })

  it('accumulates relative to the previous size across a drag', () => {
    const cy = createCy()
    renderWith(cy)
    const observer = latestObserver()

    observer.resize(800, 600)
    observer.resize(790, 600)
    observer.resize(760, 590)

    expect(cy.panBy.mock.calls).toEqual([
      [{ x: -5, y: 0 }],
      [{ x: -15, y: -5 }],
    ])
  })

  it('ignores a measurement with no size change', () => {
    const cy = createCy()
    renderWith(cy)
    const observer = latestObserver()

    observer.resize(800, 600)
    observer.resize(800, 600)

    expect(cy.resize).not.toHaveBeenCalled()
    expect(cy.panBy).not.toHaveBeenCalled()
    expect(cy.render).not.toHaveBeenCalled()
  })

  it('keeps the last visible size while the container is hidden', () => {
    const cy = createCy()
    renderWith(cy)
    const observer = latestObserver()

    observer.resize(800, 600)
    observer.resize(0, 0)
    observer.resize(800, 600)

    expect(cy.panBy).not.toHaveBeenCalled()
  })

  it('does not touch a destroyed cy instance', () => {
    const cy = createCy(true)
    renderWith(cy)
    const observer = latestObserver()

    observer.resize(800, 600)
    observer.resize(600, 600)

    expect(cy.resize).not.toHaveBeenCalled()
    expect(cy.panBy).not.toHaveBeenCalled()
  })

  it('disconnects on unmount', () => {
    const { unmount } = renderWith(createCy())
    const observer = latestObserver()

    unmount()

    expect(observer.disconnected).toBe(true)
  })

  it('re-observes with a fresh baseline when the cy instance changes', () => {
    const first = createCy()
    const second = createCy()
    const { rerender } = renderWith(first)
    const firstObserver = latestObserver()
    firstObserver.resize(800, 600)

    rerender({ instance: second })
    const secondObserver = latestObserver()
    secondObserver.resize(600, 600)

    expect(firstObserver.disconnected).toBe(true)
    expect(secondObserver).not.toBe(firstObserver)
    expect(second.panBy).not.toHaveBeenCalled()
  })

  it('is a no-op where ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined)

    expect(() => renderWith(createCy())).not.toThrow()
  })
})
