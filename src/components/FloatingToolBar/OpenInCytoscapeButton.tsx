import { IconButton, Tooltip } from '@mui/material'
import { OpenInNew } from '@mui/icons-material'

// @ts-expect-error-next-line
import { CyNDEx } from '@js4cytoscape/ndex-client'

import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useNetworkStore } from '../../store/NetworkStore'
import { useTableStore } from '../../store/TableStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { useVisualStyleStore } from '../../store/VisualStyleStore'
import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { exportNetworkToCx2 } from '../../store/io/exportCX'
import { Network } from '../../models/NetworkModel'

export const OpenInCytoscapeButton = (): JSX.Element => {
  const cyndex = new CyNDEx()
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const table = useTableStore((state) => state.tables[currentNetworkId])

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const viewModel = useViewModelStore(
    (state) => state.getViewModel(currentNetworkId),
  )
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[currentNetworkId],
  )
  const network = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  ) as Network

  const openNetworkInCytoscape = async (): Promise<void> => {
    if(viewModel === undefined) {
      throw new Error('Could not find the current network view model.')
    }
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      table.nodeTable,
      table.edgeTable,
      viewModel,
      `Copy of ${summary.name}`,
    )
    try {
      await cyndex.postCX2NetworkToCytoscape(cx)
    } catch (e) {
      console.log(e)
      console.log('Cannot find Cytoscape!')
    }
  }

  const handleClick = async (): Promise<void> => {
    await openNetworkInCytoscape()
  }

  return (
    <Tooltip title={`Open this network in Cytoscape`} placement="top" arrow>
      <IconButton
        onClick={handleClick}
        aria-label="fit"
        size="small"
        disableFocusRipple={true}
      >
        <OpenInNew fontSize="inherit" />
      </IconButton>
    </Tooltip>
  )
}
