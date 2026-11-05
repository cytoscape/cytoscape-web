import type { Core } from 'cytoscape'

/**
 * Whether a network of `elementCount` nodes and edges draws with
 * Cytoscape.js's WebGL renderer: when `minElements` is set, above 0, and
 * reached.
 *
 * The full app reads `minElements` from config.json's `webglMinElements`,
 * which is unset by default: WebGL draws dashed edges solid, `tee` arrows as
 * triangles, and node borders and labels differently (Cytoscape.js 3.34),
 * and in the full app it gained nothing at load and little while zooming
 * (CyjsRenderer_docs/performance.md, step 3). The embed, which streams its
 * edges and redraws every frame while it does, uses it from 10,000.
 */
export const usesWebgl = (
  elementCount: number,
  minElements: number | undefined,
): boolean =>
  minElements !== undefined && minElements > 0 && elementCount >= minElements

/**
 * Release the WebGL context of `cy`'s WebGL canvas, if it has one.
 *
 * A browser keeps about 16 WebGL contexts and drops the oldest past that,
 * and a destroyed instance's context stays until garbage collection. Two
 * cases reach the limit without this:
 *
 * - Every WebGL instance holds a context. Call before `cy.destroy()`.
 * - Once one instance has used WebGL, Cytoscape.js 3.34 gives every later
 *   instance a WebGL canvas too (its constructor sets the shared
 *   `CanvasRenderer.prototype.CANVAS_LAYERS` to 4), which it never draws
 *   on. Call right after creating an instance without WebGL.
 */
export const releaseWebglContext = (cy: Core): void => {
  cy.container()
    ?.querySelectorAll<HTMLCanvasElement>('canvas[data-id$="-webgl"]')
    .forEach((canvas) => {
      canvas
        .getContext('webgl2')
        ?.getExtension('WEBGL_lose_context')
        ?.loseContext()
    })
}
