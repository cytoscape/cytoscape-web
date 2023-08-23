import { IdType } from '../IdType'
import { Panel } from './Panel'
import { PanelState } from './PanelState'

/**
 * User interface states shared as a global value
 */
export interface Ui {
  panels: {
    [Panel.LEFT]: PanelState
    [Panel.RIGHT]: PanelState
  }
  // In a multi-view mode, this is
  // the selected, active network in the UI
  activeNetworkView: IdType

  // Show / hide the popup
  enablePopup: boolean

  // Show / hide error dialog
  showErrorDialog: boolean

  errorMessage: string
}
