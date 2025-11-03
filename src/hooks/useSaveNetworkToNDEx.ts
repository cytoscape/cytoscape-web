import {
  NdexNetworkSummary,
  Network,
  NetworkView,
  Table,
  VisualStyle,
} from '../models'
import { VisualStyleOptions } from '../models/VisualStyleModel/VisualStyleOptions'
import { exportNetworkToCx2 } from '../models/CxModel/impl'
import { OpaqueAspects } from '../models/OpaqueAspectModel'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import {
  updateNdexNetwork,
  fetchNdexSummaries,
  getNetworkValidationStatus,
} from '../api/ndex'

/**
 * Hook that returns a function to save a network to NDEx.
 *
 * Updates an existing network in NDEx.
 *
 * @returns Function to save a network to NDEx
 */
export const useSaveNetworkToNDEx = () => {
  const updateSummary = useNetworkSummaryStore((state) => state.update)
  const saveNetworkToNDEx = async (
    accessToken: string,
    networkId: string,
    network: Network,
    visualStyle: VisualStyle,
    summary: NdexNetworkSummary,
    nodeTable: Table,
    edgeTable: Table,
    viewModel?: NetworkView,
    visualStyleOptions?: VisualStyleOptions,
    opaqueAspect?: OpaqueAspects,
  ): Promise<void> => {
    if (viewModel === undefined) {
      throw new Error('Could not find the current network view model.')
    }
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      nodeTable,
      edgeTable,
      visualStyleOptions,
      viewModel,
      undefined,
      opaqueAspect,
    )
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
