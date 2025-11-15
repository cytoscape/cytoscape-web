// @ts-expect-error-next-line
import { CyNDEx } from '@js4cytoscape/ndex-client'
import { OpenInNew } from '@mui/icons-material'
import { Alert, IconButton, Tooltip } from '@mui/material'

import { useNetworkStore } from '../../hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../../hooks/stores/OpaqueAspectStore'
import { useTableStore } from '../../hooks/stores/TableStore'
import { useUiStateStore } from '../../hooks/stores/UiStateStore'
import { useViewModelStore } from '../../hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../hooks/stores/WorkspaceStore'
import { useOpenNetworkInCytoscape } from '../../hooks/useOpenInCytoscapeDesktop'
import { IdType } from '../../models'
import { Network } from '../../models/NetworkModel'
import { useFeatureAvailability } from '../FeatureAvailability'

interface OpenInCytoscapeButtonProps {
  targetNetworkId?: IdType
  networkLabel?: string
}

export const OpenInCytoscapeButton = ({
  targetNetworkId,
  networkLabel,
}: OpenInCytoscapeButtonProps): JSX.Element => {
  const featureAvailabilityState = useFeatureAvailability()
  const openNetworkInCytoscape = useOpenNetworkInCytoscape()
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const networkId: IdType = targetNetworkId ?? currentNetworkId

  const cyndex = new CyNDEx()

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

  const handleClick = async (): Promise<void> => {
    await openNetworkInCytoscape(
      network,
      visualStyle,
      summary,
      table,
      visualStyleOptions,
      viewModel,
      opaqueAspects,
      cyndex,
      networkLabel,
    )
  }

  return (
    <>
      <Tooltip title={featureAvailabilityState.tooltip} placement="top" arrow>
        <span>
          <IconButton
            onClick={handleClick}
            aria-label="fit"
            size="small"
            disableFocusRipple={true}
            disabled={
              featureAvailabilityState.state.isCyDeskAvailable === false
            }
          >
            <OpenInNew fontSize="inherit" />
          </IconButton>
        </span>
      </Tooltip>
    </>
  )
}
