import { Box, Divider } from '@mui/material'
import { ApplyLayoutButton } from './ApplyLayoutButton'
import { FitButton } from './FitButton'
import { OpenInCytoscapeButton } from './OpenInCytoscapeButton'
import DoneIcon from '@mui/icons-material/Done'
import { useUiStateStore } from '../../store/UiStateStore'
interface FloatingToolBarProps {
  // All actions to be performed on the target network if provided
  targetNetworkId?: string
}

export const FloatingToolBar = ({
  targetNetworkId,
}: FloatingToolBarProps): JSX.Element => {
  const ui = useUiStateStore((state) => state.ui)
  const { enablePopup, activeNetworkView } = ui

  return (
    <Box
      sx={{
        display: 'flex',
        position: 'absolute',
        alignItems: 'center',
        bottom: '1em',
        right: '1em',
        zIndex: 3000,
        borderRadius: '0.5em',
        backgroundColor: 'rgba(250, 250, 250, 0.8)',
        border: '1px solid #AAAAAA',
      }}
    >
      {enablePopup && targetNetworkId === activeNetworkView ? (
        <DoneIcon color="warning" />
      ) : null}
      <Divider orientation="vertical" flexItem />
      <ApplyLayoutButton targetNetworkId={targetNetworkId} />
      <FitButton />
      <OpenInCytoscapeButton />
    </Box>
  )
}
