import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { IdType } from '../../../models/IdType'

export interface RingSelection {
  subNetworkId: IdType
  nodeIds: IdType[]
}

/** A selection a link asks for in a subnetwork, by node and edge id */
export interface UrlSubNetworkSelection {
  subNetworkId: IdType
  nodeIds: IdType[]
  edgeIds: IdType[]
}

interface SubNetworkState {
  // Names of the proteins to select in the subnetwork, from a click in the Cell
  // View
  selectedNodes: IdType[]
  // The subnetwork `selectedNodes` has yet to reach, or null when nothing is
  // waiting. A click comes before the subnetwork of the subsystem it selects, and
  // must reach that one once: not the one still on screen, nor one selected after
  // it. This lives here and not in the panel because the click is what mounts the
  // panel, and the panel can unmount and come back. The Cell View, which stays
  // mounted, clears it when that subsystem is no longer selected.
  selectedNodesTarget: IdType | null
  // What a click on a protein ring last selected in the viewer. The Cell View
  // already outlines those rings, so this selection is not sent back to it, not
  // even by a viewer that unmounted and came back. A new click forgets it.
  ringSelection: RingSelection | null
  selectedHierarchyNodeNames: string[]
  // Id of the subnetwork currently rendered in the interaction viewer, of the
  // form `<hierarchyId>_<subsystemNodeId>`. Empty when none is shown. Used so
  // the hierarchy-side share URL can capture the shown subnetwork (CW-654).
  currentSubNetworkId: IdType
  // What a link (`selectedSubnetworkNodes`) selects in a subnetwork, held until
  // the viewer shows that subnetwork, however long its fetch takes. Applied
  // once, then cleared.
  urlSelection: UrlSubNetworkSelection | null
  // A subsystem a link selected, for the Cell View to zoom to once it is shown
  // and the subsystem is selected. Applied once, then cleared.
  cellViewFocus: IdType | null
}

interface SubNetworkAction {
  setSelectedNodes: (selectedNodes: IdType[], target: IdType | null) => void
  // The click reached its subnetwork, where it selected `ringSelection` (null
  // for a click that names no protein)
  markSelectedNodesApplied: (ringSelection: RingSelection | null) => void
  clearSelectedNodesTarget: () => void
  clearRingSelection: () => void
  setSelectedHierarchyNodes: (selectedHierarchyNodeNames: string[]) => void
  setCurrentSubNetworkId: (currentSubNetworkId: IdType) => void
  requestUrlSelection: (selection: UrlSubNetworkSelection) => void
  clearUrlSelection: () => void
  requestCellViewFocus: (subsystemId: IdType) => void
  clearCellViewFocus: () => void
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
    ringSelection: null,
    selectedHierarchyNodeNames: [],
    currentSubNetworkId: '',
    urlSelection: null,
    cellViewFocus: null,
    setSelectedNodes: (selectedNodes, target) => {
      set((state) => {
        state.selectedNodes = selectedNodes
        state.selectedNodesTarget = target
        state.ringSelection = null
      })
    },
    markSelectedNodesApplied: (ringSelection) => {
      set((state) => {
        state.selectedNodesTarget = null
        state.ringSelection = ringSelection
      })
    },
    clearSelectedNodesTarget: () => {
      set((state) => {
        state.selectedNodesTarget = null
      })
    },
    clearRingSelection: () => {
      set((state) => {
        state.ringSelection = null
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
    requestUrlSelection: (selection) => {
      set((state) => {
        state.urlSelection = selection
      })
    },
    clearUrlSelection: () => {
      set((state) => {
        state.urlSelection = null
      })
    },
    requestCellViewFocus: (subsystemId) => {
      set((state) => {
        state.cellViewFocus = subsystemId
      })
    },
    clearCellViewFocus: () => {
      set((state) => {
        state.cellViewFocus = null
      })
    },
  })),
)
