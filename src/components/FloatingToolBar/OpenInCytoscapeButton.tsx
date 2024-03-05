import { Button, IconButton, Snackbar, Tooltip } from '@mui/material'
import { OpenInNew } from '@mui/icons-material'
import CloseIcon from '@mui/icons-material/Close'

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
import { useState } from 'react'

export const OpenInCytoscapeButton = (): JSX.Element => {
  const [open, setOpen] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')

  const handleMessageOpen = (newMessage: string): void => {
    setMessage(newMessage)
    setOpen(true)
  }

  const handleMessageClose = (
    event: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === 'clickaway') {
      return
    }
    setOpen(false)
  }

  const cyndex = new CyNDEx()
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const table = useTableStore((state) => state.tables[currentNetworkId])

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const viewModel = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[currentNetworkId],
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
      viewModel,
      `Copy of ${summary.name}`,
    )
    try {
      await cyndex.postCX2NetworkToCytoscape(cx)
      handleMessageOpen('Post successful!')
    } catch (e) {
      console.warn('Could not open the network in Cytoscape Desktop!', e)
      handleMessageOpen('Failed!')
    }
  }

  const handleClick = async (): Promise<void> => {
    await openNetworkInCytoscape()
  }

  return (
    <>
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
      <Snackbar
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        open={open}
        autoHideDuration={6000}
        onClose={handleMessageClose}
        message={message}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleMessageClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </>
  )
}
