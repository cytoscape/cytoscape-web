import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../../../models/IdType'

interface SubNetworkState {
  selectedNodes: IdType[]
  selectedHierarchyNodeNames: string[]
}

interface SubNetworkAction {
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
    selectedNodes: [],
    selectedHierarchyNodeNames: [],
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
