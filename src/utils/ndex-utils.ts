import { IdType } from '../models/IdType'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { getNdexClient } from './fetchers'
import {
  CyApp,
  NdexNetworkSummary,
  Network,
  NetworkView,
  Table,
  VisualStyle,
} from '../models'
import { VisualStyleOptions } from '../models/VisualStyleModel/VisualStyleOptions'
import { exportNetworkToCx2 } from '../store/io/exportCX'
import { TableRecord } from '../models/StoreModel/TableStoreModel'
import { useNdexNetwork } from '../store/hooks/useNdexNetwork'
import { OpaqueAspects } from '../models/OpaqueAspectModel'
import { ndexSummaryFetcher } from '../store/hooks/useNdexNetworkSummary'
import { waitSeconds } from './wait-seconds'
import { MessageSeverity } from '../models/MessageModel'
import { useWorkspaceStore } from '../store/WorkspaceStore'
import { useNetworkSummaryStore } from '../store/NetworkSummaryStore'
import { useMessageStore } from '../store/MessageStore'
import { getWorkspaceFromDb } from '../store/persist/db'
import { AppStatus } from '../models/AppModel/AppStatus'
import { ServiceApp } from '../models/AppModel/ServiceApp'

export const TimeOutErrorMessage =
  'You network has been saved in NDEx, but the server is under heavy load right now. Please use the “Open Networks from NDEx” menu to manually open this network from your account later.'
export const TimeOutErrorIndicator = 'NDEx_TIMEOUT_ERROR'
export const NdexDuplicateKeyErrorMessage =
  'duplicate key value violates unique constraint'

export const translateMemberIds = async ({
  networkUUID,
  ids,
  accessToken,
  url,
}: {
  networkUUID: IdType
  ids: string[]
  url: string
  accessToken?: string
}): Promise<string[]> => {
  if (!url) {
    throw new Error('Server URL is not provided')
  }

  const ndexClient: NDEx = getNdexClient(url, accessToken)
  const geneNameMap = await ndexClient.getAttributesOfSelectedNodes(
    networkUUID,
    {
      ids,
      attributeNames: ['name'],
    },
    accessToken,
  )

  const geneNames = Object.values(geneNameMap).map(
    (o: { name: string }) => o.name,
  )
  return geneNames
}

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

export const getNDExSummaryStatus = async (
  uuid: string,
  baseUrl: string,
  accessToken: string,
): Promise<{ rejected: boolean; modificationTime?: Date }> => {
  const MAX_TRIES = 13
  let interval = 0.5
  let tries = 0

  await waitSeconds(0.2) // initial wait
  while (tries < MAX_TRIES) {
    tries += 1
    const newSummary = await ndexSummaryFetcher(uuid, baseUrl, accessToken)

    if (newSummary[0].completed === true) {
      if (newSummary[0].errorMessage) {
        return {
          rejected: true,
        }
      }
      return {
        rejected: false,
        modificationTime: newSummary[0].modificationTime,
      }
    }
    if (tries >= 10) {
      // after 10 tries, increase the interval to 5 seconds
      interval = 5
    } else if (tries >= 3) {
      // after 3 tries, increase the interval to 1 second
      interval = 1
    }
    await waitSeconds(interval)
  }
  throw new Error(TimeOutErrorIndicator)
}

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
    addNetworkToWorkspace(uuid as IdType) // add the new network to the workspace
    if (setCurrentNetworkId) setCurrentNetworkId(uuid as string)
    if (deleteOriginal === true) {
      deleteNetworkFromWorkspace(network.id) // delete the original network from the workspace
    }
    return uuid
  }
  return saveCopyToNDEx
}

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
    currentNetworkId?: string,
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
          const res = await useNdexNetwork(networkId, ndexBaseUrl, accessToken)
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
        console.error(e)
      }
    }

    // Save workspace to NDEx
    const activeApps = Object.keys(apps).filter(
      (key) => apps[key].status === AppStatus.Active,
    )
    const serviceAppNames = Object.keys(serviceApps)

    if (isUpdate) {
      await ndexClient.updateCyWebWorkspace(
        workspaceToBeOverwritten ?? currentWorkspaceId, 
        {
          name: workspaceName,
          options: {
            currentNetwork: currentNetworkId ?? '',
            activeApps: activeApps,
            serviceApps: serviceAppNames,
          },
          networkIDs: allNetworkId,
        },
      )
      if (workspaceToBeOverwritten) {
        setId(workspaceToBeOverwritten)
      }
    } else {
      const workspace = await getWorkspaceFromDb(currentWorkspaceId)
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
