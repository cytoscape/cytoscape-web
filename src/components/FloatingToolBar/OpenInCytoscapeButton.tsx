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
import { useState, useEffect } from 'react'
import { useUiStateStore } from '../../store/UiStateStore'
import { useOpaqueAspectStore } from '../../store/OpaqueAspectStore'
import { IdType } from '../../models'

interface OpenInCytoscapeButtonProps {
  targetNetworkId?: IdType
  networkLabel?: string
}

const isSafari = (): boolean => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

export const OpenInCytoscapeButton = ({
  targetNetworkId,
  networkLabel,
}: OpenInCytoscapeButtonProps): JSX.Element => {
  const [open, setOpen] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const [isSafariBrowser, setIsSafariBrowser] = useState<boolean>(false)

  useEffect(() => {
    if (isSafari()) {
      setIsSafariBrowser(true)
    }
  }, [])

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const networkId: IdType = targetNetworkId ?? currentNetworkId

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
  const opaqueAspects = targetNetworkId !== undefined ? allOpaqueAspects[targetNetworkId] : undefined

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
      visualStyleOptions,
      viewModel,
      targetSummary.name,
      opaqueAspects,
    )
    try {
      handleMessageOpen('Sending this network to Cytoscape Desktop...')
      await cyndex.postCX2NetworkToCytoscape(cx)
      handleMessageOpen('Network opened in Cytoscape Desktop')
    } catch (e) {
      console.warn('Could not open the network in Cytoscape Desktop!', e)
      handleMessageOpen('To use this feature, you need Cytoscape 3.6.0 or higher running on your machine (default port: 1234) and the CyNDEx-2 app installed')
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
          disabled={isSafariBrowser}
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
