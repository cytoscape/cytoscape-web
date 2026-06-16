import { Box } from '@mui/material'

import { ApplyLayoutButton } from './ApplyLayoutButton'
import { FitButton } from './FitButton'
import { OpenInCytoscapeButton } from './OpenInCytoscapeButton'
import { ShareNetworkButton } from './ShareNetworkButton'
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
  const isCirclePackingRenderer = rendererId === 'circlePacking'
  return (
    <Box
      data-testid="floating-toolbar"
      sx={{
        display: 'flex',
        position: 'absolute',
        alignItems: 'center',
        bottom: '1em',
        right: '1em',
        zIndex: 1,
        borderRadius: '0.5em',
        backgroundColor: (theme) => theme.palette.background.paper,
        border: (theme) => `1px solid ${theme.palette.grey[800]}`,
        opacity: 0.8,
        '&:hover': {
          opacity: 1,
        },
      }}
    >
      <ApplyLayoutButton
        targetNetworkId={targetNetworkId}
        disabled={isCirclePackingRenderer}
        rendererId={rendererId}
      />
      <FitButton rendererId={rendererId} />
      <OpenInCytoscapeButton
        targetNetworkId={targetNetworkId}
        networkLabel={networkLabel}
      />
      <ShareNetworkButton targetNetworkId={targetNetworkId} />
    </Box>
  )
}
