import { Box, Divider } from '@mui/material'
import { ApplyLayoutButton } from './ApplyLayoutButton'
import { FitButton } from './FitButton'
import { OpenInCytoscapeButton } from './OpenInCytoscapeButton'
import { ShareNetworkButton } from './ShareNetworkButtton'
interface FloatingToolBarProps {
  // All actions to be performed on the target network if provided
  targetNetworkId?: string

  // Label for the network to be used if the network has no summary
  networkLabel?: string

  // Target Renderer ID to apply the commands
  rendererId: string
}

export const FloatingToolBar = ({
  targetNetworkId,
  networkLabel,
  rendererId,
}: FloatingToolBarProps): JSX.Element => {
  const isCirclePackingRenderer = rendererId == 'circlePacking'
  return (
    <Box
      sx={{
        display: 'flex',
        position: 'absolute',
        alignItems: 'center',
        bottom: '1em',
        right: '1em',
        zIndex: 1,
        borderRadius: '0.5em',
        backgroundColor: 'rgba(250, 250, 250, 0.8)',
        border: '1px solid #AAAAAA',
      }}
    >
      <Divider orientation="vertical" flexItem />
      <ApplyLayoutButton
        targetNetworkId={targetNetworkId}
        disabled={isCirclePackingRenderer}
      />
      <FitButton targetNetworkId={targetNetworkId} rendererId={rendererId} />
      <OpenInCytoscapeButton
        targetNetworkId={targetNetworkId}
        networkLabel={networkLabel}
      />
      <ShareNetworkButton targetNetworkId={targetNetworkId} />
    </Box>
  )
}
