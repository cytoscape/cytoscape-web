/**
 * A store for the renderer components
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { DefaultRenderer } from '../../features/DefaultRenderer'
import { IdType } from '../../models'
import * as RendererImpl from '../../models/RendererModel/impl/rendererImpl'
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
        const newState = RendererImpl.add(state, renderer)
        state.renderers = newState.renderers
        return state
      })
    },
    delete: (rendererId: string) => {
      set((state) => {
        const newState = RendererImpl.deleteRenderer(state, rendererId)
        state.renderers = newState.renderers
        return state
      })
    },

    setViewport: (
      rendererId: string,
      networkId: IdType,
      viewport: ViewPort,
    ) => {
      set((state) => {
        const newState = RendererImpl.setViewport(
          state,
          rendererId,
          networkId,
          viewport,
        )
        state.viewports = newState.viewports
        return state
      })
    },

    getViewport: (
      rendererId: string,
      networkId: IdType,
    ): ViewPort | undefined => {
      const state = useRendererStore.getState()
      return RendererImpl.getViewport(state, rendererId, networkId)
    },
  })),
)
