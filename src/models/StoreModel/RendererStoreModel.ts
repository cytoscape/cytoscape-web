import { Renderer } from '../RendererModel'

export interface RendererState {
  // List of available renderers
  renderers: Record<string, Renderer>

  // The default renderer name
  defaultRendererName: string
}

export interface RendererAction {
  add: (renderer: Renderer) => void
  delete: (rendererId: string) => void
}

export type RendererStoreModel = RendererState & RendererAction
