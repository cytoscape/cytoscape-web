import LaptopChromebookIcon from '@mui/icons-material/LaptopChromebook'
import { ReactElement } from 'react'

import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useCytoscapeDesktopPermissionNotice } from '../../../data/hooks/useCytoscapeDesktopPermissionNotice'
import { useOpenNetworkInCytoscapeFromStores } from '../../../data/hooks/useOpenInCytoscapeDesktop'
import { CytoscapeDesktopPermissionDialog } from '../../CytoscapeDesktopPermissionDialog'
import { useFeatureAvailability } from '../../FeatureAvailability'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

export const OpenNetworkInCytoscapeMenuItem = ({
  onClick: handleClose,
}: BaseMenuItemProps): ReactElement => {
  const openNetworkInCytoscape = useOpenNetworkInCytoscapeFromStores()
  const featureAvailabilityState = useFeatureAvailability()
  const desktopNotice = useCytoscapeDesktopPermissionNotice()
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const openInCytoscape = (): void => {
    void openNetworkInCytoscape(currentNetworkId).finally(() => {
      handleClose()
    })
  }

  const handleOpenNetworkInCytoscape = (): void => {
    // On first use, explain the browser's local-network permission prompt
    // before attempting to reach Cytoscape Desktop (CW-Localhost). The menu is
    // kept open until the notice is confirmed so the dialog is not unmounted.
    desktopNotice.run(openInCytoscape)
  }

  const disabled =
    featureAvailabilityState.state.isCyDeskAvailable === false ||
    currentNetworkId === ''

  return (
    <>
      <CytoscapeDesktopPermissionDialog
        open={desktopNotice.open}
        onConfirm={desktopNotice.onConfirm}
        onCancel={() => {
          desktopNotice.onCancel()
          handleClose()
        }}
      />
      <DropdownMenuItem
        label="Open Network in Cytoscape Desktop"
        tooltip={
          currentNetworkId === '' ? '' : featureAvailabilityState.tooltip
        }
        icon={<LaptopChromebookIcon />}
        disabled={disabled}
        onClick={handleOpenNetworkInCytoscape}
      />
    </>
  )
}
