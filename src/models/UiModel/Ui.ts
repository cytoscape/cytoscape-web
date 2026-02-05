import { IdType } from '../IdType'
import { VisualStyleOptions } from '../VisualStyleModel/VisualStyleOptions'
import { NetworkBrowserPanelUIState } from './NetworkBrowserPanelState'
import { NetworkViewUIState } from './NetworkViewUI'
import { Panel } from './Panel'
import { PanelState } from './PanelState'
import { TableUIState } from './TableUi'
/**
 * User interface states shared as a global value
 */
export interface Ui {
  panels: {
    [Panel.LEFT]: PanelState
    [Panel.RIGHT]: PanelState
    [Panel.BOTTOM]: PanelState
  }
  // In a multi-view mode, this is
  // the selected, active network in the UI
  activeNetworkView: IdType

  // Show / hide the popup
  enablePopup: boolean

  // Show / hide error dialog
  showErrorDialog: boolean

  errorMessage: string

  tableUi: TableUIState
  networkBrowserPanelUi: NetworkBrowserPanelUIState

  // Visual editor properties
  visualStyleOptions: Record<IdType, VisualStyleOptions>
  networkViewUi: NetworkViewUIState

  // Custom network tab name
  customNetworkTabName?: Record<string, string>
}
