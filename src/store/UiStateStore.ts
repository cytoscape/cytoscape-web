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

import { TableType } from './TableStore'
// import { AttributeName } from '../models/TableModel'
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
  setColumnWidth: (
    networkId: IdType,
    tableType: TableType,
    columnId: string,
    width: number,
  ) => void
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

export const serializeColumnUIKey = (
  str1: string,
  str2: string,
  str3: string,
  delimiter: string = '|',
): string => {
  const serializedStr1 = `${str1.length}${delimiter}${str1}`
  const serializedStr2 = `${str2.length}${delimiter}${str2}`
  const serializedStr3 = `${str3.length}${delimiter}${str3}`

  return [serializedStr1, serializedStr2, serializedStr3].join(delimiter)
}

export const deserializeColumnUIKey = (
  serializedStr: string,
  delimiter: string = '|',
): [string, string, string] => {
  const parts = serializedStr.split(delimiter)

  const str1Len = parseInt(parts[0], 10)
  const str1 = parts[1].substr(0, str1Len)

  const str2Len = parseInt(parts[2], 10)
  const str2 = parts[3].substr(0, str2Len)

  const str3Len = parseInt(parts[4], 10)
  const str3 = parts[5].substr(0, str3Len)

  return [str1, str2, str3]
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
        return state
      })
    },
    setPanelState: (panel: Panel, panelState: PanelState) => {
      set((state) => {
        state.ui.panels[panel] = panelState
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
    setColumnWidth: (
      networkId: IdType,
      tableType: TableType,
      columnId: string,
      width: number,
    ) => {
      set((state) => {
        const key = serializeColumnUIKey(networkId, tableType, columnId)
        const nextColumnUiState = {
          ...get().ui.tableUi.columnUiState,
          [key]: { width },
        }
        const nextTableUiState = {
          ...get().ui.tableUi,
          columnUiState: nextColumnUiState,
        }
        const nextUi = { ...get().ui, tableUi: nextTableUiState }

        void putUiStateToDb(nextUi)

        state.ui.tableUi.columnUiState[key] = { width }

        return state
      })
    },
  })),
)
