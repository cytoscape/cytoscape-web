import { IdType } from '../models/IdType'
import { NetworkView } from '../models/ViewModel'

import create from 'zustand'
import { immer } from 'zustand/middleware/immer'

/**
//  * View model state manager based on zustand
//  */
interface ViewModelState {
  viewModels: Record<IdType, NetworkView>
}

// /**
//  * Actions to mutate visual style structure
//  */
// interface UpdateVisualStyleAction {
// }

interface ViewModelAction {
  setViewModel: (networkId: IdType, networkView: NetworkView) => void
  setSelected: (networkId: IdType, ids: IdType[]) => void
}

export const useViewModelStore = create(
  immer<ViewModelState & ViewModelAction>((set) => ({
    viewModels: {},

    setViewModel: (networkId: IdType, networkView: NetworkView) => {
      set((state) => {
        state.viewModels[networkId] = networkView
      })
    },
    setSelected: (networkId: IdType, elementsToSelect: IdType[]) => {
      set((state) => {
        const networkView = state.viewModels[networkId]

        // unset all elements
        Object.values(networkView.nodeViews).forEach((nodeView) => {
          nodeView.selected = false
        })
        Object.values(networkView.edgeViews).forEach((edgeView) => {
          edgeView.selected = false
        })

        // set new selected elements
        elementsToSelect.forEach((eleId) => {
          const view =
            networkView.nodeViews[eleId] ?? networkView.edgeViews[eleId]
          view.selected = true
        })
      })
    },
  })),
)
