import { renderHook } from '@testing-library/react'
import * as d3Selection from 'd3-selection'
import * as d3Zoom from 'd3-zoom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCenterAnchoredZoom } from './useCenterAnchoredZoom'

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

// ── Helpers ───────────────────────────────────────────────────────────────────

type Zoom = d3Zoom.ZoomBehavior<SVGSVGElement, unknown>

/**
 * A real SVG with a real d3 zoom behavior, as CirclePackingPanel sets up. jsdom
 * does no layout, so the SVG's size is whatever `setSize` last put there, and
 * the zoom gets an explicit extent (d3's default reads SVG lengths jsdom lacks).
 */
const createSvgWithZoom = (width: number, height: number) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  document.body.appendChild(svg)
  const size = { width, height }
  svg.getBoundingClientRect = () =>
    ({ ...size, x: 0, y: 0, top: 0, left: 0 }) as DOMRect

  const panelListener = vi.fn()
  const zoom: Zoom = d3Zoom
    .zoom<SVGSVGElement, unknown>()
    .extent([
      [0, 0],
      [width, height],
    ])
    .on('zoom', panelListener)
  const selection = d3Selection.select(svg)
  selection.call(zoom)

  return {
    svg,
    zoom,
    selection,
    panelListener,
    setSize: (w: number, h: number) => {
      size.width = w
      size.height = h
    },
    transform: () => d3Zoom.zoomTransform(svg),
  }
}

const renderWith = (
  svg: SVGSVGElement | null,
  zoom: Zoom | null,
): ReturnType<typeof renderHook> =>
  renderHook(() => useCenterAnchoredZoom({ current: svg }, { current: zoom }))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCenterAnchoredZoom', () => {
  beforeEach(() => {
    FakeResizeObserver.instances = []
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('observes the SVG', () => {
    const { svg, zoom } = createSvgWithZoom(800, 600)
    renderWith(svg, zoom)

    expect(latestObserver().observed).toEqual([svg])
  })

  it('does nothing without an SVG or a zoom behavior', () => {
    const { svg, zoom } = createSvgWithZoom(800, 600)
    renderWith(null, zoom)
    renderWith(svg, null)

    expect(FakeResizeObserver.instances).toHaveLength(0)
  })

  it('translates by half the width lost when a side panel grows', () => {
    const view = createSvgWithZoom(800, 600)
    view.selection.call(
      view.zoom.transform,
      new d3Zoom.ZoomTransform(2, 10, 20),
    )
    renderWith(view.svg, view.zoom)

    view.setSize(600, 600)
    latestObserver().notify()

    // Screen-space shift of -100 px at any zoom level; the scale is unchanged.
    expect(view.transform()).toEqual(new d3Zoom.ZoomTransform(2, -90, 20))
  })

  it('translates by half the height gained when the table panel shrinks', () => {
    const view = createSvgWithZoom(800, 400)
    renderWith(view.svg, view.zoom)

    view.setSize(800, 500)
    latestObserver().notify()

    expect(view.transform()).toEqual(new d3Zoom.ZoomTransform(1, 0, 50))
  })

  it('keeps the same point at the center of the SVG', () => {
    const view = createSvgWithZoom(800, 600)
    view.selection.call(
      view.zoom.transform,
      new d3Zoom.ZoomTransform(3.5, -120, 75),
    )
    renderWith(view.svg, view.zoom)
    const centerBefore = view.transform().invert([400, 300])

    view.setSize(537, 411)
    latestObserver().notify()

    const centerAfter = view.transform().invert([537 / 2, 411 / 2])
    expect(centerAfter[0]).toBeCloseTo(centerBefore[0])
    expect(centerAfter[1]).toBeCloseTo(centerBefore[1])
  })

  it('accumulates relative to the previous size across a drag', () => {
    const view = createSvgWithZoom(800, 600)
    renderWith(view.svg, view.zoom)
    const observer = latestObserver()

    view.setSize(790, 600)
    observer.notify()
    view.setSize(760, 590)
    observer.notify()

    expect(view.transform()).toEqual(new d3Zoom.ZoomTransform(1, -20, -5))
  })

  it('keeps the existing zoom listener and notifies it', () => {
    const view = createSvgWithZoom(800, 600)
    renderWith(view.svg, view.zoom)
    view.panelListener.mockClear()

    view.setSize(600, 600)
    latestObserver().notify()

    // The panel's own listener applies the transform to the circles.
    expect(view.panelListener).toHaveBeenCalled()
  })

  // A fit (or a user zoom) computes the new transform from the SVG's size at
  // that moment. If the resize notification arrives only afterwards, the
  // change it reports is already accounted for and must not shift the view.
  it('measures from the size of the last transform change', () => {
    const view = createSvgWithZoom(800, 600)
    renderWith(view.svg, view.zoom)

    view.setSize(600, 600)
    const fitted = new d3Zoom.ZoomTransform(1.5, 42, 17)
    view.selection.call(view.zoom.transform, fitted)
    latestObserver().notify()

    expect(view.transform()).toEqual(fitted)
  })

  it('keeps the last visible size while the SVG is hidden', () => {
    const view = createSvgWithZoom(800, 600)
    renderWith(view.svg, view.zoom)
    const observer = latestObserver()

    // The Cell View tab is hidden (display: none) while the table panel grows.
    view.setSize(0, 0)
    observer.notify()
    view.setSize(800, 500)
    observer.notify()

    expect(view.transform()).toEqual(new d3Zoom.ZoomTransform(1, 0, -50))
  })

  it('does nothing when the size is unchanged', () => {
    const view = createSvgWithZoom(800, 600)
    renderWith(view.svg, view.zoom)
    view.panelListener.mockClear()

    latestObserver().notify()

    expect(view.panelListener).not.toHaveBeenCalled()
  })

  it('stops observing and listening on unmount', () => {
    const view = createSvgWithZoom(800, 600)
    const { unmount } = renderWith(view.svg, view.zoom)
    const observer = latestObserver()

    unmount()

    expect(observer.disconnected).toBe(true)
    expect(view.zoom.on('zoom.centerAnchor')).toBeUndefined()
    expect(view.zoom.on('zoom')).toBe(view.panelListener)
  })

  it('is a no-op where ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const view = createSvgWithZoom(800, 600)

    expect(() => renderWith(view.svg, view.zoom)).not.toThrow()
  })
})
