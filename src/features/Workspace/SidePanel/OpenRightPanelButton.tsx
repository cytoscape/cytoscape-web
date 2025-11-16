import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { Tooltip } from '@mui/material'

import { useUiStateStore } from '../../../hooks/stores/UiStateStore'
import { Panel } from '../../../models/UiModel/Panel'
import { PanelState } from '../../../models/UiModel/PanelState'

interface OpenRightPanelButtonProps {
  show: boolean
  toOpen: boolean
  title: string
}

const buttonStyleOpen = {
  position: 'absolute',
  top: '55px',
  right: '5px',
  border: '1px solid #999999',
}

const buttonStyleClose = {
  position: 'absolute',
  top: '8px',
  left: '5px',
  border: '1px solid #999999',
  zIndex: 1000,
}

/**
 * The button to open to the right panel
 *
 * @returns Invisible panel to watch changes
 */
export const OpenRightPanelButton = ({
  show,
  toOpen,
  title,
}: OpenRightPanelButtonProps): JSX.Element | null => {
  const setPanelState = useUiStateStore((state) => state.setPanelState)
  if (!show) {
    return null
  }

  return (
    <Tooltip title={title}>
      {toOpen ? (
        <ChevronLeft
          data-testid="side-panel-open-button"
          sx={buttonStyleOpen}
          onClick={() => setPanelState(Panel.RIGHT, PanelState.OPEN)}
        />
      ) : (
        // Button for closing the panel
        <ChevronRight
          data-testid="side-panel-close-button"
          sx={buttonStyleClose}
          onClick={() => setPanelState(Panel.RIGHT, PanelState.CLOSED)}
        />
      )}
    </Tooltip>
  )
}
