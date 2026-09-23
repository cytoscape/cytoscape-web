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

/** The size cy has cached — the one its pan is relative to — or null if 0. */
const cachedSize = (cy: Core): Size | null => {
  const width = cy.width()
  const height = cy.height()
  return width > 0 && height > 0 ? { width, height } : null
}

type Resize = () => Core

/**
 * Makes every `cy.resize()` on this instance keep the center fixed, and returns
 * a function that undoes it.
 *
 * Wrapping the method, rather than only reacting to this hook's own observer,
 * is what makes it hold: Cytoscape.js also resizes itself — from its own
 * debounced ResizeObserver, window `resize` and container-style
 * MutationObserver — and whichever call comes first refreshes the cached size.
 * One that refreshed it without panning left the pan relative to the old size
 * with nothing left for this hook to correct, so the view drifted.
 *
 * The change is measured against the size cy had CACHED before the call, which
 * is what the pan is relative to (`cy.fit()` and a saved-viewport restore both
 * compute with it), and the new size is read back from cy afterwards, so both
 * sides are Cytoscape.js's own measurement. While the container is hidden
 * (0 x 0, e.g. an inactive tab) nothing is panned, and the last visible size is
 * kept as the baseline for when it is shown again.
 */
const installCenterAnchoredResize = (cy: Core): (() => void) => {
  const target = cy as Core & { resize: Resize }
  const hadOwnResize = Object.prototype.hasOwnProperty.call(target, 'resize')
  const nativeResize = target.resize
  let lastVisible: Size | null = cachedSize(cy)

  target.resize = function centerAnchoredResize(): Core {
    if (cy.destroyed()) {
      return nativeResize.call(cy)
    }

    const before = cachedSize(cy) ?? lastVisible
    nativeResize.call(cy)
    const after = cachedSize(cy)
    if (after === null) {
      return cy
    }
    lastVisible = after
    if (before === null) {
      return cy
    }

    const dx = (after.width - before.width) / 2
    const dy = (after.height - before.height) / 2
    if (dx !== 0 || dy !== 0) {
      cy.panBy({ x: dx, y: dy })
      renderNow(cy)
    }
    return cy
  }

  return () => {
    if (hadOwnResize) {
      target.resize = nativeResize
    } else {
      delete (target as Partial<typeof target>).resize
    }
  }
}

/**
 * Keeps the Cytoscape.js viewport centered whenever its container changes size.
 *
 * Every `cy.resize()` on the instance keeps the center (see
 * installCenterAnchoredResize). A ResizeObserver on the container calls it as
 * soon as the size changes, rather than waiting for Cytoscape.js's own
 * debounced (100 ms) resize, so the graph tracks a divider drag smoothly.
 *
 * @param cy - The Cytoscape.js instance, or null before it is created
 * @param containerRef - The element Cytoscape.js renders into
 */
export const useCenterAnchoredResize = (
  cy: Core | null,
  containerRef: RefObject<HTMLElement | null>,
): void => {
  useEffect(() => {
    if (cy === null) {
      return
    }
    const uninstall = installCenterAnchoredResize(cy)

    const container = containerRef.current
    if (container === null || typeof ResizeObserver === 'undefined') {
      return uninstall
    }

    const observer = new ResizeObserver(() => {
      if (!cy.destroyed()) {
        cy.resize()
      }
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      uninstall()
    }
  }, [cy, containerRef])
}
