import { IdType } from '../IdType'
import { Renderer } from '../RendererModel'
import { ViewPort } from '../RendererModel/ViewPort'

export interface RendererState {
  // List of available renderers
  renderers: Record<string, Renderer>

  // The default renderer name
  defaultRendererName: string

  /**
   *  Viewports for each renderer and network
   *  The key is the renderer ID, and the value is a
   *  key-value pairs of network IDs to their respective viewport states.
   */
  viewports: Record<string, Record<IdType, ViewPort>>
}

export interface RendererAction {
  add: (renderer: Renderer) => void
  delete: (rendererId: string) => void

  // Store renderer's state such as zoom, pan, etc.
  setViewport: (
    rendererId: string,
    networkId: IdType,
    viewport: ViewPort,
  ) => void

  // Get stored viewport for a renderer and network
  getViewport: (rendererId: string, networkId: IdType) => ViewPort | undefined
}

export type RendererStore = RendererState & RendererAction
