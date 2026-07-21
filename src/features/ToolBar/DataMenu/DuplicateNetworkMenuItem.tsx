import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { ReactElement } from 'react'

import { useCloneNetwork } from '../../../data/hooks/useCloneNetwork'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

/**
 * Duplicates the current network as a new local network in the workspace.
 * Unlike "Save Copy to NDEx", this works without signing in — the copy stays
 * local until the user chooses to save it to NDEx (CW-755).
 */
export const DuplicateNetworkMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  const cloneNetwork = useCloneNetwork()
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const enabled = currentNetworkId !== ''

  const handleClick = (): void => {
    props.onClick()
    if (enabled) {
      cloneNetwork(currentNetworkId)
    }
  }

  return (
    <DropdownMenuItem
      label="Duplicate Network"
      icon={<ContentCopyIcon />}
      tooltip={enabled ? '' : 'Load a network first to duplicate it'}
      disabled={!enabled}
      onClick={handleClick}
    />
  )
}
