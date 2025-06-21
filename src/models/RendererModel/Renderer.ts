/**
 * Network renderer interface
 */

import { ReactElement } from 'react'
import { Network } from '../NetworkModel'
import { ViewPort } from './ViewPort'

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
    /**
     * Network data model to be rendered
     */
    network: Network,

    /**
     * (Optional) Initial size of the renderer's container
     */
    initialSize?: { w: number; h: number },

    /**
     * (Optional) Visibility of the renderer component
     */
    visible?: boolean,

    hasTab?: boolean,
  ) => ReactElement
}
