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

// Default view type (a node-link diagram)
const DEF_VIEW_TYPE = 'nodeLink'

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

interface ViewModelState {
  /**
   * A map of network ID to a list of network view models.
   *
   * The first view model in the list is the primary view model.
   * Optional view models are stored from the second element in the list.
   *
   * In most cases, only the primary view model is used.
   * Optional view models will be used for different visualizations, such as circle packing.
   */
  viewModels: Record<IdType, NetworkView[]>
}

interface ViewModelAction {
  /**
   * Add a new Network View Model to the store.
   * If the network ID already exists, the new view model will be added to the end of the list.
   * If the network ID does not exist, a new list will be created with the new view model.
   *
   * @param networkId The ID of the network model
   * @param networkView The network view model to be added at the end of the list
   */
  add: (networkId: IdType, networkView: NetworkView) => void

  /**
   * Utility function to get the primary (first in the list) network view model
   * of a network if no ID is given
   *
   * @param networkId The ID of the network model
   * @param viewModelName (optional) The name of the view model
   *
   * @returns A network view model
   * */
  getViewModel: (
    networkId: IdType,
    viewModelName?: IdType,
  ) => NetworkView | undefined

  /**
   *
   * Select a new set of nodes and edges. Original selections will be cleared.
   * Selection will be cleared from all of the view models for the given network.
   *
   * @param networkId ID of the network model
   * @param selectedNodes nodes to be selected. Give an empty array to clear the selection.
   * @param selectedEdges edges to be selected. Give an empty array to clear the selection.
   *
   */
  exclusiveSelect: (
    networkId: IdType,
    selectedNodes: IdType[],
    selectedEdges: IdType[],
  ) => void

  /**
   *
   * Select a new set of nodes OR edges. Original selections will be kept.
   * Selection will be applied to all of the view models for the given network.
   *
   * @param networkId ID of the network model
   * @param ids nodes or edges to be selected. Give an empty array to clear the selection.
   */
  additiveSelect: (networkId: IdType, ids: IdType[]) => void

  /**
   *
   * Unselect a set of nodes OR edges. Original selections will be kept.
   * Selection will be applied to all of the view models for the given network.
   *
   * @param networkId ID of the network model
   * @param ids nodes or edges to be unselected. Give an empty array to clear the selection.
   */
  additiveUnselect: (networkId: IdType, ids: IdType[]) => void

  /**
   * Toggle the selection of a set of nodes OR edges.
   * For example, if a node in the ID list is selected, it will be unselected and vice versa.
   * Operation will be applied to all of the view models for the given network.
   *
   * @param networkId ID of the network model
   * @param ids nodes or edges to be toggled. An empty array will do nothing.
   *
   */
  toggleSelected: (networkId: IdType, ids: IdType[]) => void

  /**
   * Set the new position of a node.
   *
   * TODO: how should we handle the case when the network has multiple view models?
   *
   * @param networkId ID of the network model
   * @param nodeId Target node ID
   * @param position New position of the node (x, y). Z is optional.
   * @param targetViewId (optional) ID of the target view model. If not given, the primary (first) view model will be used.
   *
   */
  setNodePosition: (
    networkId: IdType,
    nodeId: IdType,
    position: [number, number, number?],
    targetViewId?: IdType,
  ) => void

  /**
   * Batch updates node positions.
   *
   * TODO: how should we handle the case when the network has multiple view models?
   *
   * @param networkId ID of the network model
   * @param positions A map of node ID to new position (x, y). Z is optional.
   * @param targetViewId (optional) ID of the target view model. If not given, the primary (first) view model will be used.
   */
  updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
    targetViewId?: IdType,
  ) => void

  /**
   * Delete a set of nodes or edges from the view model.
   * Deletion will be applied to all of the view models for the given network.
   *
   * @param networkId ID of the network model
   * @param ids nodes or edges to be deleted
   */
  deleteObjects: (networkId: IdType, ids: IdType[]) => void

  /**
   * Delete a list of network view models.
   * This method will delete the entire list of view models for the given network.
   *
   * @param networkId ID of the network model
   * @param targetViewId (optional) ID of the target view model to be deleted. If not given, all view models will be deleted.
   */
  delete: (networkId: IdType, targetViewId?: IdType) => void

  /**
   * Delete all network view models for all networks.
   */
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
                  (viewModel) =>
                    viewModel.viewId === networkView.viewId,
                )
              if (existingViewModel !== undefined) {
                // Do not add if it already exists
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
      })),
    ),
  ),
)
