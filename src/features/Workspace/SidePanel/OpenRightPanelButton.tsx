import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'
import { Box, IconButton, Tooltip } from '@mui/material'

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
        <Box
          sx={{
            position: 'absolute',
            top: (theme) => theme.spacing(7),
            right: 0,
            p: (theme) => theme.spacing(0.5, 0, 0.5, 0.5),
            mt: (theme) => theme.spacing(-0.5),
            borderRadius: (theme) => theme.spacing(1.25, 0, 0, 1.25),
            backgroundColor: (theme) => theme.palette.divider,
          }}
        >
          <IconButton
            data-testid="side-panel-open-button"
            onClick={() => setPanelState(Panel.RIGHT, PanelState.OPEN)}
            sx={{
              minWidth: 28,
              width: 28,
              height: 40,
              px: 0,
              borderRadius: (theme) => theme.spacing(1, 0, 0, 1),
              color: (theme) => theme.palette.text.secondary,
              backgroundColor: (theme) => theme.palette.background.paper,
              '&:hover': {
                color: (theme) => theme.palette.text.primary,
                backgroundColor: (theme) => theme.palette.background.paper,
              },
            }}
          >
            <ChevronLeft />
          </IconButton>
        </Box>
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
            color: (theme) => theme.palette.text.secondary,
            '&:hover': {
              color: (theme) => theme.palette.text.primary,
              backgroundColor: 'transparent',
            },
          }}
        >
          <ChevronRight />
        </IconButton>
      )}
    </Tooltip>
  )
}
