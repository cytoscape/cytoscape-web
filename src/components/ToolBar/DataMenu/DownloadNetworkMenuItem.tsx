import { MenuItem } from '@mui/material'
import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

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
import { VisualStyleOptions } from '../../../models/VisualStyleModel/VisualStyleOptions'
import { useMessageStore } from '../../../store/MessageStore'
import { useOpaqueAspectStore } from '../../../store/OpaqueAspectStore'
import { MessageSeverity } from '../../../models/MessageModel'

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
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      table.nodeTable,
      table.edgeTable,
      visualStyleOptions,
      viewModel,
      summary.name,
      opaqueAspects,
    )
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
      console.error('Failed to download the current network as file:', error)
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
      Download Network as File (.cx2)
    </MenuItem>
  )
  return <>{menuItem}</>
}
