/**
 * NDEx Workspace Operations
 *
 * Functions for managing workspaces, saving networks, and workspace-related operations.
 */
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { IdType } from '../../models/IdType'
import {
  CyApp,
  NdexNetworkSummary,
  Network,
  NetworkView,
  Table,
  VisualStyle,
} from '../../models'
import { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'
import { exportNetworkToCx2 } from '../../models/CxModel/impl'
import { TableRecord } from '../../models/StoreModel/TableStoreModel'
import { getModelsFromCacheOrNdex } from '../../store/getModelsFromCacheOrNdex'
import { OpaqueAspects } from '../../models/OpaqueAspectModel'
import { ndexSummaryFetcher } from '../../store/getNetworkSummaryFromCacheOrNdex'
import { waitSeconds } from '../../utils/wait-seconds'
import { MessageSeverity } from '../../models/MessageModel'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { useMessageStore } from '../../store/MessageStore'
import {
  getWorkspaceFromDb,
  putNetworkSummaryToDb,
} from '../../store/persist/db'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { ServiceApp } from '../../models/AppModel/ServiceApp'
import { logApi } from '../../debug'
import { useUrlNavigation } from '../../store/hooks/useUrlNavigation/useUrlNavigation'
import { getNDExSummaryStatus } from './status'

export const TimeOutErrorMessage =
  'You network has been saved in NDEx, but the server is under heavy load right now. Please use the "Open Networks from NDEx" menu to manually open this network from your account later.'
export const TimeOutErrorIndicator = 'NDEx_TIMEOUT_ERROR'
export const NdexDuplicateKeyErrorMessage =
  'duplicate key value violates unique constraint'

/**
 * Fetches the user's workspaces from NDEx.
 *
 * @param ndexBaseUrl - NDEx base URL
 * @param getToken - Function that returns a Promise resolving to an access token
 * @returns Promise resolving to array of workspaces
 */
export const fetchMyWorkspaces = async (
  ndexBaseUrl: string,
  getToken: () => Promise<string>,
): Promise<any[]> => {
  const ndexClient = new NDEx(ndexBaseUrl)
  const token = await getToken()
  ndexClient.setAuthToken(token)
  const myWorkspaces = await ndexClient.getUserCyWebWorkspaces()
  return myWorkspaces as any[]
}

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
    ndexBaseUrl: string,
    accessToken: string,
    ndexClient: NDEx,
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
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      nodeTable,
      edgeTable,
      visualStyleOptions,
      viewModel,
      deleteOriginal ? summary.name : `Copy of ${summary.name}`,
      opaqueAspect,
    )
    const { uuid } = await ndexClient.createNetworkFromRawCX2(cx)
    const summaryStatus = await getNDExSummaryStatus(
      uuid as string,
      ndexBaseUrl,
      accessToken,
    )

    if (summaryStatus.rejected) {
      throw new Error('The network is rejected by NDEx')
    }

    const newSummary = await ndexSummaryFetcher(uuid, ndexBaseUrl, accessToken)
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
    ndexBaseUrl: string,
    accessToken: string,
    ndexClient: NDEx,
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
    await ndexClient.updateNetworkFromRawCX2(networkId, cx)
    const summaryStatus = await getNDExSummaryStatus(
      networkId as string,
      ndexBaseUrl,
      accessToken,
    )
    if (summaryStatus.rejected) {
      throw new Error('The network is rejected by NDEx')
    }

    updateSummary(networkId, {
      modificationTime: summaryStatus.modificationTime,
    })
  }
  return saveNetworkToNDEx
}

/**
 * Hook that returns a function to save a workspace to NDEx.
 *
 * Saves all networks in the workspace and the workspace itself to NDEx.
 *
 * @returns Function to save a workspace to NDEx
 */
export const useSaveWorkspace = () => {
  const deleteNetworkModifiedStatus = useWorkspaceStore(
    (state) => state.deleteNetworkModifiedStatus,
  )
  const addMessage = useMessageStore((state) => state.addMessage)
  const saveNetworkToNDEx = useSaveNetworkToNDEx()
  const saveCopyToNDEx = useSaveCopyToNDEx()
  const setId = useWorkspaceStore((state) => state.setId)
  const renameWorkspace = useWorkspaceStore((state) => state.setName)
  const setIsRemote = useWorkspaceStore((state) => state.setIsRemote)

  const saveWorkspace = async (
    accessToken: string,
    ndexBaseUrl: string,
    ndexClient: NDEx,
    allNetworkId: string[],
    networkModifiedStatus: Record<string, boolean | undefined>,
    networks: Map<string, Network>,
    visualStyles: Record<string, VisualStyle>,
    summaries: Record<string, NdexNetworkSummary>,
    tables: Record<string, TableRecord>,
    viewModels: Record<string, NetworkView[]>,
    networkVisualStyleOpt: Record<string, VisualStyleOptions>,
    opaqueAspects: Record<string, OpaqueAspects>,
    isUpdate: boolean,
    workspaceName: string,
    currentWorkspaceId: string,
    apps: Record<string, CyApp>,
    serviceApps: Record<string, ServiceApp>,
    workspaceToBeOverwritten?: string,
  ): Promise<void> => {
    ndexClient.setAuthToken(accessToken)
    // Save all networks to NDEx
    for (const networkId of allNetworkId) {
      let network = networks.get(networkId) as Network
      let visualStyle = visualStyles[networkId]
      const summary = summaries[networkId]
      let nodeTable = tables[networkId]?.nodeTable
      let edgeTable = tables[networkId]?.edgeTable
      let networkViews: NetworkView[] = viewModels[networkId]
      let visualStyleOptions: VisualStyleOptions | undefined =
        networkVisualStyleOpt[networkId]

      let opaqueAspect = opaqueAspects[networkId]

      try {
        if (!network || !visualStyle || !nodeTable || !edgeTable) {
          const res = await getModelsFromCacheOrNdex(
            networkId,
            ndexBaseUrl,
            accessToken,
          )
          // Using parentheses to perform destructuring assignment correctly
          ;({
            network,
            nodeTable,
            edgeTable,
            visualStyle,
            networkViews,
            visualStyleOptions,
          } = res)

          if (res.otherAspects) {
            opaqueAspect = res.otherAspects.reduce(
              (acc: OpaqueAspects, aspect: OpaqueAspects) => {
                const [aspectName, aspectData] = Object.entries(aspect)[0]
                acc[aspectName] = aspectData
                return acc
              },
              {} as OpaqueAspects,
            )
          } else {
            opaqueAspect = {}
          }
        }
        if (summary.isNdex === false) {
          await saveCopyToNDEx(
            ndexBaseUrl,
            accessToken,
            ndexClient,
            network,
            visualStyle,
            summary,
            nodeTable,
            edgeTable,
            networkViews?.[0],
            visualStyleOptions,
            opaqueAspect,
            true,
          )
          continue
        }

        if (networkModifiedStatus[networkId] === true) {
          await saveNetworkToNDEx(
            ndexBaseUrl,
            accessToken,
            ndexClient,
            networkId,
            network,
            visualStyle,
            summary,
            nodeTable,
            edgeTable,
            networkViews?.[0],
            visualStyleOptions,
            opaqueAspect,
          )
          deleteNetworkModifiedStatus(networkId)
        }
      } catch (e) {
        if (e.message.includes(TimeOutErrorIndicator)) {
          addMessage({
            message: TimeOutErrorMessage,
            duration: 3000,
            severity: MessageSeverity.ERROR,
          })
        } else {
          addMessage({
            message: `Error: Unable to save ${summary.isNdex ? 'the network' : 'a copy of the local network'}(${summary.name}) to NDEx: ${
              e.message as string
            }`,
            duration: 3000,
            severity: MessageSeverity.ERROR,
          })
        }
        logApi.error(
          `[${saveWorkspace.name}]:[${networkId}]: Unable to save workspace ${e}`,
        )
      }
    }

    // Save workspace to NDEx
    const activeApps = Object.keys(apps).filter(
      (key) => apps[key].status === AppStatus.Active,
    )
    const serviceAppNames = Object.keys(serviceApps)
    const workspace = await getWorkspaceFromDb(currentWorkspaceId)
    if (isUpdate) {
      await ndexClient.updateCyWebWorkspace(
        workspaceToBeOverwritten ?? currentWorkspaceId,
        {
          name: workspaceName,
          options: {
            currentNetwork: workspace.currentNetworkId,
            activeApps: activeApps,
            serviceApps: serviceAppNames,
          },
          networkIDs: workspace.networkIds,
        },
      )
      if (workspaceToBeOverwritten) {
        setId(workspaceToBeOverwritten)
      }
    } else {
      const response = await ndexClient.createCyWebWorkspace({
        name: workspaceName,
        options: {
          currentNetwork: workspace.currentNetworkId,
          activeApps: activeApps,
          serviceApps: serviceAppNames,
        },
        networkIDs: workspace.networkIds,
      })
      const { uuid } = response
      setId(uuid)
    }
    setIsRemote(true)
    renameWorkspace(workspaceName)
    addMessage({
      message: 'Saved workspace to NDEx successfully.',
      duration: 3000,
      severity: MessageSeverity.SUCCESS,
    })
  }
  return saveWorkspace
}
