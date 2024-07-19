import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../../../models/IdType'

interface SubNetworkState {
  rootNetworkId: IdType
  rootNetworkHost: string // URL of the server hosting the root network data
  selectedNodes: IdType[]
  selectedHierarchyNodeNames: string[]
}

interface SubNetworkAction {
  setRootNetworkId: (rootNetworkId: IdType) => void
  setRootNetworkHost: (rootNetworkHost: string) => void
  setSelectedNodes: (selectedNodes: IdType[]) => void
  setSelectedHierarchyNodes: (selectedHierarchyNodeNames: string[]) => void
}

export type SubNetworkStore = SubNetworkState & SubNetworkAction

/**
 * Local store to store data source information of the interactions and
 * keep track of the selected nodes
 * in the sub network for bi-directional communication
 */
export const useSubNetworkStore = create(
  immer<SubNetworkStore>((set) => ({
    rootNetworkId: '',
    rootNetworkHost: '',
    selectedNodes: [],
    selectedHierarchyNodeNames: [],
    setRootNetworkId: (rootNetworkId) => {
      set((state) => {
        state.rootNetworkId = rootNetworkId
      })
    },
    setRootNetworkHost: (rootNetworkHostUrl: string) => {
      set((state) => {
        state.rootNetworkHost = rootNetworkHostUrl
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
