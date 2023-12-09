import { IdType } from '../models/IdType'
import { EdgeView, NetworkView, NodeView } from '../models/ViewModel'
import { isEdgeId } from '../models/NetworkModel/impl/CyNetwork'
import { create, StateCreator, StoreApi } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import {
  clearNetworkViewsFromDb,
  deleteNetworkViewsFromDb,
  putNetworkViewsToDb,
} from './persist/db'
import { useWorkspaceStore } from './WorkspaceStore'

interface ViewModelState {
  viewModels: Record<IdType, NetworkView[]>
}

interface ViewModelAction {
  // Add a new Network View Model to the store
  add: (networkId: IdType, networkView: NetworkView) => void

  // Utility function to get the primary (first) view model of a network if no ID is given
  getViewModel: (
    networkId: IdType,
    viewModelId?: IdType,
  ) => NetworkView | undefined

  exclusiveSelect: (
    networkId: IdType,
    selectedNodes: IdType[],
    selectedEdges: IdType[],
  ) => void

  // Change the state of a view model of graph objects
  additiveSelect: (networkId: IdType, ids: IdType[]) => void
  additiveUnselect: (networkId: IdType, ids: IdType[]) => void
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

  deleteObjects: (networkId: IdType, ids: IdType[]) => void

  delete: (networkId: IdType) => void
  deleteAll: () => void
}

type ViewModelStore = ViewModelState & ViewModelAction

const persist =
  (config: StateCreator<ViewModelStore>) =>
  (
    set: StoreApi<ViewModelStore>['setState'],
    get: StoreApi<ViewModelStore>['getState'],
    api: StoreApi<ViewModelStore>,
  ) =>
    config(
      async (args) => {
        const last = get()
        const currentNetworkId =
          useWorkspaceStore.getState().workspace.currentNetworkId
        set(args)
        // const updated: NetworkView = get().viewModels[currentNetworkId]
        const updated: NetworkView[] | undefined =
          get().viewModels[currentNetworkId]
        const deleted: boolean = updated === undefined
        const lastModel: NetworkView[] | undefined =
          last.viewModels[currentNetworkId]
        if (!deleted && lastModel !== undefined) {
          void putNetworkViewsToDb(currentNetworkId, updated).then(() => {})
        }
      },
      get,
      api,
    )

export const useViewModelStore = create(
  subscribeWithSelector(
    immer<ViewModelStore>(
      persist((set, get) => ({
        viewModels: {},

        add: (networkId: IdType, networkView: NetworkView) => {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList !== undefined) {
              viewList.push(networkView)
            } else {
              state.viewModels[networkId] = [networkView]
            }
            return state
          })
        },

        getViewModel: (
          networkId: IdType,
          viewModelId?: IdType,
        ): NetworkView | undefined => {
          const viewList: NetworkView[] | undefined =
            useViewModelStore.getState().viewModels[networkId]
          if (viewList === undefined) {
            return undefined
          }
          if (viewModelId === undefined) {
            // return the first view model if no ID is given
            return viewList[0]
          }
          return viewList.find((view) => view.id === viewModelId)
        },

        exclusiveSelect: (
          networkId: IdType,
          selectedNodes: IdType[],
          selectedEdges: IdType[],
        ) => {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList === undefined) {
              return state
            }

            viewList.forEach((view: NetworkView) => {
              view.selectedNodes = selectedNodes
              view.selectedEdges = selectedEdges
            })

            return state
          })
        },
        toggleSelected: (networkId: IdType, eles: IdType[]) => {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList === undefined) {
              return state
            }

            viewList.forEach((networkView: NetworkView) => {
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
            return state
          })
        },

        // select elements without unselecing anything else
        additiveSelect: (networkId: IdType, eles: IdType[]) => {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList === undefined) {
              return state
            }

            viewList.forEach((networkView: NetworkView) => {
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

              networkView.selectedNodes = Array.from(
                selectedNodesSet,
              ) as IdType[]
              networkView.selectedEdges = Array.from(
                selectedEdgesSet,
              ) as IdType[]
            })
            return state
          })
        },
        // unselect elements without selecting anything else
        additiveUnselect: (networkId: IdType, eles: IdType[]) => {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList === undefined) {
              return state
            }

            viewList.forEach((networkView: NetworkView) => {
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
              networkView.selectedNodes = Array.from(
                selectedNodesSet,
              ) as IdType[]
              networkView.selectedEdges = Array.from(
                selectedEdgesSet,
              ) as IdType[]
            })
            return state
          })
        },
        setNodePosition(networkId, eleId, position) {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList === undefined) {
              return state
            }

            viewList.forEach((networkView: NetworkView) => {
              const nodeView: NodeView = networkView.nodeViews[eleId]
              if (nodeView !== null && nodeView !== undefined) {
                nodeView.x = position[0]
                nodeView.y = position[1]
              }
            })
            return state
          })
        },
        updateNodePositions(networkId, positions) {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList === undefined) {
              return state
            }

            viewList.forEach((networkView: NetworkView) => {
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

            return state
          })
        },
        deleteObjects(networkId, ids) {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList === undefined) {
              return state
            }

            viewList.forEach((networkView: NetworkView) => {
              const nodeViews: Record<IdType, NodeView> = networkView.nodeViews
              const edgeViews: Record<IdType, EdgeView> = networkView.edgeViews

              ids.forEach((id) => {
                if (nodeViews[id] !== undefined) {
                  delete nodeViews[id]
                } else {
                  delete edgeViews[id]
                }
              })
            })
            return state
          })
        },
        delete(networkId) {
          set((state) => {
            delete state.viewModels[networkId]

            void deleteNetworkViewsFromDb(networkId).then(() => {
              console.log('Network view deleted from db')
            })

            return state
          })
        },
        deleteAll() {
          set((state) => {
            state.viewModels = {}
            void clearNetworkViewsFromDb().then(() => {
              console.log('Cleared views')
            })
            return state
          })
        },
      })),
    ),
  ),
)
