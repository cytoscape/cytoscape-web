import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { Panel } from '../../../models/UiModel/Panel'
import { PanelState } from '../../../models/UiModel/PanelState'

/**
 * Side effects applied by the TourRunner before a step is shown, to make a
 * step's target present (e.g. open a collapsed panel). These reuse the
 * existing UiStateStore panel actions — no new state.
 */

/** Open one of the workspace panels (left / bottom / right). */
export const openPanel = (panel: Panel): void => {
  useUiStateStore.getState().setPanelState(panel, PanelState.OPEN)
}

/**
 * Give the DOM a tick to mount a newly-opened panel before Joyride measures
 * the target. Panels animate via `allotment`, so a short wait avoids the
 * tooltip anchoring to a zero-size element.
 */
export const waitForPanel = (ms = 250): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))
