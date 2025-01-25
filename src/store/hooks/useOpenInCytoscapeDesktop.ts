import { useMessageStore } from '../MessageStore'
// @ts-expect-error-next-line
import { CyNDEx } from '@js4cytoscape/ndex-client'
import { exportNetworkToCx2 } from '../io/exportCX'
import { MessageSeverity } from '../../models/MessageModel'
import { Network } from '../../models/NetworkModel'
import { NetworkView } from '../../models/ViewModel'
import {
  NdexNetworkSummary,
  OpaqueAspects,
  TableRecord,
  VisualStyle,
} from '../../models'
import { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'

export const useOpenNetworkInCytoscape = () => {
  const addMessage = useMessageStore((state) => state.addMessage)

  const openNetworkInCytoscape = async (
    network: Network,
    visualStyle: VisualStyle,
    summary: NdexNetworkSummary | undefined,
    table: TableRecord,
    visualStyleOptions: VisualStyleOptions,
    viewModel: NetworkView | undefined,
    opaqueAspects: OpaqueAspects|undefined,
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
        exportSummary = {
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
      exportSummary,
      table.nodeTable,
      table.edgeTable,
      visualStyleOptions,
      viewModel,
      `Copy of ${exportSummary.name}`,
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
    } catch (error) {
      addMessage({
        message:
          'To use this feature, you need Cytoscape 3.6.0 or higher running on your machine (default port: 1234) and the CyNDEx-2 app installed.',
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
      console.error('Could not open the network in Cytoscape Desktop!', error)
    }
  }

  return openNetworkInCytoscape
}
