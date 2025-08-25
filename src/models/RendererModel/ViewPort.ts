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
}
