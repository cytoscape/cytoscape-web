import { IdType } from '../IdType'

import { Panel } from './Panel'
import { PanelState } from './PanelState'
import { TableUIState } from './TableUi'
import { NetworkBrowserPanelUIState } from './NetworkBrowserPanelState'
import { VisualStyleOptions } from '../VisualStyleModel/VisualStyleOptions'
import { NetworkViewUIState } from './NetworkViewUI'
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
}
