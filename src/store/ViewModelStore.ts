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
  setViewModel: (id: IdType, networkView: NetworkView) => void
}

export const useViewModelStore = create(
  immer<ViewModelState & ViewModelAction>((set) => ({
    viewModels: {},

    setViewModel: (id: IdType, networkView: NetworkView) => {
      set((state) => {
        state.viewModels[id] = networkView
      })
    },
  })),
)
