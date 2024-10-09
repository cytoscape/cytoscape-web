import { IdType } from '../IdType'
import { Panel } from '../UiModel/Panel'
import { PanelState } from '../UiModel/PanelState'
import { VisualStyleOptions } from '../VisualStyleModel/VisualStyleOptions'
import { TableType } from './TableStoreModel'
import { Ui } from '../UiModel'

export interface UiState {
  ui: Ui
}

export interface UiStateAction {
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
  setActiveTableBrowserIndex: (index: number) => void
  setActiveNetworkBrowserPanelIndex: (index: number) => void
  setVisualStyleOptions: (
    networkId: IdType,
    visualStyleOptions?: VisualStyleOptions,
  ) => void
  setNodeSizeLockedState: (networkId: IdType, nodeSizeLocked: boolean) => void
  setArrowColorMatchesEdgeState: (
    networkId: IdType,
    arrowColorMatchesEdge: boolean,
  ) => void
  setNetworkViewTabIndex: (index: number) => void
}

export type UiStateStore = UiState & UiStateAction
