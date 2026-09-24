// src/features/HierarchyViewer/components/CirclePackingLayout/useCenterAnchoredZoom.ts
//
// Keeps the point at the center of the Cell View (circle packing) fixed when
// its SVG is resized — e.g. by dragging a panel divider — as the Tree View's
// useCenterAnchoredResize does for Cytoscape.js (#749, #751).
//
// A d3 zoom transform is anchored at the SVG's top-left corner, so a resize
// alone crops the right/bottom of the view, or drags it along with a moving
// left edge. Translating the zoom transform by half of each size change keeps
// the center instead. The layout itself is never rebuilt: the circle packing
// view model is built once from the initial size, and rebuilding it (or
// re-fitting) on resize would throw away the user's zoom and pan.

import * as d3Selection from 'd3-selection'
import * as d3Zoom from 'd3-zoom'
import { RefObject, useEffect } from 'react'

interface Size {
  width: number
  height: number
}

type Zoom = d3Zoom.ZoomBehavior<SVGSVGElement, unknown>

/** The d3 event namespace this hook listens under, beside the panel's own. */
const ZOOM_EVENT = 'zoom.centerAnchor'

/** The SVG's rendered size, or null while it is hidden (0 x 0). */
const measure = (svg: SVGSVGElement): Size | null => {
  const { width, height } = svg.getBoundingClientRect()
  return width > 0 && height > 0 ? { width, height } : null
}

/**
 * Translates the Cell View's zoom transform by half of each change in the SVG's
 * size, so the point at the center stays put.
 *
 * The change is measured from the size the transform was last SET at, not from
 * the previous resize notification: every fit computes its transform from the
 * SVG's live size, so a fit that runs before the notification arrives has
 * already accounted for the change. Each zoom event (user zoom/pan, a fit, or
 * this hook's own translation) therefore resets the baseline. While the SVG is
 * hidden (the Tree View tab is selected) nothing moves, and the last visible
 * size stays the baseline for when it is shown again.
 *
 * Must run after the zoom behavior is created and attached to the SVG.
 *
 * @param svgRef - The circle packing SVG
 * @param zoomBehaviorRef - The d3 zoom behavior attached to it
 */
export const useCenterAnchoredZoom = (
  svgRef: RefObject<SVGSVGElement | null>,
  zoomBehaviorRef: RefObject<Zoom | null>,
): void => {
  useEffect(() => {
    const svg = svgRef.current
    const zoom = zoomBehaviorRef.current
    if (
      svg === null ||
      zoom === null ||
      typeof ResizeObserver === 'undefined'
    ) {
      return
    }

    let baseline: Size | null = measure(svg)

    zoom.on(ZOOM_EVENT, () => {
      baseline = measure(svg) ?? baseline
    })

    const observer = new ResizeObserver(() => {
      const current = measure(svg)
      if (current === null) {
        return
      }
      const previous = baseline
      baseline = current
      if (previous === null) {
        return
      }

      const dx = (current.width - previous.width) / 2
      const dy = (current.height - previous.height) / 2
      if (dx === 0 && dy === 0) {
        return
      }

      // translateBy works in the transform's own units: divide by the scale
      // for a screen-space shift of (dx, dy).
      const { k } = d3Zoom.zoomTransform(svg)
      zoom.translateBy(d3Selection.select(svg), dx / k, dy / k)
    })
    observer.observe(svg)

    return () => {
      observer.disconnect()
      zoom.on(ZOOM_EVENT, null)
    }
  }, [svgRef, zoomBehaviorRef])
}
