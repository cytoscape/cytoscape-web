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
  exclusiveSelect: (networkId: IdType, ids: IdType[]) => void
  additiveSelect: (networkId: IdType, ids: IdType[]) => void
  additiveUnselect: (networkId: IdType, ids: IdType[]) => void
  setHovered: (networkId: IdType, eleToHover: IdType | null) => void
  toggleSelected: (networkId: IdType, eles: IdType[]) => void
}

export const useViewModelStore = create(
  immer<ViewModelState & ViewModelAction>((set) => ({
    viewModels: {},

    setViewModel: (networkId: IdType, networkView: NetworkView) => {
      set((state) => {
        state.viewModels[networkId] = networkView
      })
    },
    // select elementsToSelect and unselect everything else
    exclusiveSelect: (networkId: IdType, elementsToSelect: IdType[]) => {
      // set((state) => {
      //   const networkView = state.viewModels[networkId]
      //   // unset all elements
      //   Object.values(networkView.nodeViews).forEach((nodeView) => {
      //     nodeView.selected = false
      //   })
      //   Object.values(networkView.edgeViews).forEach((edgeView) => {
      //     edgeView.selected = false
      //   })
      //   // set new selected elements
      //   elementsToSelect.forEach((eleId) => {
      //     const view =
      //       networkView.nodeViews[eleId] ?? networkView.edgeViews[eleId]
      //     view.selected = true
      //   })
      // })
    },
    setHovered: (networkId: IdType, eleToHover: IdType | null) => {
      // set((state) => {
      //   const networkView = state.viewModels[networkId]
      //   if (networkView != null) {
      //     networkView.hoveredElement = eleToHover
      //   }
      // })
    },
    toggleSelected: (networkId: IdType, eles: IdType[]) => {
      // set((state) => {
      //   eles.forEach((id) => {
      //     const nodeView = state.viewModels[networkId]?.nodeViews[id]
      //     const edgeView = state.viewModels[networkId]?.edgeViews[id]
      //     if (nodeView != null) {
      //       nodeView.selected = !(nodeView.selected ?? false)
      //     } else {
      //       if (edgeView != null) {
      //         edgeView.selected = !(edgeView.selected ?? false)
      //       }
      //     }
      //   })
      // })
    },

    // select elements without unselecing anything else
    additiveSelect: (networkId: IdType, eles: IdType[]) => {
      // set((state) => {
      //   const networkView = state.viewModels[networkId]
      //   // set new selected elements
      //   eles.forEach((eleId) => {
      //     const view =
      //       networkView.nodeViews[eleId] ?? networkView.edgeViews[eleId]
      //     view.selected = true
      //   })
      // })
    },
    // unselect elements without selecting anything else
    additiveUnselect: (networkId: IdType, eles: IdType[]) => {
      // set((state) => {
      //   const networkView = state.viewModels[networkId]
      //   // set new selected elements
      //   eles.forEach((eleId) => {
      //     const view =
      //       networkView.nodeViews[eleId] ?? networkView.edgeViews[eleId]
      //     view.selected = false
      //   })
      // })
    },
  })),
)
