import {
  create,
  // StateCreator,
  //  StoreApi
} from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../models/IdType'
import { Ui } from '../models/UiModel'
import { PanelState } from '../models/UiModel/PanelState'
import { Panel } from '../models/UiModel/Panel'

// import { putUiStateToDb } from './persist/db'
import { TableUIState } from '../models/UiModel/TableUi'
import { putUiStateToDb } from './persist/db'

interface UiState {
  ui: Ui
}

interface UiStateAction {
  setUi: (ui: Ui) => void
  setActiveNetworkView: (id: IdType) => void
  setPanelState: (panel: Panel, state: PanelState) => void
  enablePopup: (enable: boolean) => void
  setShowErrorDialog: (show: boolean) => void
  setErrorMessage: (message: string) => void
}

type UiStateStore = UiState & UiStateAction

export const DEFAULT_UI_STATE = {
  panels: {
    [Panel.LEFT]: PanelState.CLOSED,
    [Panel.RIGHT]: PanelState.CLOSED,
    [Panel.BOTTOM]: PanelState.CLOSED,
  },
  activeNetworkView: '',
  enablePopup: false,
  showErrorDialog: false,
  errorMessage: '',
  tableUi: {
    columnUiState: {},
    activeTabIndex: 0,
  },
}

export const useUiStateStore = create(
  immer<UiStateStore>((set, get) => ({
    ui: DEFAULT_UI_STATE,
    setUi: (ui: Ui) => {
      set((state) => {
        // console.log('setting ui', ui)
        // console.log('TABLE')
        // console.log(get(), state)
        state.ui = ui
        void putUiStateToDb(ui)
        return state
      })
    },
    setActiveNetworkView: (id: IdType) => {
      set((state) => {
        state.ui.activeNetworkView = id

        const newUi = { ...get().ui, activeNetworkView: id }
        void putUiStateToDb(newUi)
        return state
      })
    },
    setPanelState: (panel: Panel, panelState: PanelState) => {
      set((state) => {
        state.ui.panels[panel] = panelState
        const newPanelState = { ...get().ui.panels, [panel]: panelState }
        const newUi = { ...get().ui, panels: newPanelState }
        void putUiStateToDb(newUi)
        return state
      })
    },
    enablePopup: (enable: boolean) => {
      set((state) => {
        state.ui.enablePopup = enable
        return state
      })
    },
    setShowErrorDialog: (show: boolean) => {
      set((state) => {
        state.ui.showErrorDialog = show

        // Clear error message when the dialog is closed
        if (!show) {
          state.ui.errorMessage = ''
        }
        return state
      })
    },
    setErrorMessage: (message: string) => {
      set((state) => {
        state.ui.errorMessage = message
        return state
      })
    },
    setTableState: (tableUiState: TableUIState) => {
      set((state) => {
        state.ui.tableUi = tableUiState
        return state
      })
    },
  })),
)
