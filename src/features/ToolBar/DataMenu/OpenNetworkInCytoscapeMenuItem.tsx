import { CyNDEx } from '@js4cytoscape/ndex-client'
import LaptopChromebookIcon from '@mui/icons-material/LaptopChromebook'
import { ReactElement } from 'react'

import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../../../data/hooks/stores/OpaqueAspectStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useCytoscapeDesktopPermissionNotice } from '../../../data/hooks/useCytoscapeDesktopPermissionNotice'
import { useOpenNetworkInCytoscape } from '../../../data/hooks/useOpenInCytoscapeDesktop'
import { Network } from '../../../models/NetworkModel'
import { NetworkView } from '../../../models/ViewModel'
import { CytoscapeDesktopPermissionDialog } from '../../CytoscapeDesktopPermissionDialog'
import { useFeatureAvailability } from '../../FeatureAvailability'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

export const OpenNetworkInCytoscapeMenuItem = ({
  onClick: handleClose,
}: BaseMenuItemProps): ReactElement => {
  const cyndex = new CyNDEx()
  const openNetworkInCytoscape = useOpenNetworkInCytoscape()
  const featureAvailabilityState = useFeatureAvailability()
  const desktopNotice = useCytoscapeDesktopPermissionNotice()
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const table = useTableStore((state) => state.tables[currentNetworkId])
  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )
  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[currentNetworkId],
  )
  const visualStyleOptions = useUiStateStore(
    (state) => state.ui.visualStyleOptions[currentNetworkId],
  )
  const network = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  ) as Network
  const opaqueAspects = useOpaqueAspectStore(
    (state) => state.opaqueAspects[currentNetworkId],
  )

  const openInCytoscape = (): void => {
    void openNetworkInCytoscape(
      network,
      visualStyle,
      summary,
      table,
      visualStyleOptions,
      viewModel,
      opaqueAspects,
      cyndex,
    ).finally(() => {
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
