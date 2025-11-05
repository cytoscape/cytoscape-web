// @ts-expect-error-next-line
import { CyNDEx } from '@js4cytoscape/ndex-client'
import { Box,MenuItem, Tooltip } from '@mui/material'
import { ReactElement } from 'react'

import { useNetworkStore } from '../../../hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../../hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../../../hooks/stores/OpaqueAspectStore'
import { useTableStore } from '../../../hooks/stores/TableStore'
import { useUiStateStore } from '../../../hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../hooks/stores/WorkspaceStore'
import { useOpenNetworkInCytoscape } from '../../../hooks/useOpenInCytoscapeDesktop'
import { Network } from '../../../models/NetworkModel'
import { NetworkView } from '../../../models/ViewModel'
import { useFeatureAvailability } from '../../FeatureAvailability'
import { BaseMenuProps } from '../BaseMenuProps'

export const OpenNetworkInCytoscapeMenuItem = ({
  handleClose,
}: BaseMenuProps): ReactElement => {
  const cyndex = new CyNDEx()
  const openNetworkInCytoscape = useOpenNetworkInCytoscape()
  const featureAvailabilityState = useFeatureAvailability()
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

  const handleOpenNetworkInCytoscape = async (): Promise<void> => {
    await openNetworkInCytoscape(
      network,
      visualStyle,
      summary,
      table,
      visualStyleOptions,
      viewModel,
      opaqueAspects,
      cyndex,
    )
    handleClose()
  }

  const disabled =
    featureAvailabilityState.state.isCyDeskAvailable === false ||
    currentNetworkId === ''

  const menuItem = (
    <MenuItem onClick={handleOpenNetworkInCytoscape} disabled={disabled}>
      Open Network in Cytoscape Desktop
    </MenuItem>
  )

  return (
    <Tooltip
      arrow
      placement="right"
      title={currentNetworkId === '' ? '' : featureAvailabilityState.tooltip}
    >
      <Box>{menuItem}</Box>
    </Tooltip>
  )
}
