// src/features/NetworkPanel/CyjsRenderer/useCenterAnchoredResize.ts
//
// Keeps the graph point at the center of the canvas fixed when the canvas is
// resized — the way Cytoscape Desktop's Ding renderer behaves when a docked
// panel is resized (Ding's NetworkTransform stores the viewport as a center in
// network coordinates, so a resize only changes the width/height around it).
//
// Cytoscape.js anchors the viewport at the container's top-left corner instead:
// its own resize handling only calls cy.resize(), leaving the pan untouched. So
// growing the right or bottom panel covers the graph, and growing the left
// panel drags the graph along by the full amount. Panning by half the size
// change after each resize restores the center:
//
//   left panel grows by d  → container left edge moves +d, pan -d/2 → graph +d/2
//   right panel grows by d → container width -d,           pan -d/2 → graph -d/2
//   bottom panel grows by d → container height -d,         pan -d/2 → graph up d/2

import type { Core } from 'cytoscape'
import { RefObject, useEffect } from 'react'

interface Size {
  width: number
  height: number
}

/** The part of Cytoscape.js's (untyped) renderer this hook draws through. */
interface SyncRenderer {
  render?: () => void
}

/**
 * Draws the graph synchronously.
 *
 * `cy.resize()` sets the canvases' width/height, which clears them at once,
 * while Cytoscape.js only redraws on its next animation frame. A
 * ResizeObserver callback runs after this frame's animation-frame callbacks and
 * before the paint, so without this the browser paints a blank canvas on every
 * step of a divider drag — visible as flicker. `cy.forceRender()` does not help:
 * it only schedules the next frame too.
 */
const renderNow = (cy: Core): void => {
  const renderer = (
    cy as Core & { renderer?: () => SyncRenderer | undefined }
  ).renderer?.()
  renderer?.render?.()
}

/**
 * Re-centers the Cytoscape.js viewport whenever its container changes size.
 *
 * A zero-sized measurement (the container is hidden, e.g. an inactive tab) is
 * ignored and the last visible size is kept, so the graph does not jump when
 * the container is shown again. The first visible measurement only records the
 * size; the initial fit / saved-viewport restore owns the starting position.
 *
 * @param cy - The Cytoscape.js instance, or null before it is created
 * @param containerRef - The element Cytoscape.js renders into
 */
export const useCenterAnchoredResize = (
  cy: Core | null,
  containerRef: RefObject<HTMLElement | null>,
): void => {
  useEffect(() => {
    const container = containerRef.current
    if (
      cy === null ||
      container === null ||
      typeof ResizeObserver === 'undefined'
    ) {
      return
    }

    let previous: Size | null = null

    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1]
      if (entry === undefined || cy.destroyed()) {
        return
      }
      const { width, height } = entry.contentRect
      if (width === 0 || height === 0) {
        return
      }

      const last = previous
      previous = { width, height }
      if (last === null) {
        return
      }

      const dx = (width - last.width) / 2
      const dy = (height - last.height) / 2
      if (dx === 0 && dy === 0) {
        return
      }

      // Update the size now rather than waiting for Cytoscape.js's own
      // debounced (100 ms) resize, so the graph tracks a divider drag smoothly.
      cy.resize()
      cy.panBy({ x: dx, y: dy })
      renderNow(cy)
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [cy, containerRef])
}
