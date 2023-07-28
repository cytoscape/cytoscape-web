import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { VisualStyle } from '../../../models/VisualStyleModel'

interface VisualStyleSelectorState {
  sharedVisualStyles: Record<string, VisualStyle>
}

interface VisualStyleSelectorAction {
  add: (name: string, visualStyle: VisualStyle) => void
  delete: (name: string) => void
}

type VisualStyleSelectorStore = VisualStyleSelectorState &
  VisualStyleSelectorAction

/**
 * The Visual Style store to keep isolated, independent visual styles
 * to be shared between different network views.
 */
export const useVisualStyleSelectorStore = create(
  immer<VisualStyleSelectorStore>((set) => ({
    sharedVisualStyles: {},
    add: (name, visualStyle) => {
      set((state) => {
        state.sharedVisualStyles[name] = visualStyle
      })
    },
    delete: (name) => {
      set((state) => {
        delete state.sharedVisualStyles[name]
      })
    },
  })),
)
