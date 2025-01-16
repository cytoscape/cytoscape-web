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
import { useMessageStore } from '../../../store/MessageStore'
import { MessageSeverity } from '../../../models/MessageModel'

export const OpenNetworkInCytoscapeMenuItem = ({
  handleClose,
}: BaseMenuProps): ReactElement => {
  const cyndex = new CyNDEx()
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const addMessage = useMessageStore((state) => state.addMessage)
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

  const openNetworkInCytoscape = async (): Promise<void> => {
    if (viewModel === undefined) {
      addMessage({
        message: 'Could not find the current network view model.',
        duration: 4000,
        severity: MessageSeverity.WARNING,
      })
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
      addMessage({
        message: 'Sending this network to Cytoscape Desktop...',
        duration: 3000,
        severity: MessageSeverity.INFO,
      })

      await cyndex.postCX2NetworkToCytoscape(cx)
      addMessage({
        message: 'Network successfully opened in Cytoscape Desktop.',
        duration: 4000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (e) {
      addMessage({
        message:
          'To use this feature, you need Cytoscape 3.6.0 or higher running on your machine (default port: 1234) and the CyNDEx-2 app installed.',
        duration: 6000,
        severity: MessageSeverity.ERROR,
      })
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

  const disabled = isSafari || currentNetworkId === ''
  const menuItem = (
    <MenuItem onClick={handleOpenNetworkInCytoscape} disabled={disabled}>
      Open Network in Cytoscape Desktop
    </MenuItem>
  )

  return (
    <Tooltip
      arrow
      placement="right"
      title={
        disabled
          ? isSafari && currentNetworkId !== ''
            ? 'This feature is not available on Safari'
            : ''
          : 'Download and open Cytoscape to open network'
      }
    >
      <Box>{menuItem}</Box>
    </Tooltip>
  )
}
