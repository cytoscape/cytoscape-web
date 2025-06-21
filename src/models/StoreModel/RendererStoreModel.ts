import { Renderer } from '../RendererModel'
import { ViewPort } from '../RendererModel/ViewPort'

export interface RendererState {
  // List of available renderers
  renderers: Record<string, Renderer>

  // The default renderer name
  defaultRendererName: string
}

export interface RendererAction {
  add: (renderer: Renderer) => void
  delete: (rendererId: string) => void

  // Store renderer's state such as zoom, pan, etc.
  setViewport: (rendererId: string, viewport: ViewPort) => void
}

export type RendererStore = RendererState & RendererAction
