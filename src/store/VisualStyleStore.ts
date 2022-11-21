import { IdType } from '../models/IdType'
import {
  VisualPropertyName,
  VisualPropertyValueType,
  VisualStyle,
} from '../models/VisualStyleModel'

import create from 'zustand'
import { immer } from 'zustand/middleware/immer'

/**
//  * Visual Style State manager based on zustand
//  */
interface VisualStyleState {
  visualStyles: Record<IdType, VisualStyle>
}

/**
 * Actions to mutate visual style structure
 */
interface UpdateVisualStyleAction {
  setDefault: (
    networkId: IdType,
    vpName: VisualPropertyName,
    vpValue: VisualPropertyValueType,
  ) => void
  setBypass: (
    networkId: IdType,
    vpName: VisualPropertyName,
    elementId: IdType,
    vpValue: VisualPropertyValueType,
  ) => void
  // setMapping: () // TODO
}

interface VisualStyleAction {
  set: (networkId: IdType, visualStyle: VisualStyle) => void
  //   reset: () => void

  //   add: (network: Network) => void
  //   delete: (networkId: IdType) => void
  //   deleteAll: () => void
}

export const useVisualStyleStore = create(
  immer<VisualStyleState & VisualStyleAction & UpdateVisualStyleAction>(
    (set) => ({
      visualStyles: {},

      set: (networkId: IdType, visualStyle: VisualStyle) => {
        set((state) => {
          state.visualStyles[networkId] = visualStyle
          return state
        })
      },

      setDefault: (
        networkId: IdType,
        vpName: VisualPropertyName,
        vpValue: VisualPropertyValueType,
      ) => {
        set((state) => {
          state.visualStyles[networkId][vpName].default = vpValue
          return state
        })
      },

      setBypass: (
        networkId: IdType,
        vpName: VisualPropertyName,
        elementId: IdType,
        vpValue: VisualPropertyValueType,
      ) => {
        set((state) => {
          state.visualStyles[networkId][vpName].bypassMap[elementId] = vpValue
        })
      },
    }),
  ),
)
