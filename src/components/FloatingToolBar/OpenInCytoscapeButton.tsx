import { IconButton, Tooltip, Alert } from '@mui/material'
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
import { useMemo } from 'react'
import { useUiStateStore } from '../../store/UiStateStore'
import { useOpaqueAspectStore } from '../../store/OpaqueAspectStore'
import { IdType } from '../../models'
import { useMessageStore } from '../../store/MessageStore'
import { MessageSeverity } from '../../models/MessageModel'

interface OpenInCytoscapeButtonProps {
  targetNetworkId?: IdType
  networkLabel?: string
}

export const OpenInCytoscapeButton = ({
  targetNetworkId,
  networkLabel,
}: OpenInCytoscapeButtonProps): JSX.Element => {
  const isSafari = useMemo(() => {
    const ua = navigator.userAgent.toLowerCase()
    return ua.includes('safari') && !ua.includes('chrome')
  }, [])

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const networkId: IdType = targetNetworkId ?? currentNetworkId

  const cyndex = new CyNDEx()

  const addMessage = useMessageStore((state) => state.addMessage)
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
      addMessage({
        message: 'Sending this network to Cytoscape Desktop...',
        duration: 3000,
        severity: MessageSeverity.INFO,
      })
      await cyndex.postCX2NetworkToCytoscape(cx)
      addMessage({
        message: 'Network successfully opened in Cytoscape Desktop.',
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (e) {
      console.warn('Could not open the network in Cytoscape Desktop!', e)
      addMessage({
        message:
          'To use this feature, you need Cytoscape 3.6.0 or higher running on your machine (default port: 1234) and the CyNDEx-2 app installed',
        duration: 3000,
        severity: MessageSeverity.ERROR,
      })
    }
  }

  const handleClick = async (): Promise<void> => {
    await openNetworkInCytoscape()
  }

  return (
    <>
      <Tooltip
        title={
          isSafari
            ? 'This feature is not available on Safari'
            : 'Open network in Cytoscape Desktop (useful for high performance computing)'
        }
        placement="top"
        arrow
      >
        <span>
          <IconButton
            onClick={handleClick}
            aria-label="fit"
            size="small"
            disableFocusRipple={true}
            disabled={isSafari}
          >
            <OpenInNew fontSize="inherit" />
          </IconButton>
        </span>
      </Tooltip>
    </>
  )
}
