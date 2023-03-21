import { IdType } from '../models/IdType'
import { NetworkView, NodeView } from '../models/ViewModel'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { deleteNetworkViewFromDb } from './persist/db'

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
  setHovered: (networkId: IdType, eleToHover: IdType) => void
  toggleSelected: (networkId: IdType, eles: IdType[]) => void

  setNodePosition: (
    networkId: IdType,
    eleId: IdType,
    position: [number, number],
  ) => void
  updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void
  delete: (networkId: IdType) => void
  deleteAll: () => void
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
          const networkView = state.viewModels[networkId]
          if (networkView !== undefined) {
            networkView.hoveredElement = eleToHover
          }
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
      updateNodePositions(networkId, positions) {
        set((state) => {
          const networkView = state.viewModels[networkId]

          const nodeViews: Record<IdType, NodeView> = networkView.nodeViews
          Object.keys(nodeViews).forEach((nodeId: IdType) => {
            const nodeView: NodeView = nodeViews[nodeId]
            const newPosition: [number, number, number?] | undefined =
              positions.get(nodeId)
            if (newPosition !== undefined) {
              nodeView.x = newPosition[0]
              nodeView.y = newPosition[1]
            }
          })
        })
      },
      delete(networkId) {
        set((state) => {
          const filtered: Record<string, NetworkView> = Object.keys(
            state.viewModels,
          ).reduce<Record<string, NetworkView>>((acc, key) => {
            if (key !== networkId) {
              acc[key] = state.viewModels[key]
            }
            return acc
          }, {})

          void deleteNetworkViewFromDb(networkId).then(() => {
            console.log('Network view deleted from db')
          })
          return {
            viewModels: {
              ...filtered,
            },
          }
        })
      },
      deleteAll() {
        set((state) => {
          state.viewModels = {}
        })
      },
    })),
  ),
)
