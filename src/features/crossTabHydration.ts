import {
  getFilterFromDb,
  getNetworkFromDb,
  getNetworkSummaryFromDb,
  getNetworkViewsFromDb,
  getOpaqueAspectsFromDb,
  getTablesFromDb,
  getUiStateFromDb,
  getUndoRedoStackFromDb,
  getVisualStyleFromDb,
  getWorkspaceFromDb,
} from '../data/db'
import { useFilterStore } from '../data/hooks/stores/FilterStore'
import { setHydrating } from '../data/hooks/stores/hydrationContext'
import { useNetworkStore } from '../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../data/hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../data/hooks/stores/OpaqueAspectStore'
import { useTableStore } from '../data/hooks/stores/TableStore'
import { useUiStateStore } from '../data/hooks/stores/UiStateStore'
import { useUndoStore } from '../data/hooks/stores/UndoStore'
import { useViewModelStore } from '../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../data/hooks/stores/WorkspaceStore'
import { logUi } from '../debug'

interface DbChange {
  type: number // 1: CREATED, 2: UPDATED, 3: DELETED
  table: string
  key: any
}

export const hydrateFromCrossTabChange = async (
  changes: DbChange[],
): Promise<void> => {
  setHydrating(true)
  try {
    for (const change of changes) {
      const { type, table, key } = change

      // We only log if debug is needed, otherwise keep it quiet to avoid spam.
      // logUi.info(`[Hydration] Syncing table ${table} key ${key} type ${type}`)

      switch (table) {
        case 'workspace':
          if (type === 1 || type === 2) {
            const ws = await getWorkspaceFromDb(key)
            if (ws) {
              const localWs = useWorkspaceStore.getState().workspace
              
              // CW-XXX: Preserve local navigation state across tabs so tabs don't
              // automatically switch networks when another tab switches.
              const isLocalNetworkStillValid = ws.networkIds.includes(localWs.currentNetworkId)
              const safeCurrentNetworkId = isLocalNetworkStillValid 
                ? localWs.currentNetworkId 
                : ws.currentNetworkId

              useWorkspaceStore.getState().set({
                ...ws,
                currentNetworkId: safeCurrentNetworkId
              })
            }
          } else if (type === 3) {
            // Usually we don't delete the workspace row entirely from under the user
          }
          break

        case 'cyNetworks':
          if (type === 1 || type === 2) {
            const net = await getNetworkFromDb(key)
            if (net) {
              useNetworkStore.getState().add(net)
            }
          } else if (type === 3) {
            useNetworkStore.getState().delete(key)
          }
          break

        case 'cyNetworkViews':
          if (type === 1 || type === 2) {
            const views = await getNetworkViewsFromDb(key)
            if (views) {
              views.forEach((view) => {
                useViewModelStore.getState().add(key, view)
              })
            }
          } else if (type === 3) {
            useViewModelStore.getState().delete(key)
          }
          break

        case 'cyVisualStyles':
          if (type === 1 || type === 2) {
            const style = await getVisualStyleFromDb(key)
            if (style) {
              useVisualStyleStore.getState().add(key, style)
            }
          } else if (type === 3) {
            useVisualStyleStore.getState().delete(key)
          }
          break

        case 'cyTables':
          if (type === 1 || type === 2) {
            const tables = await getTablesFromDb(key)
            if (tables) {
              useTableStore
                .getState()
                .add(key, tables.nodeTable, tables.edgeTable)
            }
          } else if (type === 3) {
            useTableStore.getState().delete(key)
          }
          break

        case 'summaries':
          if (type === 1 || type === 2) {
            const summary = await getNetworkSummaryFromDb(key)
            if (summary) {
              useNetworkSummaryStore.getState().add(key, summary)
            }
          } else if (type === 3) {
            useNetworkSummaryStore.getState().delete(key)
          }
          break

        case 'uiState':
          if (type === 1 || type === 2) {
            const ui = await getUiStateFromDb()
            if (ui) {
              const localUi = useUiStateStore.getState().ui
              const networkIds = useWorkspaceStore.getState().workspace.networkIds
              
              const isLocalNetworkStillValid = networkIds.includes(localUi.activeNetworkView)
              const safeActiveNetworkView = isLocalNetworkStillValid 
                ? localUi.activeNetworkView 
                : ui.activeNetworkView

              useUiStateStore.getState().setUi({
                ...ui,
                activeNetworkView: safeActiveNetworkView,
                panels: localUi.panels, // Keep side panels independent per tab
                tableUi: {
                  ...ui.tableUi,
                  activeTabIndex: localUi.tableUi.activeTabIndex, // Keep table tab local
                },
                networkBrowserPanelUi: {
                  ...ui.networkBrowserPanelUi,
                  activeTabIndex: localUi.networkBrowserPanelUi.activeTabIndex, // Keep left panel tab local
                },
                networkViewUi: {
                  ...ui.networkViewUi,
                  activeTabIndex: localUi.networkViewUi.activeTabIndex, // Keep network canvas tab local
                },
                enablePopup: localUi.enablePopup,
                showErrorDialog: localUi.showErrorDialog,
                errorMessage: localUi.errorMessage,
              })
            }
          }
          break

        case 'filters':
          if (type === 1 || type === 2) {
            const filter = await getFilterFromDb(key)
            if (filter) {
              useFilterStore.getState().updateFilterConfig(key, filter)
            }
          } else if (type === 3) {
            useFilterStore.getState().deleteFilterConfig(key)
          }
          break

        case 'opaqueAspects':
          if (type === 1 || type === 2) {
            const aspectsDb = await getOpaqueAspectsFromDb(key)
            if (aspectsDb) {
              const aspectList = Object.entries(aspectsDb.aspects).map(
                ([k, v]) => ({ [k]: v }),
              )
              useOpaqueAspectStore.getState().addAll(key, aspectList)
            }
          } else if (type === 3) {
            useOpaqueAspectStore.getState().delete(key)
          }
          break

        case 'undoStacks':
          if (type === 1 || type === 2) {
            const stack = await getUndoRedoStackFromDb(key)
            if (stack) {
              useUndoStore.getState().setUndoStack(key, stack.undoRedoStack.undoStack)
              useUndoStore.getState().setRedoStack(key, stack.undoRedoStack.redoStack)
            }
          } else if (type === 3) {
            useUndoStore.getState().deleteStack(key)
          }
          break

        default:
          break
      }
    }
  } catch (error) {
    logUi.error('[Hydration] Error during cross-tab hydration', error)
  } finally {
    setHydrating(false)
  }
}
