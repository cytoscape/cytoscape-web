/**
 * @deprecated The Module Federation exposure of this store (cyweb/LayoutStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/LayoutStore Module Federation export will be removed after 2 release cycles.
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import {
  defAlgorithm,
  defHierarchicalAlgorithm,
  getLayout,
  LayoutEngines,
} from '../../../models/LayoutModel/impl/layoutSelection'
import { LayoutAlgorithm } from '../../../models/LayoutModel/LayoutAlgorithm'
import { LayoutEngine } from '../../../models/LayoutModel/LayoutEngine'
import { Property } from '../../../models/PropertyModel/Property'
import * as LayoutStoreImpl from '../../../models/StoreModel/impl/layoutStoreImpl'
import { LayoutStore } from '../../../models/StoreModel/LayoutStoreModel'
import { ValueType } from '../../../models/TableModel'

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
