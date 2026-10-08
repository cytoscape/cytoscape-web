import LaptopChromebookIcon from '@mui/icons-material/LaptopChromebook'
import { ReactElement } from 'react'

import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useFeatureAvailability } from '../../FeatureAvailability'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

/**
 * Data > Open Network in Cytoscape Desktop. The first-use permission notice
 * belongs to the Data menu, not to this row (#784): `onClick` closes the menu
 * and starts the action there.
 */
export const OpenNetworkInCytoscapeMenuItem = ({
  onClick,
}: BaseMenuItemProps): ReactElement => {
  const featureAvailabilityState = useFeatureAvailability()
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const disabled =
    featureAvailabilityState.state.isCyDeskAvailable === false ||
    currentNetworkId === ''

  return (
    <DropdownMenuItem
      label="Open Network in Cytoscape Desktop"
      tooltip={currentNetworkId === '' ? '' : featureAvailabilityState.tooltip}
      icon={<LaptopChromebookIcon />}
      disabled={disabled}
      onClick={onClick}
    />
  )
}
