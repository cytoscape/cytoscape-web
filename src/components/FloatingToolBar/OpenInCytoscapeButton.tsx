import { IconButton, Snackbar, Tooltip } from '@mui/material'
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
import { useEffect, useState } from 'react'
import { useUiStateStore } from '../../store/UiStateStore'

interface OpenInCytoscapeButtonProps {
  networkLabel?: string
}

export const OpenInCytoscapeButton = ({
  networkLabel,
}: OpenInCytoscapeButtonProps): JSX.Element => {
  const [open, setOpen] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')

  const ui = useUiStateStore((state) => state.ui)
  const { activeNetworkView } = ui

  const [targetNetworkId, setTargetNetworkId] = useState<string>('')

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

  useEffect(() => {
    if (
      activeNetworkView !== undefined &&
      activeNetworkView !== null &&
      activeNetworkView !== ''
    ) {
      setTargetNetworkId(activeNetworkView)
    } else {
      setTargetNetworkId(currentNetworkId)
    }
  }, [currentNetworkId, activeNetworkView])

  const table = useTableStore((state) => state.tables[targetNetworkId])

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[targetNetworkId],
  )

  const viewModel = useViewModelStore((state) =>
    state.getViewModel(targetNetworkId),
  )
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[targetNetworkId],
  )
  const network = useNetworkStore((state) =>
    state.networks.get(targetNetworkId),
  ) as Network

  const openNetworkInCytoscape = async (): Promise<void> => {
    if (viewModel === undefined) {
      throw new Error('Could not find the current network view model.')
    }

    let targetSummary: any = summary
    if (summary === undefined) {
      targetSummary = {
        name: networkLabel ?? 'Interaction Network',
        properties: [],
        externalId: '',
        isReadOnly: false,
        isShowcase: false,
        owner: '',
      }
    }

    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      targetSummary,
      table.nodeTable,
      table.edgeTable,
      viewModel,
      targetSummary.name,
    )
    try {
      handleMessageOpen('Sending this network to Cytoscape Desktop...')
      await cyndex.postCX2NetworkToCytoscape(cx)
      handleMessageOpen('Network opened in Cytoscape Desktop')
    } catch (e) {
      console.warn('Could not open the network in Cytoscape Desktop!', e)
      handleMessageOpen('Failed to open network in Cytoscape Desktop!')
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
        autoHideDuration={3000}
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
