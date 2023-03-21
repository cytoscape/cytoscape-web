import { IdType } from '../models/IdType'
import { NetworkView, NodeView } from '../models/ViewModel'
import { isEdgeId } from '../models/NetworkModel/impl/CyNetwork'
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
          const networkView = state.viewModels[networkId]
          const selectedNodesSet = new Set(networkView.selectedNodes)
          const selectedEdgesSet = new Set(networkView.selectedEdges)

          const nodeEles = eles.filter((id) => !isEdgeId(id))
          const edgeEles = eles.filter((id) => isEdgeId(id))
          nodeEles.forEach((id) => {
            if (selectedNodesSet.has(id)) {
              selectedNodesSet.delete(id)
            } else {
              selectedNodesSet.add(id)
            }
          })

          edgeEles.forEach((id) => {
            if (selectedEdgesSet.has(id)) {
              selectedEdgesSet.delete(id)
            } else {
              selectedEdgesSet.add(id)
            }
          })

          networkView.selectedNodes = Array.from(selectedNodesSet)
          networkView.selectedEdges = Array.from(selectedEdgesSet)
        })
      },

      // select elements without unselecing anything else
      additiveSelect: (networkId: IdType, eles: IdType[]) => {
        set((state) => {
          const networkView = state.viewModels[networkId]
          const selectedNodesSet = new Set()
          const selectedEdgesSet = new Set()

          for (let i = 0; i < eles.length; i++) {
            const eleId = eles[i]
            if (isEdgeId(eleId)) {
              selectedEdgesSet.add(eleId)
            } else {
              selectedNodesSet.add(eleId)
            }
          }

          networkView.selectedNodes = Array.from(selectedNodesSet) as IdType[]
          networkView.selectedEdges = Array.from(selectedEdgesSet) as IdType[]
        })
      },
      // unselect elements without selecting anything else
      additiveUnselect: (networkId: IdType, eles: IdType[]) => {
        set((state) => {
          const networkView = state.viewModels[networkId]

          const selectedNodesSet = new Set()
          const selectedEdgesSet = new Set()

          for (let i = 0; i < eles.length; i++) {
            const eleId = eles[i]
            if (isEdgeId(eleId)) {
              selectedEdgesSet.delete(eleId)
            } else {
              selectedNodesSet.delete(eleId)
            }
          }
          networkView.selectedNodes = Array.from(selectedNodesSet) as IdType[]
          networkView.selectedEdges = Array.from(selectedEdgesSet) as IdType[]
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
