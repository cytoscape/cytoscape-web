import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { Panel } from '../../../models/UiModel/Panel'
import { PanelState } from '../../../models/UiModel/PanelState'
import { useUiStateStore } from '../../../store/UiStateStore'
import { Tooltip } from '@mui/material'

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
          sx={buttonStyleOpen}
          onClick={() => setPanelState(Panel.RIGHT, PanelState.OPEN)}
        />
      ) : (
        // Button for closing the panel
        <ChevronRight
          sx={buttonStyleClose}
          onClick={() => setPanelState(Panel.RIGHT, PanelState.CLOSED)}
        />
      )}
    </Tooltip>
  )
}
