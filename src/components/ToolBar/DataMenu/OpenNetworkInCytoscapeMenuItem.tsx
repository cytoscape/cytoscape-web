import { MenuItem, Tooltip, Box } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

// @ts-expect-error-next-line
import { CyNDEx } from '@js4cytoscape/ndex-client'

import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useTableStore } from '../../../store/TableStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { exportNetworkToCx2 } from '../../../store/io/exportCX'
import { Network } from '../../../models/NetworkModel'
import { NetworkView } from '../../../models/ViewModel'
import { useUiStateStore } from '../../../store/UiStateStore'

export const OpenNetworkInCytoscapeMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const cyndex = new CyNDEx()
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
    (state) => state.ui.visualStyleOptions[currentNetworkId]
  )
  const network = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  ) as Network

  const openNetworkInCytoscape = async (): Promise<void> => {
    if (viewModel === undefined) {
      throw new Error('Could not find the current network view model.')
    }
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      table.nodeTable,
      table.edgeTable,
      visualStyleOptions,
      viewModel,
      `Copy of ${summary.name}`,
    )
    try {
      await cyndex.postCX2NetworkToCytoscape(cx)
    } catch (e) {
      console.log(e)
      console.log('Cannot find Cytoscape!')
    }
    props.handleClose()
  }

  const handleOpenNetworkInCytoscape = async (): Promise<void> => {
    await openNetworkInCytoscape()
  }

  const menuItem = (
    <MenuItem onClick={handleOpenNetworkInCytoscape}>
      Open Copy of Current Network in Cytoscape
    </MenuItem>
  )

  return (
    <Tooltip title="Download and open Cytoscape to open network">
      <Box>{menuItem}</Box>
    </Tooltip>
  )
}
