import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import {
  defAlgorithm,
  defHierarchicalAlgorithm,
  getLayout,
  LayoutEngines,
} from '../../models/LayoutModel/impl/layoutSelection'
import { LayoutAlgorithm } from '../../models/LayoutModel/LayoutAlgorithm'
import { LayoutEngine } from '../../models/LayoutModel/LayoutEngine'
import * as LayoutStoreImpl from '../../models/StoreModel/impl/layoutStoreImpl'
import { Property } from '../../models/PropertyModel/Property'
import { LayoutStore } from '../../models/StoreModel/LayoutStoreModel'
import { ValueType } from '../../models/TableModel'

/**
 * Store for layout parameters
 */
export const useLayoutStore = create(
  immer<LayoutStore>((set) => ({
    layoutEngines: LayoutEngines,
    preferredLayout: defAlgorithm,
    preferredHierarchicalLayout: defHierarchicalAlgorithm,
    isRunning: false,

    setPreferredLayout(engineName: string, algorithmName: string) {
      set((state) => {
        const newState = LayoutStoreImpl.setPreferredLayout(
          state,
          engineName,
          algorithmName,
        )
        state.preferredLayout = newState.preferredLayout
        return state
      })
    },
    setIsRunning(isRunning: boolean) {
      set((state) => {
        const newState = LayoutStoreImpl.setIsRunning(state, isRunning)
        state.isRunning = newState.isRunning
        return state
      })
    },

    setLayoutOption<T extends ValueType>(
      engineName: string,
      algorithmName: string,
      propertyName: string,
      propertyValue: T,
    ) {
      set((state) => {
        const newState = LayoutStoreImpl.setLayoutOption(
          state,
          engineName,
          algorithmName,
          propertyName,
          propertyValue,
        )
        state.layoutEngines = newState.layoutEngines
        return state
      })
    },
  })),
)
