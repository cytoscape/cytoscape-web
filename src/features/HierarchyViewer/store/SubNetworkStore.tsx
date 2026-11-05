import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { IdType } from '../../../models/IdType'

interface SubNetworkState {
  // Names of the proteins to select in the subnetwork, from a click in the Cell
  // View
  selectedNodes: IdType[]
  // The subnetwork `selectedNodes` has yet to reach, or null when nothing is
  // waiting. A click comes before the subnetwork of the subsystem it selects, and
  // must reach that one once: not the one still on screen, nor one selected after
  // it. This lives here and not in the panel because the click is what mounts the
  // panel, and the panel can unmount and come back.
  selectedNodesTarget: IdType | null
  selectedHierarchyNodeNames: string[]
  // Id of the subnetwork currently rendered in the interaction viewer, of the
  // form `<hierarchyId>_<subsystemNodeId>`. Empty when none is shown. Used so
  // the hierarchy-side share URL can capture the shown subnetwork (CW-654).
  currentSubNetworkId: IdType
}

interface SubNetworkAction {
  setSelectedNodes: (selectedNodes: IdType[], target: IdType | null) => void
  clearSelectedNodesTarget: () => void
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
    selectedNodesTarget: null,
    selectedHierarchyNodeNames: [],
    currentSubNetworkId: '',
    setSelectedNodes: (selectedNodes, target) => {
      set((state) => {
        state.selectedNodes = selectedNodes
        state.selectedNodesTarget = target
      })
    },
    clearSelectedNodesTarget: () => {
      set((state) => {
        state.selectedNodesTarget = null
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
