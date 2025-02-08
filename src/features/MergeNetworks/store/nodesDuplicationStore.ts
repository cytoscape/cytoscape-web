import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface NodesDuplicationState {
  nodesDuplication: Record<string, boolean>
}

interface NodesDuplicationAction {
  setHasDuplication: (netId: string, hasDuplication: boolean) => void
  setNodesDuplication: (nodesDuplication: Record<string, boolean>) => void
  removeNetworks: (netId: string | string[]) => void
  resetStore: () => void
}

type NodesDuplicationStore = NodesDuplicationState & NodesDuplicationAction

const useNodesDuplicationStore = create(
  immer<NodesDuplicationStore>((set) => ({
    nodesDuplication: {},
    setHasDuplication: (netId: string, hasDuplication: boolean) =>
      set((state) => ({
        nodesDuplication: {
          ...state.nodesDuplication,
          [netId]: hasDuplication,
        },
      })),
    setNodesDuplication: (newNodesDuplication: Record<string, boolean>) =>
      set((state) => ({
        nodesDuplication: { ...state.nodesDuplication, ...newNodesDuplication },
      })),
    removeNetworks: (netIds: string | string[]) =>
      set((state) => {
        if (typeof netIds === 'string') {
          delete state.nodesDuplication[netIds]
        } else {
          netIds.forEach((netId) => delete state.nodesDuplication[netId])
        }
        return state
      }),
    resetStore: () =>
      set(() => ({
        nodesDuplication: {},
      })),
  })),
)

export default useNodesDuplicationStore
