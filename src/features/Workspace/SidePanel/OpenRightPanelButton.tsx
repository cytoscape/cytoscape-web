import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { Button, IconButton, Tooltip } from '@mui/material'

import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { Panel } from '../../../models/UiModel/Panel'
import { PanelState } from '../../../models/UiModel/PanelState'

interface OpenRightPanelButtonProps {
  show: boolean
  toOpen: boolean
  title: string
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
        <Button
          data-testid="side-panel-open-button"
          onClick={() => setPanelState(Panel.RIGHT, PanelState.OPEN)}
          sx={{
            position: 'absolute',
            top: (theme) => theme.spacing(6),
            right: 0,
            minWidth: 28,
            width: 28,
            height: 40,
            px: 0,
            borderRadius: 0,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            backgroundColor: (theme) => theme.palette.background.paper,
            color: (theme) => theme.palette.text.secondary,
          }}
        >
          <ChevronLeft />
        </Button>
      ) : (
        // Button for closing the panel
        <IconButton
          data-testid="side-panel-close-button"
          onClick={() => setPanelState(Panel.RIGHT, PanelState.CLOSED)}
          sx={{
            position: 'absolute',
            top: (theme) => theme.spacing(0.5),
            left: (theme) => theme.spacing(1),
            width: 32,
            height: 32,
            zIndex: 1000,
          }}
        >
          <ChevronRight />
        </IconButton>
      )}
    </Tooltip>
  )
}
