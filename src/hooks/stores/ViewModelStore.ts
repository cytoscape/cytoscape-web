import { create, StateCreator, StoreApi } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import {
  clearNetworkViewsFromDb,
  deleteNetworkViewsFromDb,
  putNetworkViewsToDb,
  putNetworkViewToDb,
} from '../../db'
import { logStore } from '../../debug'
import { IdType } from '../../models/IdType'
import { ViewModelStore } from '../../models/StoreModel/ViewModelStoreModel'
import { EdgeView, NetworkView, NodeView } from '../../models/ViewModel'
import * as ViewModelImpl from '../../models/ViewModel/impl/viewModelImpl'
import { useWorkspaceStore } from './WorkspaceStore'

// Re-export for compatibility
export const DEF_VIEW_TYPE = ViewModelImpl.DEF_VIEW_TYPE
export const getNetworkViewId = ViewModelImpl.getNetworkViewId

const persist =
  (config: StateCreator<ViewModelStore>) =>
  (
    set: StoreApi<ViewModelStore>['setState'],
    get: StoreApi<ViewModelStore>['getState'],
    api: StoreApi<ViewModelStore>,
  ) =>
    config(
      async (args) => {
        logStore.info('[ViewModelStore]: Persisting view model store')
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
                networkView.type = ViewModelImpl.DEF_VIEW_TYPE
                viewModelType = ViewModelImpl.DEF_VIEW_TYPE
              }

              if (viewId === '') {
                networkView.viewId = ViewModelImpl.getNetworkViewId(
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
              void putNetworkViewToDb(networkId, networkView).then(() => {})
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

            state.viewModels[networkId] = viewList.map((view: NetworkView) =>
              ViewModelImpl.exclusiveSelect(view, selectedNodes, selectedEdges),
            )
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

            state.viewModels[networkId] = viewList.map(
              (networkView: NetworkView) =>
                ViewModelImpl.toggleSelected(networkView, eles),
            )
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

            state.viewModels[networkId] = viewList.map(
              (networkView: NetworkView) =>
                ViewModelImpl.additiveSelect(networkView, eles),
            )
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

            state.viewModels[networkId] = viewList.map(
              (networkView: NetworkView) =>
                ViewModelImpl.additiveUnselect(networkView, eles),
            )
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

            state.viewModels[networkId] = viewList.map(
              (networkView: NetworkView) =>
                ViewModelImpl.setNodePosition(networkView, eleId, position),
            )
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

            state.viewModels[networkId] = viewList.map(
              (networkView: NetworkView) =>
                ViewModelImpl.updateNodePositions(networkView, positions),
            )
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

            state.viewModels[networkId] = viewList.map(
              (networkView: NetworkView) =>
                ViewModelImpl.deleteObjects(networkView, ids),
            )
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

            state.viewModels[networkId] = viewList.map(
              (networkView: NetworkView) =>
                ViewModelImpl.addNodeViewDirect(networkView, nodeView),
            )
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

            state.viewModels[networkId] = viewList.map(
              (networkView: NetworkView) =>
                ViewModelImpl.addNodeViewsToModel(networkView, nodeViews),
            )
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

            state.viewModels[networkId] = viewList.map(
              (networkView: NetworkView) =>
                ViewModelImpl.addEdgeViewDirect(networkView, edgeView),
            )
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

            state.viewModels[networkId] = viewList.map(
              (networkView: NetworkView) =>
                ViewModelImpl.addEdgeViewsToModel(networkView, edgeViews),
            )
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

            state.viewModels[networkId] = viewList.map(
              (networkView: NetworkView) =>
                ViewModelImpl.deleteNodeViews(networkView, nodeIds),
            )
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

            state.viewModels[networkId] = viewList.map(
              (networkView: NetworkView) =>
                ViewModelImpl.deleteEdgeViews(networkView, edgeIds),
            )
            return state
          })
        },
      })),
    ),
  ),
)
