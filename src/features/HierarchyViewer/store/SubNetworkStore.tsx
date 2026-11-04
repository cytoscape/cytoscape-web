import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { IdType } from '../../../models/IdType'

interface SubNetworkState {
  selectedNodes: IdType[]
  selectedHierarchyNodeNames: string[]
  // Id of the subnetwork currently rendered in the interaction viewer, of the
  // form `<hierarchyId>_<subsystemNodeId>`. Empty when none is shown. Used so
  // the hierarchy-side share URL can capture the shown subnetwork (CW-654).
  currentSubNetworkId: IdType
}

interface SubNetworkAction {
  setSelectedNodes: (selectedNodes: IdType[]) => void
  setSelectedHierarchyNodes: (selectedHierarchyNodeNames: string[]) => void
  setCurrentSubNetworkId: (currentSubNetworkId: IdType) => void
}

export type SubNetworkStore = SubNetworkState & SubNetworkAction

/**
 * Local store that keeps track of the selected nodes
 * in the sub network for bi-directional communication
 */
export const useSubNetworkStore = create(
  immer<SubNetworkStore>((set) => ({
    selectedNodes: [],
    selectedHierarchyNodeNames: [],
    currentSubNetworkId: '',
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
    setCurrentSubNetworkId: (currentSubNetworkId) => {
      set((state) => {
        state.currentSubNetworkId = currentSubNetworkId
      })
    },
  })),
)
