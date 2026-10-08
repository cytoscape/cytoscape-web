// src/features/NetworkPanel/CyjsRenderer/viewportRestore.ts
//
// Restoring a saved viewport into a canvas whose size has changed since it was
// saved — e.g. the user resized a panel while another network was shown.
//
// The Cytoscape.js pan is measured from the canvas's top-left corner, but the
// canvas keeps the graph centered on resize (useCenterAnchoredResize), the way
// Cytoscape Desktop does. Restoring the raw pan would therefore place a
// background network as if it had been top-left anchored through the resize.
// Shifting by half the size change keeps the saved center at the center.

import { ViewPort } from '../../../models/RendererModel/ViewPort'

const isPositive = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value) && value > 0

/**
 * The pan that shows `viewport` centered in a canvas of `width` x `height`.
 *
 * Falls back to the saved pan when either size is unknown or unusable: a
 * viewport saved without a size, or a hidden (0 x 0) canvas.
 *
 * @param viewport - The saved viewport
 * @param width - Current canvas width (CSS px)
 * @param height - Current canvas height (CSS px)
 * @returns A new pan object; the stored one is never returned
 */
export const panForCanvasSize = (
  viewport: ViewPort,
  width: number,
  height: number,
): { x: number; y: number } => {
  const { pan } = viewport
  if (
    !isPositive(viewport.width) ||
    !isPositive(viewport.height) ||
    !isPositive(width) ||
    !isPositive(height)
  ) {
    return { x: pan.x, y: pan.y }
  }

  return {
    x: pan.x + (width - viewport.width) / 2,
    y: pan.y + (height - viewport.height) / 2,
  }
}
