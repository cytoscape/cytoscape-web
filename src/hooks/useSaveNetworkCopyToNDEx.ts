import { IdType } from '../models/IdType'
import {
  NdexNetworkSummary,
  Network,
  NetworkView,
  Table,
  VisualStyle,
} from '../models'
import { VisualStyleOptions } from '../models/VisualStyleModel/VisualStyleOptions'
import { exportCyNetworkToCx2 } from '../models/CxModel/impl'
import { CyNetwork } from '../models/CyNetworkModel'
import { OpaqueAspects } from '../models/OpaqueAspectModel'
import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { putNetworkSummaryToDb } from '../db'
import { useUrlNavigation } from './navigation/useUrlNavigation'
import {
  getNdexClient,
  fetchNdexSummaries,
  getNetworkValidationStatus,
} from '../api/ndex'

/**
 * Hook that returns a function to save a copy of a network to NDEx.
 *
 * The copy will be added to the current workspace and optionally replace the original.
 *
 * @returns Function to save a copy of a network to NDEx
 */
export const useSaveCopyToNDEx = () => {
  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )
  const deleteNetworkFromWorkspace = useWorkspaceStore(
    (state) => state.deleteNetwork,
  )
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const { navigateToNetwork } = useUrlNavigation()
  const workspace = useWorkspaceStore((state) => state.workspace)
  const addSummary = useNetworkSummaryStore((state) => state.add)
  const saveCopyToNDEx = async (
    accessToken: string,
    network: Network,
    visualStyle: VisualStyle,
    summary: NdexNetworkSummary,
    nodeTable: Table,
    edgeTable: Table,
    viewModel?: NetworkView,
    visualStyleOptions?: VisualStyleOptions,
    opaqueAspect?: OpaqueAspects,
    deleteOriginal?: boolean,
  ): Promise<string> => {
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
    const cx = exportCyNetworkToCx2(
      cyNetwork,
      summary,
      deleteOriginal ? summary.name : `Copy of ${summary.name}`,
    )
    const ndexClient = getNdexClient(accessToken)
    const { uuid } = await ndexClient.createNetworkFromRawCX2(cx)
    const summaryIsValid = await getNetworkValidationStatus(
      uuid as string,
      accessToken,
    )

    if (!summaryIsValid) {
      throw new Error('The network is rejected by NDEx')
    }

    const newSummary = await fetchNdexSummaries(uuid, accessToken)
    await putNetworkSummaryToDb(newSummary[0])
    addSummary(uuid, newSummary[0])

    addNetworkToWorkspace(uuid as IdType) // add the new network to the workspace
    if (setCurrentNetworkId) {
      setCurrentNetworkId(uuid as string)
      navigateToNetwork({
        workspaceId: workspace.id,
        networkId: uuid as string,
        searchParams: new URLSearchParams(location.search),
        replace: false,
      })
    }
    if (deleteOriginal === true) {
      deleteNetworkFromWorkspace(network.id) // delete the original network from the workspace
      const nextNetworkId =
        workspace.networkIds.filter(
          (networkId) => networkId !== network.id,
        )?.[0] ?? ''
      setCurrentNetworkId(nextNetworkId)
      navigateToNetwork({
        workspaceId: workspace.id,
        networkId: nextNetworkId,
        searchParams: new URLSearchParams(location.search),
        replace: true,
      })
    }
    return uuid
  }
  return saveCopyToNDEx
}
