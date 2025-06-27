import { IdType } from '../models/IdType'
import { EdgeView, NetworkView, NodeView } from '../models/ViewModel'
import { isEdgeId } from '../models/NetworkModel/impl/CyNetwork'
import { create, StateCreator, StoreApi } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import {
  clearNetworkViewsFromDb,
  deleteNetworkViewsFromDb,
  putNetworkViewToDb,
  putNetworkViewsToDb,
} from './persist/db'
import { useWorkspaceStore } from './WorkspaceStore'
import { ViewModelStore } from '../models/StoreModel/ViewModelStoreModel'

// Default view type (a node-link diagram)
export const DEF_VIEW_TYPE = 'nodeLink'

/**
 * Create a new view ID for a network view.
 *
 * @param newView
 * @param views
 * @returns
 */
export const getNetworkViewId = (
  newView: NetworkView,
  views: NetworkView[],
): IdType => {
  let { type } = newView
  const { id } = newView
  if (type === undefined) {
    type = DEF_VIEW_TYPE
  }
  const prefix = `${id}-${type}`
  const existingIds: string[] = []

  views.forEach((view: NetworkView) => {
    const viewId: string = view.viewId ?? ''
    if (viewId.startsWith(prefix)) {
      existingIds.push(viewId)
    }
  })

  return `${id}-${type}-${existingIds.length + 1}`
}

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
            // Should be a defined object
            if (networkView === undefined) {
              throw new Error('Cannot add view model: networkView is undefined')
            } else {
              // Validate the view model
              // const viewModelId: string = networkView.id
              const viewId: string = networkView.viewId ?? ''
              let viewModelType: string = networkView.type ?? ''
              if (viewModelType === '') {
                networkView.type = DEF_VIEW_TYPE
                viewModelType = DEF_VIEW_TYPE
              }

              if (viewId === '') {
                networkView.viewId = getNetworkViewId(
                  networkView,
                  state.viewModels[networkId] ?? [],
                )
              }

              // Check if the view model already exists
              const existingViewModel: NetworkView | undefined =
                state.viewModels[networkId]?.find(
                  (viewModel) => viewModel.viewId === networkView.viewId,
                )
              if (existingViewModel !== undefined) {
                // Replace the existing one if it already exists, but preserve selection state
                const index =
                  state.viewModels[networkId]?.indexOf(existingViewModel)
                // Preserve existing selection state
                networkView.selectedNodes = existingViewModel.selectedNodes
                networkView.selectedEdges = existingViewModel.selectedEdges
                state.viewModels[networkId][index] = networkView
                return state
              }
            }

            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList !== undefined) {
              viewList.push(networkView)
            } else {
              state.viewModels[networkId] = [networkView]
            }

            const viewType = networkView.type
            if (viewType !== 'circlePacking') {
              // Store only default view type (node-link diagram) only.
              void putNetworkViewToDb(networkId, networkView).then(() => {
                console.debug('Network view model added to the DB.', networkId)
              })
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

            // // Check if selection actually changed to avoid unnecessary updates
            // const currentView = viewList[0]
            // if (currentView) {
            //   const nodesEqual =
            //     currentView.selectedNodes.length === selectedNodes.length &&
            //     currentView.selectedNodes.every((id) =>
            //       selectedNodes.includes(id),
            //     )

            //   const edgesEqual =
            //     currentView.selectedEdges.length === selectedEdges.length &&
            //     currentView.selectedEdges.every((id) =>
            //       selectedEdges.includes(id),
            //     )

            //   // If selection hasn't changed, don't create new objects
            //   if (nodesEqual && edgesEqual) {
            //     return state
            //   }
            // }

            const newViewList: NetworkView[] = []
            viewList.forEach((view: NetworkView) => {
              const newView = { ...view }
              newView.selectedNodes = selectedNodes
              newView.selectedEdges = selectedEdges
              newViewList.push(newView)
            })
            state.viewModels[networkId] = newViewList
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
              const selectedNodesSet = new Set(networkView.selectedNodes)
              const selectedEdgesSet = new Set(networkView.selectedEdges)

              for (let i = 0; i < eles.length; i++) {
                const eleId = eles[i]
                if (isEdgeId(eleId)) {
                  selectedEdgesSet.add(eleId)
                } else {
                  selectedNodesSet.add(eleId)
                }
              }

              networkView.selectedNodes = Array.from(selectedNodesSet)
              networkView.selectedEdges = Array.from(selectedEdgesSet)
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
              const selectedNodesSet = new Set(networkView.selectedNodes)
              const selectedEdgesSet = new Set(networkView.selectedEdges)

              for (let i = 0; i < eles.length; i++) {
                const eleId = eles[i]
                if (isEdgeId(eleId)) {
                  selectedEdgesSet.delete(eleId)
                } else {
                  selectedNodesSet.delete(eleId)
                }
              }
              networkView.selectedNodes = Array.from(selectedNodesSet)
              networkView.selectedEdges = Array.from(selectedEdgesSet)
            })
            return state
          })
        },
        setNodePosition(networkId, eleId, position, targetViewId) {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList === undefined) {
              return state
            }

            viewList.forEach((networkView: NetworkView) => {
              const nodeView: NodeView = networkView.nodeViews[eleId]
              if (nodeView !== null && nodeView !== undefined) {
                const newNodeView = {
                  ...nodeView,
                  x: position[0],
                  y: position[1],
                }
                networkView.nodeViews[eleId] = newNodeView
              }
            })
            return state
          })
        },
        updateNodePositions(networkId, positions, targetViewId) {
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
        delete(networkId, targetViewId?) {
          void deleteNetworkViewsFromDb(networkId).then(() => {})
          set((state) => {
            delete state.viewModels[networkId]
            return state
          })
        },
        deleteAll() {
          void clearNetworkViewsFromDb().then(() => {})
          set((state) => {
            state.viewModels = {}
            return state
          })
        },

        // Update actions for individual nodes and edges to a network

        addNodeView(networkId: IdType, nodeView: NodeView) {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList === undefined) {
              return state
            }

            viewList.forEach((networkView: NetworkView) => {
              networkView.nodeViews[nodeView.id] = nodeView
            })
            return state
          })
        },

        addNodeViews(networkId: IdType, nodeViews: NodeView[]) {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList === undefined) {
              return state
            }

            viewList.forEach((networkView: NetworkView) => {
              nodeViews.forEach((nodeView) => {
                networkView.nodeViews[nodeView.id] = nodeView
              })
            })
            return state
          })
        },

        addEdgeView(networkId, edgeView) {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList === undefined) {
              return state
            }

            viewList.forEach((networkView: NetworkView) => {
              networkView.edgeViews[edgeView.id] = edgeView
            })
            return state
          })
        },

        addEdgeViews(networkId, edgeViews) {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList === undefined) {
              return state
            }

            viewList.forEach((networkView: NetworkView) => {
              edgeViews.forEach((edgeView) => {
                networkView.edgeViews[edgeView.id] = edgeView
              })
            })
            return state
          })
        },

        // Deletion
        deleteNodeViews(networkId: string, nodeIds: IdType[]) {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList === undefined) {
              return state
            }

            // Delete the specified nodes from all view models
            viewList.forEach((networkView: NetworkView) => {
              const nodeViews: Record<IdType, NodeView> = networkView.nodeViews
              nodeIds.forEach((id) => {
                delete nodeViews[id]
              })
            })
            return state
          })
        },
        deleteEdgeViews(networkId, edgeIds) {
          set((state) => {
            const viewList: NetworkView[] | undefined =
              state.viewModels[networkId]
            if (viewList === undefined) {
              return state
            }

            viewList.forEach((networkView: NetworkView) => {
              const edgeViews: Record<IdType, EdgeView> = networkView.edgeViews
              edgeIds.forEach((edgeId) => {
                delete edgeViews[edgeId]
              })
            })
            return state
          })
        },
      })),
    ),
  ),
)
