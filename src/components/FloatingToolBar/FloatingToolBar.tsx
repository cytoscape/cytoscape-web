import { Box, Divider } from '@mui/material'
import { ApplyLayoutButton } from './ApplyLayoutButton'
import { FitButton } from './FitButton'
import { OpenInCytoscapeButton } from './OpenInCytoscapeButton'
import { ShareNetworkButton } from './ShareNetworkButtton'
interface FloatingToolBarProps {
  // All actions to be performed on the target network if provided
  targetNetworkId?: string
}

export const FloatingToolBar = ({
  targetNetworkId,
}: FloatingToolBarProps): JSX.Element => {
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
      <Divider orientation="vertical" flexItem />
      <ApplyLayoutButton targetNetworkId={targetNetworkId} />
      <FitButton />
      <OpenInCytoscapeButton />
      <ShareNetworkButton />
    </Box>
  )
}
