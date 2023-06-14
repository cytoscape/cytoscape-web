import { Panel } from './Panel'
import { PanelState } from './PanelState'

/**
 * User interface states shared as a global state
 */
export interface UiState {
  panels: {
    [Panel.LEFT]: PanelState
    [Panel.RIGHT]: PanelState
    [Panel.CENTER]: PanelState
    [Panel.BOTTOM]: PanelState
    [Panel.TOP]: PanelState
  }
}
