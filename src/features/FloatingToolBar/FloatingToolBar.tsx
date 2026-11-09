import { Box } from '@mui/material'

import { useReadOnly } from '../../ReadOnlyContext'
import { ApplyLayoutButton } from './ApplyLayoutButton'
import { FitButton } from './FitButton'
import { OpenInCytoscapeButton } from './OpenInCytoscapeButton'
import { ShareNetworkButton } from './ShareNetworkButton'
interface FloatingToolBarProps {
  // All actions to be performed on the target network if provided
  targetNetworkId?: string

  // Network drawn in the view this toolbar sits in. Only the fit button uses
  // it: unlike targetNetworkId it leaves the share and open-in-Cytoscape
  // fallbacks to the active view untouched. Defaults to targetNetworkId.
  viewNetworkId?: string

  // Label for the network to be used if the network has no summary
  networkLabel?: string

  // Target Renderer ID to apply the commands
  rendererId: string
}

export const FloatingToolBar = ({
  targetNetworkId,
  viewNetworkId,
  networkLabel,
  rendererId,
}: FloatingToolBarProps): JSX.Element => {
  const isCirclePackingRenderer = rendererId === 'circlePacking'
  // The embed keeps Fit only: a layout edits the network, and the open and
  // share buttons act on the editor's workspace (the embed has its own link).
  const readOnly: boolean = useReadOnly()
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
      {!readOnly && (
        <ApplyLayoutButton
          targetNetworkId={targetNetworkId}
          disabled={isCirclePackingRenderer}
          rendererId={rendererId}
        />
      )}
      <FitButton
        rendererId={rendererId}
        targetNetworkId={viewNetworkId ?? targetNetworkId}
      />
      {!readOnly && (
        <OpenInCytoscapeButton
          targetNetworkId={targetNetworkId}
          networkLabel={networkLabel}
        />
      )}
      {!readOnly && <ShareNetworkButton targetNetworkId={targetNetworkId} />}
    </Box>
  )
}
