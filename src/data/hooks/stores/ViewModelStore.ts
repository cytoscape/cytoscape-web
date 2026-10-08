/**
 * @deprecated The Module Federation exposure of this store (cyweb/ViewModelStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/ViewModelStore Module Federation export will be removed after 2 release cycles.
 */
import { create, StateCreator } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { logStore } from '../../../debug'
import { IdType } from '../../../models/IdType'
import { ViewModelStore } from '../../../models/StoreModel/ViewModelStoreModel'
import { NetworkView, NodeView } from '../../../models/ViewModel'
import * as ViewModelImpl from '../../../models/ViewModel/impl/viewModelImpl'
import {
  clearNetworkViewsFromDb,
  deleteNetworkViewsFromDb,
  putNetworkViewsToDb,
  putViewSelectionToDb,
} from '../../db'
import { isHydrating } from './hydrationContext'
import { persistNetworkSlices } from './persistNetworkSlices'
import { scheduleWrite } from './persistenceScheduler'

// Re-export for compatibility
export const DEF_VIEW_TYPE = ViewModelImpl.DEF_VIEW_TYPE
export const getNetworkViewId = ViewModelImpl.getNetworkViewId

/**
 * Selection is shared across tabs but stored in its own row (DB v11).
 *
 * Keeping it inside the view row made every click rewrite the full view model —
 * node positions and all — and, once cross-tab sync landed, made every other tab
 * replace its entire view model in response. Writing it separately keeps the
 * view row byte-identical on a selection change, so dexie-observable records no
 * change for it and peers hydrate only the two id arrays.
 *
 * Reuses the shared 300ms write coalescer, so a burst of clicks is one write.
 *
 * See {@link selectionOnlySet} for the other half: suppressing the generic
 * view-row write these actions would otherwise trigger.
 */

/**
 * True while one of the four selection actions is running its `set`.
 *
 * The selection actions mutate `viewModels`, so the generic `persistNetworkSlices`
 * middleware below sees a new slice reference and schedules a full
 * `putNetworkViewsToDb` — node positions and all. `withoutSelection` makes that
 * row byte-identical, so no peer tab hydrates it, but the write still happens on
 * every click. This flag turns it off; `persistSelection` covers these actions.
 *
 * Safe as a module-level flag because Zustand `set` is synchronous: it is only
 * ever true inside the try block below, never across an await.
 */
let selectionOnlySet = false

const setSelection = (mutate: () => void): void => {
  selectionOnlySet = true
  try {
    mutate()
  } finally {
    selectionOnlySet = false
  }
}

const persistSelection = (networkId: IdType): void => {
  if (isHydrating()) {
    return
  }
  scheduleWrite(`ViewSelection:${networkId}`, 'ViewModelStore', () => {
    const views = useViewModelStore.getState().viewModels[networkId]
    const view = views?.find((v) => v.type !== 'circlePacking') ?? views?.[0]
    if (view === undefined) {
      return Promise.resolve()
    }
    return putViewSelectionToDb(networkId, {
      selectedNodes: [...(view.selectedNodes ?? [])],
      selectedEdges: [...(view.selectedEdges ?? [])],
    })
  })
}

/**
 * Drop selection from a view before it is written to `cyNetworkViews`.
 *
 * Emitting empty arrays rather than omitting the keys keeps the row's shape
 * stable, so a selection-only change produces an identical row and therefore no
 * cross-tab change record.
 */
const withoutSelection = (view: NetworkView): NetworkView => ({
  ...view,
  selectedNodes: [],
  selectedEdges: [],
})

const persist = (config: StateCreator<ViewModelStore>) =>
  persistNetworkSlices<ViewModelStore, NetworkView[]>(config, {
    label: 'ViewModelStore',
    selectSlices: (state) => state.viewModels,
    putSlice: (networkId, views) => {
      // Store only default view types (node-link diagram); circlePacking
      // views are derived and must never reach IndexedDB
      const persistable = views
        .filter((view) => view.type !== 'circlePacking')
        .map(withoutSelection)
      if (persistable.length === 0) {
        return Promise.resolve()
      }
      return putNetworkViewsToDb(networkId, persistable)
    },
    skipPersist: () => selectionOnlySet,
  })

export const useViewModelStore = create(
  subscribeWithSelector(
    immer<ViewModelStore>(
      persist((set) => ({
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
                // Replace the existing one if it already exists, but always
                // carry selection over. Selection has its own row since v11, so
                // a view arriving from the DB (or from another tab's change)
                // carries empty arrays — adopting those would silently clear the
                // user's selection. Cross-tab selection updates arrive through
                // the `viewSelections` hydration case instead.
                const index =
                  state.viewModels[networkId]?.indexOf(existingViewModel)
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
          // Match on viewId: view.id is the NETWORK id, identical for every
          // view of the network, so matching on it could never address a
          // specific secondary view (REVIEW.md round-2 P2)
          return viewList.find((view) => view.viewId === viewModelId)
        },

        exclusiveSelect: (
          networkId: IdType,
          selectedNodes: IdType[],
          selectedEdges: IdType[],
        ) => {
          setSelection(() => {
            set((state) => {
              const viewList: NetworkView[] | undefined =
                state.viewModels[networkId]
              if (viewList === undefined) {
                return state
              }

              state.viewModels[networkId] = viewList.map((view: NetworkView) =>
                ViewModelImpl.exclusiveSelect(
                  view,
                  selectedNodes,
                  selectedEdges,
                ),
              )
              return state
            })
          })
          persistSelection(networkId)
        },
        toggleSelected: (networkId: IdType, eles: IdType[]) => {
          setSelection(() => {
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
          })
          persistSelection(networkId)
        },

        // select elements without unselecing anything else
        additiveSelect: (networkId: IdType, eles: IdType[]) => {
          setSelection(() => {
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
          })
          persistSelection(networkId)
        },

        // unselect elements without selecting anything else
        additiveUnselect: (networkId: IdType, eles: IdType[]) => {
          setSelection(() => {
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
          })
          persistSelection(networkId)
        },
        setNodePosition(networkId, eleId, position) {
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
        updateNodePositions(networkId, positions) {
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
        delete(networkId) {
          // Skip during cross-tab hydration: the peer tab already deleted this
          // row, so re-deleting it locally only mints another change record.
          if (!isHydrating()) {
            void deleteNetworkViewsFromDb(networkId)
              .then(() => {
                logStore.info(
                  `[ViewModelStore]: Deleted network views from db: ${networkId}`,
                )
              })
              .catch((e) => {
                logStore.error(
                  `[ViewModelStore]: Failed to delete network views from db: ${networkId}`,
                  e,
                )
              })
          }
          set((state) => {
            delete state.viewModels[networkId]
            return state
          })
        },
        deleteAll() {
          if (!isHydrating()) {
            void clearNetworkViewsFromDb()
              .then(() => {
                logStore.info('[ViewModelStore]: Deleted all network views')
              })
              .catch((e) => {
                logStore.error(
                  '[ViewModelStore]: Failed to clear network views from db',
                  e,
                )
              })
          }
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
