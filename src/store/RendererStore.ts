/**
 * A store for the renderer components
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Renderer } from '../models/RendererModel/Renderer'
import { DefaultRenderer } from './DefaultRenderer'
import { RendererStore } from '../models/StoreModel/RendererStoreModel'

export const useRendererStore = create(
  immer<RendererStore>((set) => ({
    // Initialize with the default renderer, which is the Cytoscape.js renderer
    renderers: { [DefaultRenderer.id]: DefaultRenderer },
    defaultRendererName: DefaultRenderer.id,

    add: (renderer: Renderer) => {
      set((state) => {
        state.renderers[renderer.id] = renderer
      })
    },
    delete: (rendererId: string) => {
      set((state) => {
        delete state.renderers[rendererId]
      })
    },
  })),
)
