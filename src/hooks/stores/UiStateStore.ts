import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { putUiStateToDb } from '../../db'
import { IdType } from '../../models/IdType'
import { TableType } from '../../models/StoreModel/TableStoreModel'
import { UiStateStore } from '../../models/StoreModel/UiStateStoreModel'
import { Ui } from '../../models/UiModel'
import * as UiImpl from '../../models/UiModel/impl/uiImpl'
import { Panel } from '../../models/UiModel/Panel'
import { PanelState } from '../../models/UiModel/PanelState'
import { TableUIState } from '../../models/UiModel/TableUi'
import {
  TableDisplayConfiguration,
  VisualStyleOptions,
} from '../../models/VisualStyleModel/VisualStyleOptions'

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
  immer<UiStateStore>((set, get) => ({
    ui: DEFAULT_UI_STATE,
    setUi: (ui: Ui) => {
      set((state) => {
        state.ui = ui
        void putUiStateToDb(ui)
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

        void putUiStateToDb(nextUi)

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

        void putUiStateToDb(nextUi)

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

        void putUiStateToDb(nextUi)

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

        void putUiStateToDb(nextUi)

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

        void putUiStateToDb(nextUi)

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
  })),
)
