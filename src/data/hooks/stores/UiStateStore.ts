/**
 * @deprecated The Module Federation exposure of this store (cyweb/UiStateStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/UiStateStore Module Federation export will be removed after 2 release cycles.
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { IdType } from '../../../models/IdType'
import { TableType } from '../../../models/StoreModel/TableStoreModel'
import { UiStateStore } from '../../../models/StoreModel/UiStateStoreModel'
import { Ui } from '../../../models/UiModel'
import * as UiImpl from '../../../models/UiModel/impl/uiImpl'
import { Panel } from '../../../models/UiModel/Panel'
import { PanelState } from '../../../models/UiModel/PanelState'
import { TableUIState } from '../../../models/UiModel/TableUi'
import {
  TableDisplayConfiguration,
  VisualStyleOptions,
} from '../../../models/VisualStyleModel/VisualStyleOptions'
import {
  saveTabViewState,
  withoutTabViewState,
} from '../../../features/tabViewState'
import { putUiStateToDb } from '../../db'
import { toPlainObject } from '../../db/serialization'
import { isHydrating } from './hydrationContext'

/**
 * Persist UI state, splitting it by ownership.
 *
 * Per-tab view state (panels, active tab indices, transient dialogs) goes to
 * this tab's sessionStorage; only genuinely shared fields — column widths,
 * visual style options, custom tab names — reach the IndexedDB row that all
 * tabs read. See `src/features/tabViewState.ts` for why the split lives here
 * rather than in the cross-tab hydration path.
 */
const persistUiState = (ui: Ui) => {
  saveTabViewState(ui)
  if (!isHydrating()) {
    void putUiStateToDb(toPlainObject(withoutTabViewState(ui)))
  }
}

export const DEFAULT_UI_STATE = {
  panels: {
    [Panel.LEFT]: PanelState.OPEN,
    [Panel.RIGHT]: PanelState.CLOSED,
    [Panel.BOTTOM]: PanelState.OPEN,
  },
  activeNetworkView: '',
  enablePopup: false,
  showErrorDialog: false,
  errorMessage: '',
  tableUi: {
    columnUiState: {},
    activeTabIndex: 0,
  },
  networkBrowserPanelUi: {
    activeTabIndex: 0,
  },
  visualStyleOptions: {},
  networkViewUi: {
    activeTabIndex: 0,
  },
}

// Re-export for compatibility
export const serializeColumnUIKey = UiImpl.serializeColumnUIKey
export const deserializeColumnUIKey = UiImpl.deserializeColumnUIKey

export const useUiStateStore = create(
  immer<UiStateStore>((set) => ({
    ui: DEFAULT_UI_STATE,
    setUi: (ui: Ui) => {
      set((state) => {
        state.ui = ui
        // Convert Immer proxy to plain object before saving
        persistUiState(ui)
        return state
      })
    },
    setActiveNetworkView: (id: IdType) => {
      set((state) => {
        state.ui = UiImpl.setActiveNetworkView(state.ui, id)
        return state
      })
    },
    setPanelState: (panel: Panel, panelState: PanelState) => {
      set((state) => {
        state.ui = UiImpl.setPanelState(state.ui, panel, panelState)
        return state
      })
    },
    enablePopup: (enable: boolean) => {
      set((state) => {
        state.ui = UiImpl.enablePopup(state.ui, enable)
        return state
      })
    },
    setShowErrorDialog: (show: boolean) => {
      set((state) => {
        state.ui = UiImpl.setShowErrorDialog(state.ui, show)
        return state
      })
    },
    setErrorMessage: (message: string) => {
      set((state) => {
        state.ui = UiImpl.setErrorMessage(state.ui, message)
        return state
      })
    },
    setActiveTableBrowserIndex: (index: number) => {
      set((state) => {
        state.ui = UiImpl.setActiveTableBrowserIndex(state.ui, index)
        return state
      })
    },
    setNetworkViewTabIndex: (index: number) => {
      set((state) => {
        state.ui = UiImpl.setNetworkViewTabIndex(state.ui, index)
        return state
      })
    },
    setActiveNetworkBrowserPanelIndex: (index: number) => {
      set((state) => {
        state.ui = UiImpl.setActiveNetworkBrowserPanelIndex(state.ui, index)
        return state
      })
    },
    setTableState: (tableUiState: TableUIState) => {
      set((state) => {
        state.ui = UiImpl.setTableState(state.ui, tableUiState)
        return state
      })
    },
    setColumnWidth: (
      networkId: IdType,
      tableType: TableType,
      columnId: string,
      width: number,
    ) => {
      set((state) => {
        const nextUi = UiImpl.setColumnWidth(
          state.ui,
          networkId,
          tableType,
          columnId,
          width,
        )

        // Convert Immer proxy to plain object before saving
        persistUiState(nextUi)

        state.ui = nextUi
        return state
      })
    },
    setVisualStyleOptions: (
      networkId: IdType,
      visualStyleOptions?: VisualStyleOptions,
    ) => {
      set((state) => {
        const nextUi = UiImpl.setVisualStyleOptions(
          state.ui,
          networkId,
          visualStyleOptions,
        )

        // Convert Immer proxy to plain object before saving
        persistUiState(nextUi)

        state.ui = nextUi
        return state
      })
    },
    setNodeSizeLockedState(networkId, nodeSizeLocked) {
      set((state) => {
        const nextUi = UiImpl.setNodeSizeLockedState(
          state.ui,
          networkId,
          nodeSizeLocked,
        )

        // Convert Immer proxy to plain object before saving
        persistUiState(nextUi)

        state.ui = nextUi
        return state
      })
    },
    setArrowColorMatchesEdgeState(networkId, arrowColorMatchesEdge) {
      set((state) => {
        const nextUi = UiImpl.setArrowColorMatchesEdgeState(
          state.ui,
          networkId,
          arrowColorMatchesEdge,
        )

        // Convert Immer proxy to plain object before saving
        persistUiState(nextUi)

        state.ui = nextUi
        return state
      })
    },
    setTableDisplayConfiguration(
      networkId,
      tableDisplayConfiguration: TableDisplayConfiguration,
    ) {
      set((state) => {
        const nextUi = UiImpl.setTableDisplayConfiguration(
          state.ui,
          networkId,
          tableDisplayConfiguration,
        )

        // Convert Immer proxy to plain object before saving
        persistUiState(nextUi)

        state.ui = nextUi
        return state
      })
    },
    setCustomNetworkTabName: (rendererId: IdType, name: string) => {
      set((state) => {
        state.ui = UiImpl.setCustomNetworkTabName(state.ui, rendererId, name)
        return state
      })
    },
    // Remove per-network UI state when a network is deleted. Both
    // visualStyleOptions and columnUiState are persisted via putUiStateToDb,
    // so skipping this left orphaned rows in IndexedDB forever
    // (REVIEW.md round-2 P2, called from the delete orchestrator).
    // UiImpl.deleteNetworkUiState handles the serialized composite
    // columnUiState keys correctly.
    deleteNetworkUiState: (networkId: IdType) => {
      set((state) => {
        const nextUi = UiImpl.deleteNetworkUiState(state.ui, networkId)

        // Convert Immer proxy to plain object before saving
        persistUiState(nextUi)

        state.ui = nextUi
        return state
      })
    },
    deleteAllNetworkUiState: () => {
      set((state) => {
        const nextUi = {
          ...state.ui,
          visualStyleOptions: {},
          tableUi: { ...state.ui.tableUi, columnUiState: {} },
          activeNetworkView: '',
        }

        // Convert Immer proxy to plain object before saving
        persistUiState(nextUi)

        state.ui = nextUi
        return state
      })
    },
  })),
)
