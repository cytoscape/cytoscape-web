import { MenuItem, Tooltip, Box } from '@mui/material'
import { ReactElement, useMemo } from 'react'
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
import { useOpaqueAspectStore } from '../../../store/OpaqueAspectStore'

interface OpenNetworkInCytoscapeMenuItemProps extends BaseMenuProps {
  onSnackbarOpen: (message: string, severity?: 'info' | 'success' | 'error') => void
}

export const OpenNetworkInCytoscapeMenuItem = ({
  handleClose,
  onSnackbarOpen,
}: OpenNetworkInCytoscapeMenuItemProps): ReactElement => {
  const cyndex = new CyNDEx()
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const table = useTableStore((state) => state.tables[currentNetworkId])
  const summary = useNetworkSummaryStore((state) => state.summaries[currentNetworkId])
  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )
  const visualStyle = useVisualStyleStore((state) => state.visualStyles[currentNetworkId])
  const visualStyleOptions = useUiStateStore((state) => state.ui.visualStyleOptions[currentNetworkId])
  const network = useNetworkStore((state) => state.networks.get(currentNetworkId)) as Network
  const opaqueAspects = useOpaqueAspectStore((state) => state.opaqueAspects[currentNetworkId])

  const openNetworkInCytoscape = async (): Promise<void> => {
    if (viewModel === undefined) {
      onSnackbarOpen('Could not find the current network view model.', 'error')
      return
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
      opaqueAspects,
    )
    try {
      onSnackbarOpen('Sending this network to Cytoscape Desktop...', 'info')
      await cyndex.postCX2NetworkToCytoscape(cx)
      onSnackbarOpen('Network successfully opened in Cytoscape Desktop.', 'success')
    } catch (e) {
      onSnackbarOpen(
        'To use this feature, you need Cytoscape 3.6.0 or higher running on your machine (default port: 1234) and the CyNDEx-2 app installed.',
        'error',
      )
      console.error('Could not open the network in Cytoscape Desktop!', e)
    }
    handleClose()
  }

  const handleOpenNetworkInCytoscape = async (): Promise<void> => {
    await openNetworkInCytoscape()
  }

  const isSafari = useMemo(() => {
    const ua = navigator.userAgent.toLowerCase()
    return ua.includes('safari') && !ua.includes('chrome')
  }, [])

  const menuItem = (
    <MenuItem onClick={handleOpenNetworkInCytoscape} disabled={isSafari}>
      Open Copy of Current Network in Cytoscape
    </MenuItem>
  )

  return (
    <Tooltip title={isSafari ? "This feature is not available on Safari" : "Download and open Cytoscape to open network"}>
      <Box>{menuItem}</Box>
    </Tooltip>
  )
}
