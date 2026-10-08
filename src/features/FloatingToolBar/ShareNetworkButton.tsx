import Share from '@mui/icons-material/Share'
import { IconButton, Tooltip } from '@mui/material'

import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../models'
import { useCopyShareableNetworkUrl } from './useCopyShareableNetworkUrl'

// Re-exported for consumers that decode these params (AppShell restores them).
export {
  SelectionStates,
  type SelectionState,
} from './useCopyShareableNetworkUrl'

interface ShareNetworkButtonProps {
  targetNetworkId?: IdType
}

/**
 * Button to copy the sharable URL to clipboard
 *
 * The URL encodes the current UI and selection states; see
 * {@link useCopyShareableNetworkUrl}.
 */
export const ShareNetworkButton = ({
  targetNetworkId,
}: ShareNetworkButtonProps): JSX.Element => {
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const networkSummary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const isLocal = networkSummary?.isNdex !== true

  const copyShareableNetworkUrl = useCopyShareableNetworkUrl()

  const handleClick = (): void => {
    copyShareableNetworkUrl(targetNetworkId)
  }

  return (
    <>
      <Tooltip
        title={
          isLocal
            ? 'Save this network to NDEx first to generate a shareable URL.'
            : 'Share this network (copy URL to clipboard)'
        }
        placement="top"
        arrow
      >
        <span>
          <IconButton
            data-testid="share-network-button"
            onClick={isLocal ? undefined : handleClick}
            aria-label="share"
            size="small"
            disableFocusRipple
            disabled={isLocal}
          >
            <Share fontSize="inherit" />
          </IconButton>
        </span>
      </Tooltip>
    </>
  )
}
