import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../../../models/IdType'

interface SubNetworkState {
  selectedNodes: IdType[]
}

interface SubNetworkAction {
  setSelectedNodes: (selectedNodes: IdType[]) => void
}

type SubNetworkStore = SubNetworkState & SubNetworkAction

/**
 * Local store to keep track of the selected nodes 
 * in the subnetwork for bi-directional communication
 */
export const useSubNetworkStore = create(
  immer<SubNetworkStore>((set) => ({
    selectedNodes: [],
    setSelectedNodes: (selectedNodes) => {
      set((state) => {
        state.selectedNodes = selectedNodes
      })
    },
  })),
)
