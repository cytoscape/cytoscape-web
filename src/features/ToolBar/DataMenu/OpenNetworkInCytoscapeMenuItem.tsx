import { Box, MenuItem, Tooltip } from '@mui/material'
import { ReactElement, useState } from 'react'

import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../../../data/hooks/stores/OpaqueAspectStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { Network } from '../../../models/NetworkModel'
import { NetworkView } from '../../../models/ViewModel'
import { useFeatureAvailability } from '../../FeatureAvailability'
import { OpenInCytoscapeDialog } from '../../FeatureAvailability/OpenInCytoscapeDialog'
import { BaseMenuProps } from '../BaseMenuProps'

export const OpenNetworkInCytoscapeMenuItem = ({
  handleClose,
}: BaseMenuProps): ReactElement => {
  const featureAvailabilityState = useFeatureAvailability()
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const [dialogOpen, setDialogOpen] = useState(false)

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

  const handleOpenNetworkInCytoscape = (): void => {
    setDialogOpen(true)
  }

  const disabled = currentNetworkId === ''

  const menuItem = (
    <MenuItem onClick={handleOpenNetworkInCytoscape} disabled={disabled}>
      Open Network in Cytoscape Desktop
    </MenuItem>
  )

  return (
    <>
      <Tooltip
        arrow
        placement="right"
        title={currentNetworkId === '' ? '' : featureAvailabilityState.tooltip}
      >
        <Box>{menuItem}</Box>
      </Tooltip>

      <OpenInCytoscapeDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          handleClose()
        }}
        network={network}
        visualStyle={visualStyle}
        summary={summary}
        table={table}
        visualStyleOptions={visualStyleOptions}
        viewModel={viewModel}
        opaqueAspects={opaqueAspects}
      />
    </>
  )
}
