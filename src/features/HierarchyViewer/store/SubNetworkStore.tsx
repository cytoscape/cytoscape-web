import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../../../models/IdType'

interface SubNetworkState {
  rootNetworkId: IdType
  selectedNodes: IdType[]
  selectedHierarchyNodeNames: string[]
}

interface SubNetworkAction {
  setRootNetworkId: (rootNetworkId: IdType) => void
  setSelectedNodes: (selectedNodes: IdType[]) => void
  setSelectedHierarchyNodes: (selectedHierarchyNodeNames: string[]) => void
}

export type SubNetworkStore = SubNetworkState & SubNetworkAction

/**
 * Local store to keep track of the selected nodes
 * in the sub network for bi-directional communication
 */
export const useSubNetworkStore = create(
  immer<SubNetworkStore>((set) => ({
    rootNetworkId: '',
    selectedNodes: [],
    selectedHierarchyNodeNames: [],
    setRootNetworkId: (rootNetworkId) => {
      set((state) => {
        state.rootNetworkId = rootNetworkId
      })
    },
    setSelectedNodes: (selectedNodes) => {
      set((state) => {
        state.selectedNodes = selectedNodes
      })
    },
    setSelectedHierarchyNodes: (selectedHierarchyNodeNames: string[]) => {
      set((state) => {
        state.selectedHierarchyNodeNames = selectedHierarchyNodeNames
      })
    },
  })),
)
