/**
 * Network renderer interface
 */

import { ReactElement } from 'react'
import { Network } from '../NetworkModel'

/**
 * Renderer interface to be managed by the RendererStore
 *
 * This is a simple wrapper for the actual renderer React component
 *
 */
export interface Renderer {
  id: string

  /**
   * Human readable name of the renderer
   * e.g., "Cytoscape.js Renderer"
   */
  name?: string

  /**
   * Optional description of the renderer.
   * e.g., "A renderer drawing node-link diagram using Cytoscape.js"
   */
  description?: string

  /**
   * Get an actual renderer React component for the given data model
   */
  getComponent: (
    network: Network,
    initialSize?: { w: number; h: number },
  ) => ReactElement
}
