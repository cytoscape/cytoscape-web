import { OpenInNew } from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'
import { useState } from 'react'

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../../data/hooks/stores/OpaqueAspectStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../models'
import { Network } from '../../models/NetworkModel'
import { useFeatureAvailability } from '../FeatureAvailability'
import { OpenInCytoscapeDialog } from '../FeatureAvailability/OpenInCytoscapeDialog'

interface OpenInCytoscapeButtonProps {
  targetNetworkId?: IdType
  networkLabel?: string
}

export const OpenInCytoscapeButton = ({
  targetNetworkId,
  networkLabel,
}: OpenInCytoscapeButtonProps): JSX.Element => {
  const featureAvailabilityState = useFeatureAvailability()
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const [dialogOpen, setDialogOpen] = useState(false)

  const networkId: IdType = targetNetworkId ?? currentNetworkId

  const table = useTableStore((state) => state.tables[networkId])
  const summary = useNetworkSummaryStore((state) => state.summaries[networkId])

  const viewModel = useViewModelStore((state) => state.getViewModel(networkId))
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[networkId],
  )
  const visualStyleOptions = useUiStateStore(
    (state) => state.ui.visualStyleOptions[networkId],
  )
  const network = useNetworkStore((state) =>
    state.networks.get(networkId),
  ) as Network

  const allOpaqueAspects = useOpaqueAspectStore((state) => state.opaqueAspects)
  const opaqueAspects =
    targetNetworkId !== undefined
      ? allOpaqueAspects[targetNetworkId]
      : undefined

  const handleClick = (): void => {
    setDialogOpen(true)
  }

  return (
    <>
      <Tooltip title={featureAvailabilityState.tooltip} placement="top" arrow>
        <span>
          <IconButton
            data-testid="open-in-cytoscape-button"
            onClick={handleClick}
            aria-label="open-in-cytoscape"
            size="small"
            disableFocusRipple={true}
          >
            <OpenInNew fontSize="inherit" />
          </IconButton>
        </span>
      </Tooltip>

      <OpenInCytoscapeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        network={network}
        networkLabel={networkLabel}
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
