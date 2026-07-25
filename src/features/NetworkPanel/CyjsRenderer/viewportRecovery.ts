/**
 * Local recovery from off-screen layouts.
 *
 * When another tab re-runs a layout, node coordinates can move far enough that a
 * tab holding its own pan/zoom ends up looking at blank canvas. The earlier fix
 * broadcast a `FIT_NETWORK` message that made every other tab discard its saved
 * viewport, so that a later effect would incidentally call `cy.fit()`. That had
 * three problems: it fired on every `updateNodePositions` (undo/redo, the
 * scaling slider) so it repeatedly yanked other tabs' cameras; it depended on
 * the message arriving before the position data on a separate channel; and it
 * threw away a deliberate zoom even when the graph was still perfectly visible.
 *
 * Each tab decides for itself instead: keep the camera unless the graph has left
 * the viewport entirely. No cross-tab message, no ordering contract.
 */

export interface Extent {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** Do two axis-aligned rectangles overlap at all? */
export const intersects = (a: Extent, b: Extent): boolean =>
  a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1

/**
 * True when any part of the graph falls inside the current viewport.
 *
 * Returns true for an empty graph and whenever the renderer cannot report
 * geometry: the fallback must be "leave the camera alone", since an unwanted fit
 * is more disruptive than a missed one.
 */
export const isGraphVisible = (cy: any): boolean => {
  try {
    if (cy === null || cy === undefined || cy.elements().length === 0) {
      return true
    }

    const graph = cy.elements().boundingBox() as Extent & {
      w: number
      h: number
    }
    const viewport = cy.extent() as Extent

    if (
      !Number.isFinite(graph.x1) ||
      !Number.isFinite(graph.x2) ||
      !Number.isFinite(viewport.x1) ||
      !Number.isFinite(viewport.x2)
    ) {
      return true
    }

    // A zero-area graph (single node) has no overlap under a strict test, so
    // pad it to a point-in-rect check.
    const padded: Extent = {
      x1: graph.x1,
      y1: graph.y1,
      x2: graph.x2 === graph.x1 ? graph.x1 + 1 : graph.x2,
      y2: graph.y2 === graph.y1 ? graph.y1 + 1 : graph.y2,
    }

    return intersects(padded, viewport)
  } catch {
    return true
  }
}
