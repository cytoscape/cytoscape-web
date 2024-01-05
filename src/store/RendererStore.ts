/**
 * A store for the renderer components
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Renderer } from '../models/RendererModel/Renderer'

interface RendererState {
  // List of available renderers
  renderers: Record<string, Renderer>

  // The default renderer name
  defaultRendererName: string
}

interface RendererAction {
  getDefaultRenderer: () => void
  add: (renderer: Renderer) => void
}

export const useLayoutStore = create(
  immer<RendererState & RendererAction>((set, get) => ({
    renderers: {},
    defaultRendererName: '',

    add: (renderer: Renderer) => {
      set((state) => {
        state.renderers[renderer.id] = renderer
      })
    },

    getDefaultRenderer() {
      const state = get()
      return state.renderers[state.defaultRendererName]
    },
  })),
)
