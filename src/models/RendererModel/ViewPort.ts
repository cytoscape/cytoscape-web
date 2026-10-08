/**
 * ViewPort interface represents the viewport of a renderer.
 * It includes properties for zoom level and pan position.
 *
 * The values are renderer-specific, meaning they can vary
 * based on the renderer being used.
 *
 * @interface ViewPort
 * @property {number} zoom - The zoom level of the viewport.
 * @property {{ x: number, y: number }} pan - The pan position of the viewport.
 * @property {number} [width] - Width of the renderer's canvas (CSS px) when
 *   the viewport was recorded.
 * @property {number} [height] - Height of the renderer's canvas (CSS px) when
 *   the viewport was recorded.
 *
 * @example
 * const viewport: ViewPort = {
 *  zoom: 1.0,
 *  pan: {
 *    x: 0,
 *    y: 0
 *  }
 * }
 *
 */
export interface ViewPort {
  zoom: number
  pan: {
    x: number
    y: number
  }
  /**
   * Canvas size the pan was recorded against. The Cytoscape.js pan is measured
   * from the canvas's top-left corner, so restoring it into a canvas of a
   * different size would move the view; with the size, the restore can keep
   * the same point at the center instead. Absent when the size was unknown.
   */
  width?: number
  height?: number
}
