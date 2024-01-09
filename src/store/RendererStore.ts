/**
 * A store for the renderer components
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Renderer } from '../models/RendererModel/Renderer'
import { DefaultRenderer } from './DefaultRenderer'

interface RendererState {
  // List of available renderers
  renderers: Record<string, Renderer>

  // The default renderer name
  defaultRendererName: string
}

interface RendererAction {
  add: (renderer: Renderer) => void
  delete: (rendererName: string) => void
}

export const useRendererStore = create(
  immer<RendererState & RendererAction>((set, get) => ({
    // Initialize with the default renderer, which is the Cytoscape.js renderer
    renderers: { [DefaultRenderer.id]: DefaultRenderer },
    defaultRendererName: DefaultRenderer.id,

    add: (renderer: Renderer) => {
      set((state) => {
        state.renderers[renderer.id] = renderer
      })
    },
    delete: (rendererName: string) => {
      set((state) => {
        delete state.renderers[rendererName]
      })
    },
  })),
)
