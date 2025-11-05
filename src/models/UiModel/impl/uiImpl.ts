import { IdType } from '../../IdType'
import { TableType } from '../../StoreModel/TableStoreModel'
import {
  TableDisplayConfiguration,
  VisualStyleOptions,
} from '../../VisualStyleModel/VisualStyleOptions'
import { Panel } from '../Panel'
import { PanelState } from '../PanelState'
import { TableUIState } from '../TableUi'
import { Ui } from '../Ui'

/**
 * Set the active network view ID
 */
export const setActiveNetworkView = (ui: Ui, id: IdType): Ui => {
  return {
    ...ui,
    activeNetworkView: id,
  }
}

/**
 * Set panel state
 */
export const setPanelState = (
  ui: Ui,
  panel: Panel,
  state: PanelState,
): Ui => {
  return {
    ...ui,
    panels: {
      ...ui.panels,
      [panel]: state,
    },
  }
}

/**
 * Enable or disable popup
 */
export const enablePopup = (ui: Ui, enable: boolean): Ui => {
  return {
    ...ui,
    enablePopup: enable,
  }
}

/**
 * Show or hide error dialog
 */
export const setShowErrorDialog = (ui: Ui, show: boolean): Ui => {
  return {
    ...ui,
    showErrorDialog: show,
    // Clear error message when the dialog is closed
    errorMessage: show ? ui.errorMessage : '',
  }
}

/**
 * Set error message
 */
export const setErrorMessage = (ui: Ui, message: string): Ui => {
  return {
    ...ui,
    errorMessage: message,
  }
}

/**
 * Set active table browser tab index
 */
export const setActiveTableBrowserIndex = (ui: Ui, index: number): Ui => {
  return {
    ...ui,
    tableUi: {
      ...ui.tableUi,
      activeTabIndex: index,
    },
  }
}

/**
 * Set network view tab index
 */
export const setNetworkViewTabIndex = (ui: Ui, index: number): Ui => {
  return {
    ...ui,
    networkViewUi: {
      ...ui.networkViewUi,
      activeTabIndex: index,
    },
  }
}

/**
 * Set active network browser panel tab index
 */
export const setActiveNetworkBrowserPanelIndex = (
  ui: Ui,
  index: number,
): Ui => {
  return {
    ...ui,
    networkBrowserPanelUi: {
      ...ui.networkBrowserPanelUi,
      activeTabIndex: index,
    },
  }
}

/**
 * Set table UI state
 */
export const setTableState = (ui: Ui, tableUiState: TableUIState): Ui => {
  return {
    ...ui,
    tableUi: tableUiState,
  }
}

/**
 * Set column width
 */
export const setColumnWidth = (
  ui: Ui,
  networkId: IdType,
  tableType: TableType,
  columnId: string,
  width: number,
): Ui => {
  const key = serializeColumnUIKey(networkId, tableType, columnId)
  const nextColumnUiState = {
    ...ui.tableUi.columnUiState,
    [key]: { width },
  }
  const nextTableUiState = {
    ...ui.tableUi,
    columnUiState: nextColumnUiState,
  }

  return {
    ...ui,
    tableUi: nextTableUiState,
  }
}

/**
 * Set visual style options for a network
 */
export const setVisualStyleOptions = (
  ui: Ui,
  networkId: IdType,
  visualStyleOptions?: VisualStyleOptions,
): Ui => {
  const nextVisualStyleOptions = {
    ...ui.visualStyleOptions,
    [networkId]: visualStyleOptions ?? {
      ...ui.visualStyleOptions[networkId],
      visualEditorProperties: {
        nodeSizeLocked: false,
        arrowColorMatchesEdge: false,
        tableDisplayConfiguration: {
          nodeTable: {
            columnConfiguration: [],
          },
          edgeTable: {
            columnConfiguration: [],
          },
        },
      },
    },
  }

  return {
    ...ui,
    visualStyleOptions: nextVisualStyleOptions,
  }
}

/**
 * Set node size locked state
 */
export const setNodeSizeLockedState = (
  ui: Ui,
  networkId: IdType,
  nodeSizeLocked: boolean,
): Ui => {
  const nextVisualStyleOptions = {
    ...ui.visualStyleOptions,
    [networkId]: {
      ...ui.visualStyleOptions[networkId],
      visualEditorProperties: {
        ...ui.visualStyleOptions[networkId]?.visualEditorProperties,
        nodeSizeLocked,
      },
    },
  }

  return {
    ...ui,
    visualStyleOptions: nextVisualStyleOptions,
  }
}

/**
 * Set arrow color matches edge state
 */
export const setArrowColorMatchesEdgeState = (
  ui: Ui,
  networkId: IdType,
  arrowColorMatchesEdge: boolean,
): Ui => {
  const nextVisualStyleOptions = {
    ...ui.visualStyleOptions,
    [networkId]: {
      ...ui.visualStyleOptions[networkId],
      visualEditorProperties: {
        ...ui.visualStyleOptions[networkId]?.visualEditorProperties,
        arrowColorMatchesEdge,
      },
    },
  }

  return {
    ...ui,
    visualStyleOptions: nextVisualStyleOptions,
  }
}

/**
 * Set table display configuration
 */
export const setTableDisplayConfiguration = (
  ui: Ui,
  networkId: IdType,
  tableDisplayConfiguration: TableDisplayConfiguration,
): Ui => {
  const nextVisualStyleOptions = {
    ...ui.visualStyleOptions,
    [networkId]: {
      ...ui.visualStyleOptions[networkId],
      visualEditorProperties: {
        ...ui.visualStyleOptions[networkId]?.visualEditorProperties,
        tableDisplayConfiguration,
      },
    },
  }

  return {
    ...ui,
    visualStyleOptions: nextVisualStyleOptions,
  }
}

/**
 * Set custom network tab name
 */
export const setCustomNetworkTabName = (
  ui: Ui,
  rendererId: IdType,
  name: string,
): Ui => {
  return {
    ...ui,
    customNetworkTabName: {
      ...(ui.customNetworkTabName ?? {}),
      [rendererId]: name,
    },
  }
}

/**
 * Serialize column UI key
 */
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

/**
 * Deserialize column UI key
 */
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

