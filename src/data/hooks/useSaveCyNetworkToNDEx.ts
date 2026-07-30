import {
  Network,
  NetworkSummary,
  NetworkView,
  Table,
  VisualStyle,
} from '../../models'
import { exportCyNetworkToCx2 } from '../../models/CxModel/impl'
import {
  hasImageCustomGraphics,
  IMAGE_CUSTOM_GRAPHICS_DESKTOP_WARNING,
  IMAGE_CUSTOM_GRAPHICS_WARNING_DURATION,
} from '../../models/CxModel/impl/customGraphicsCompat'
import { CyNetwork } from '../../models/CyNetworkModel'
import { MessageSeverity } from '../../models/MessageModel'
import { OpaqueAspects } from '../../models/OpaqueAspectModel'
import { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'
import {
  fetchNdexSummaries,
  getNetworkValidationStatus,
  updateNdexNetwork,
} from '../external-api/ndex'
import { useMessageStore } from './stores/MessageStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'

/**
 * Hook that returns a function to save a CyNetwork to NDEx.
 *
 * Updates an existing network in NDEx.
 *
 * @returns Function to save a CyNetwork to NDEx
 */
export const useSaveCyNetworkToNDEx = () => {
  const updateSummary = useNetworkSummaryStore((state) => state.update)
  const addMessage = useMessageStore((state) => state.addMessage)
  const saveNetworkToNDEx = async (
    accessToken: string,
    networkId: string,
    network: Network,
    visualStyle: VisualStyle,
    summary: NetworkSummary,
    nodeTable: Table,
    edgeTable: Table,
    viewModel?: NetworkView,
    visualStyleOptions?: VisualStyleOptions,
    opaqueAspect?: OpaqueAspects,
  ): Promise<void> => {
    if (viewModel === undefined) {
      throw new Error('Could not find the current network view model.')
    }
    const cyNetwork: CyNetwork = {
      network,
      nodeTable,
      edgeTable,
      visualStyle,
      networkViews: [viewModel],
      visualStyleOptions,
      otherAspects: opaqueAspect ? [opaqueAspect as any] : undefined,
      undoRedoStack: {
        undoStack: [],
        redoStack: [],
      },
    }
    const cx = exportCyNetworkToCx2(cyNetwork, summary)

    // Networks saved to NDEx are routinely opened in Cytoscape Desktop from
    // there, where custom-graphic images render as "?" — Desktop loads image
    // bytes from its own pool, not from the network file. Warn, but still save.
    if (hasImageCustomGraphics(cx)) {
      addMessage({
        message: IMAGE_CUSTOM_GRAPHICS_DESKTOP_WARNING,
        duration: IMAGE_CUSTOM_GRAPHICS_WARNING_DURATION,
        severity: MessageSeverity.WARNING,
      })
    }

    await updateNdexNetwork(networkId, cx, accessToken)
    const summaryIsValid = await getNetworkValidationStatus(
      networkId as string,
      accessToken,
    )

    if (!summaryIsValid) {
      throw new Error('The network is rejected by NDEx')
    }

    // Fetch the updated summary to get the modification time
    const updatedSummary = await fetchNdexSummaries(networkId, accessToken)
    if (updatedSummary.length > 0) {
      updateSummary(networkId, {
        modificationTime: updatedSummary[0].modificationTime,
      })
    }
  }
  return saveNetworkToNDEx
}
