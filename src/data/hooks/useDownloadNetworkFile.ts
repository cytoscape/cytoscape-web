import { logUi } from '../../debug'
import { exportCyNetworkToCx2 } from '../../models/CxModel/impl'
import { CyNetwork } from '../../models/CyNetworkModel'
import { IdType } from '../../models/IdType'
import { MessageSeverity } from '../../models/MessageModel'
import { Network } from '../../models/NetworkModel'
import { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'
import { useMessageStore } from './stores/MessageStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from './stores/OpaqueAspectStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'

/**
 * Returns a function that downloads a network as a CX2 file.
 *
 * Only the current network's data is loaded in the stores, so in practice this
 * can only run for `currentNetworkId`; callers are responsible for offering it
 * just for that network.
 */
export const useDownloadNetworkFile = () => {
  const addMessage = useMessageStore((state) => state.addMessage)

  const saveNetworkToFile = (networkId: IdType): void => {
    const network = useNetworkStore
      .getState()
      .networks.get(networkId) as Network
    const table = useTableStore.getState().tables[networkId]
    const summary = useNetworkSummaryStore.getState().summaries[networkId]
    const visualStyle = useVisualStyleStore.getState().visualStyles[networkId]
    const visualStyleOptions = useUiStateStore.getState().ui.visualStyleOptions[
      networkId
    ] as VisualStyleOptions
    const opaqueAspects =
      useOpaqueAspectStore.getState().opaqueAspects[networkId]
    const viewModel = useViewModelStore.getState().getViewModel(networkId)

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
  }

  const downloadNetworkFile = async (networkId: IdType): Promise<void> => {
    try {
      saveNetworkToFile(networkId)
      addMessage({
        message: 'Downloaded the current network successfully.',
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (error) {
      logUi.error(
        `[${useDownloadNetworkFile.name}]: Failed to download the current network as file`,
        error,
      )
      addMessage({
        message: 'Failed to download the current network as file.',
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
    }
  }

  return downloadNetworkFile
}
