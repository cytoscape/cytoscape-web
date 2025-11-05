/**
 * A store for the renderer components
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { DefaultRenderer } from '../../features/DefaultRenderer'
import { IdType } from '../../models'
import { Renderer } from '../../models/RendererModel/Renderer'
import { ViewPort } from '../../models/RendererModel/ViewPort'
import { RendererStore } from '../../models/StoreModel/RendererStoreModel'

export const useRendererStore = create(
  immer<RendererStore>((set) => ({
    // Initialize with the default renderer, which is the Cytoscape.js renderer
    renderers: { [DefaultRenderer.id]: DefaultRenderer },
    defaultRendererName: DefaultRenderer.id,
    viewports: {},

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

    setViewport: (
      rendererId: string,
      networkId: IdType,
      viewport: ViewPort,
    ) => {
      set((state) => {
        if (!state.viewports[rendererId]) {
          state.viewports[rendererId] = {}
        }
        state.viewports[rendererId][networkId] = viewport
      })
    },

    getViewport: (
      rendererId: string,
      networkId: IdType,
    ): ViewPort | undefined => {
      const state = useRendererStore.getState()
      return state.viewports[rendererId]?.[networkId]
    },
  })),
)
