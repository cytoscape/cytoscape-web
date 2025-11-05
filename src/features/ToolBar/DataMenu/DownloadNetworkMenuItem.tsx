import { MenuItem } from '@mui/material'
import { ReactElement, useState } from 'react'

import { logUi } from '../../../debug'
import { useMessageStore } from '../../../hooks/stores/MessageStore'
import { useNetworkStore } from '../../../hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../../hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../../../hooks/stores/OpaqueAspectStore'
import { useTableStore } from '../../../hooks/stores/TableStore'
import { useUiStateStore } from '../../../hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../hooks/stores/WorkspaceStore'
import { exportCyNetworkToCx2 } from '../../../models/CxModel/impl'
import { CyNetwork } from '../../../models/CyNetworkModel'
import { MessageSeverity } from '../../../models/MessageModel'
import { Network } from '../../../models/NetworkModel'
import { NetworkView } from '../../../models/ViewModel'
import { VisualStyleOptions } from '../../../models/VisualStyleModel/VisualStyleOptions'
import { BaseMenuProps } from '../BaseMenuProps'

export const DownloadNetworkMenuItem = (props: BaseMenuProps): ReactElement => {
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
  ) as VisualStyleOptions

  const network = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  ) as Network

  const opaqueAspects = useOpaqueAspectStore(
    (state) => state.opaqueAspects[currentNetworkId],
  )

  const saveNetworkToFile = async (): Promise<void> => {
    if (viewModel === undefined) {
      throw new Error('Could not find the current network view model.')
    }
    const cyNetwork: CyNetwork = {
      network,
      nodeTable: table.nodeTable,
      edgeTable: table.edgeTable,
      visualStyle,
      networkViews: [viewModel],
      visualStyleOptions,
      otherAspects: opaqueAspects ? [opaqueAspects as any] : undefined,
      undoRedoStack: {
        undoStack: [],
        redoStack: [],
      },
    }
    const cx = exportCyNetworkToCx2(cyNetwork, summary, summary.name)
    const link = document.createElement('a')
    link.download = `${summary.name}.cx2`
    const cxFile = new Blob([JSON.stringify(cx)], { type: 'text/plain' })
    link.href = URL.createObjectURL(cxFile)
    link.click()
    props.handleClose()
  }

  const handleSaveCurrentNetworkToFile = async (): Promise<void> => {
    try {
      await saveNetworkToFile()
      addMessage({
        message: 'Downloaded the current network successfully.',
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (error) {
      logUi.error(
        `[${DownloadNetworkMenuItem.name}]:[${handleSaveCurrentNetworkToFile.name}] Failed to download the current network as file`,
        error,
      )
      addMessage({
        message: 'Failed to download the current network as file.',
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
    }
  }

  const menuItem = (
    <MenuItem
      disabled={currentNetworkId === ''}
      onClick={handleSaveCurrentNetworkToFile}
    >
      Download Network File (.cx2)
    </MenuItem>
  )
  return <>{menuItem}</>
}
