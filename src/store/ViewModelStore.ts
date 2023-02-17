import { IdType } from '../models/IdType'
import { NetworkView, NodeView } from '../models/ViewModel'

import create from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'

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
  exclusiveSelect: (
    networkId: IdType,
    selectedNodes: IdType[],
    selectedEdges: IdType[],
  ) => void
  additiveSelect: (networkId: IdType, ids: IdType[]) => void
  additiveUnselect: (networkId: IdType, ids: IdType[]) => void
  setHovered: (networkId: IdType, eleToHover: IdType | null) => void
  toggleSelected: (networkId: IdType, eles: IdType[]) => void

  setNodePosition: (
    networkId: IdType,
    eleId: IdType,
    position: [number, number],
  ) => void
}

export const useViewModelStore = create(
  subscribeWithSelector(
    immer<ViewModelState & ViewModelAction>((set) => ({
      viewModels: {},

      setViewModel: (networkId: IdType, networkView: NetworkView) => {
        set((state) => {
          state.viewModels[networkId] = networkView
        })
      },
      exclusiveSelect: (
        networkId: IdType,
        selectedNodes: IdType[],
        selectedEdges: IdType[],
      ) => {
        set((state) => {
          const networkView: NetworkView = state.viewModels[networkId]

          return {
            viewModels: {
              ...state.viewModels,
              [networkId]: { ...networkView, selectedNodes, selectedEdges },
            },
          }
        })
      },

      setHovered: (networkId: IdType, eleToHover: IdType) => {
        set((state) => {
          // const networkView = state.viewModels[networkId]
          //   if (networkView != null) {
          //     networkView.hoveredElement = eleToHover
          //   }
        })
      },
      toggleSelected: (networkId: IdType, eles: IdType[]) => {
        set((state) => {
          eles.forEach((id) => {
            const nodeView = state.viewModels[networkId]?.nodeViews[id]
            const edgeView = state.viewModels[networkId]?.edgeViews[id]
            if (nodeView != null) {
              // nodeView.selected = !(nodeView.selected ?? false)
            } else {
              if (edgeView != null) {
                // edgeView.selected = !(edgeView.selected ?? false)
              }
            }
          })
        })
      },

      // select elements without unselecing anything else
      additiveSelect: (networkId: IdType, eles: IdType[]) => {
        set((state) => {
          // const networkView = state.viewModels[networkId]
          // set new selected elements
          // eles.forEach((eleId) => {
          //   const view =
          //     networkView.nodeViews[eleId] ?? networkView.edgeViews[eleId]
          //   view.selected = true
          // })
        })
      },
      // unselect elements without selecting anything else
      additiveUnselect: (networkId: IdType, eles: IdType[]) => {
        set((state) => {
          // const networkView = state.viewModels[networkId]
          // // set new selected elements
          // eles.forEach((eleId) => {
          //   const view =
          //     networkView.nodeViews[eleId] ?? networkView.edgeViews[eleId]
          //   view.selected = false
          // })
        })
      },
      setNodePosition(networkId, eleId, position) {
        set((state) => {
          const networkView = state.viewModels[networkId]
          const nodeView: NodeView = networkView.nodeViews[eleId]
          if (nodeView !== null && nodeView !== undefined) {
            nodeView.x = position[0]
            nodeView.y = position[1]
            // Update DB
          }
        })
      },
    })),
  ),
)
