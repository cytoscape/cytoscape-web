import { CyNDEx } from '@js4cytoscape/ndex-client'

import { logApi } from '../../debug'
import { exportCyNetworkToCx2 } from '../../models/CxModel/impl'
import { CyNetwork } from '../../models/CyNetworkModel'
import { IdType } from '../../models/IdType'
import { MessageSeverity } from '../../models/MessageModel'
import { Network } from '../../models/NetworkModel'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { createNetworkSummary } from '../../models/NetworkSummaryModel/impl/networkSummaryImpl'
import { OpaqueAspects } from '../../models/OpaqueAspectModel'
import { TableRecord } from '../../models/StoreModel/TableStoreModel'
import { NetworkView } from '../../models/ViewModel'
import { VisualStyle } from '../../models/VisualStyleModel'
import { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'
import { useMessageStore } from './stores/MessageStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from './stores/OpaqueAspectStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'

export const useOpenNetworkInCytoscape = () => {
  const addMessage = useMessageStore((state) => state.addMessage)

  const openNetworkInCytoscape = async (
    network: Network,
    visualStyle: VisualStyle,
    summary: NetworkSummary | undefined,
    table: TableRecord,
    visualStyleOptions: VisualStyleOptions,
    viewModel: NetworkView | undefined,
    opaqueAspects: OpaqueAspects | undefined,
    cyndex: CyNDEx,
    networkLabel?: string,
  ): Promise<void> => {
    if (viewModel === undefined) {
      addMessage({
        message: 'Could not find the current network view model.',
        duration: 4000,
        severity: MessageSeverity.WARNING,
      })
      return
    }

    let exportSummary: any = summary
    if (summary === undefined) {
      exportSummary = createNetworkSummary({
        networkId: network.id,
        name: networkLabel ?? 'Interaction Network',
        properties: [],
        externalId: '',
        isReadOnly: false,
        isShowcase: false,
        owner: '',
        nodeCount: network.nodes.length,
        edgeCount: network.edges.length,
      })
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
    const cx = exportCyNetworkToCx2(
      cyNetwork,
      exportSummary,
      `Copy of ${exportSummary.name}`,
    )

    try {
      addMessage({
        message: 'Sending this network to Cytoscape Desktop...',
        duration: 3000,
        severity: MessageSeverity.INFO,
      })

      const networkName = exportSummary?.name ?? 'Cytoscape Web Network'
      await cyndex.postCX2NetworkToCytoscape(
        JSON.stringify(cx),
        networkName,
        networkName,
      )

      addMessage({
        message: 'Network successfully opened in Cytoscape Desktop.',
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (error) {
      addMessage({
        message:
          'To use this feature, you need Cytoscape 3.6.0 or higher running on your machine (default port: 1234) and the CyNDEx-2 app installed.',
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
      logApi.error(
        `[${useOpenNetworkInCytoscape.name}]: Could not open the network in Cytoscape Desktop!`,
        error,
      )
    }
  }

  return openNetworkInCytoscape
}

/**
 * Returns a function that opens a network in Cytoscape Desktop by id, gathering
 * the network's data from the stores for the caller.
 *
 * Only the current network's data is loaded in the stores, so in practice this
 * can only run for `currentNetworkId`; callers are responsible for offering it
 * just for that network.
 */
export const useOpenNetworkInCytoscapeFromStores = () => {
  const openNetworkInCytoscape = useOpenNetworkInCytoscape()

  const openNetworkInCytoscapeFromStores = async (
    networkId: IdType,
    networkLabel?: string,
  ): Promise<void> => {
    const network = useNetworkStore
      .getState()
      .networks.get(networkId) as Network
    const visualStyle = useVisualStyleStore.getState().visualStyles[networkId]
    const summary = useNetworkSummaryStore.getState().summaries[networkId]
    const table = useTableStore.getState().tables[networkId]
    const visualStyleOptions =
      useUiStateStore.getState().ui.visualStyleOptions[networkId]
    const viewModel = useViewModelStore.getState().getViewModel(networkId)
    const opaqueAspects =
      useOpaqueAspectStore.getState().opaqueAspects[networkId]

    await openNetworkInCytoscape(
      network,
      visualStyle,
      summary,
      table,
      visualStyleOptions,
      viewModel,
      opaqueAspects,
      new CyNDEx(),
      networkLabel,
    )
  }

  return openNetworkInCytoscapeFromStores
}
