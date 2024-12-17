import { IdType } from '../models/IdType'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { getNdexClient } from './fetchers'
import {
  Message,
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

export const ndexDuplicateKeyErrorMessage =
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
): Promise<any> => {
  const ndexClient = new NDEx(ndexBaseUrl)
  const token = await getToken()
  ndexClient.setAuthToken(token)
  const myWorkspaces = await ndexClient.getUserCyWebWorkspaces()
  return myWorkspaces
}

export const rejectedByNDEx = async (uuid:string, baseUrl:string, accessToken:string):Promise<boolean> =>{
  const newSummary = await ndexSummaryFetcher(
    uuid,
    baseUrl,
    accessToken,
  )
  if(newSummary[0].completed === false || newSummary[0].errorMessage){
    return true
  }
  return false
}

export const saveCopyToNDEx = async (
  ndexBaseUrl:string,
  accessToken:string,
  ndexClient: NDEx,
  addNetworkToWorkspace: (ids: string | string[]) => void,
  network: Network,
  visualStyle: VisualStyle,
  summary: NdexNetworkSummary,
  nodeTable: Table,
  edgeTable: Table,
  viewModel?: NetworkView,
  visualStyleOptions?: VisualStyleOptions,
  opaqueAspect?: OpaqueAspects,
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
    `Copy of ${summary.name}`,
    opaqueAspect,
  )
  const { uuid } = await ndexClient.createNetworkFromRawCX2(cx)
  const rejected = await rejectedByNDEx(
    uuid as string,
    ndexBaseUrl,
    accessToken,
  )
  if (rejected) {
    throw new Error('The network is rejected by NDEx')
  }
  addNetworkToWorkspace(uuid as IdType)
  return uuid
}

export const saveNetworkToNDEx = async (
  ndexClient: NDEx,
  updateSummary: (id: string, summary: Partial<NdexNetworkSummary>) => void,
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
  const ndexSummary = await ndexClient.getNetworkSummary(networkId)
  if(ndexSummary.completed === false || ndexSummary.errorMessage){
    throw new Error('The network is rejected by NDEx')
  }
  const newNdexModificationTime = ndexSummary.modificationTime
  updateSummary(networkId, {
    modificationTime: newNdexModificationTime,
  })
}

export const saveAllNetworks = async (
  accessToken: string,
  ndexBaseUrl: string,
  ndexClient: NDEx,
  allNetworkId: string[],
  addNetworkToWorkspace: (ids: string | string[]) => void,
  networkModifiedStatus: Record<string, boolean | undefined>,
  updateSummary: (id: string, summary: Partial<NdexNetworkSummary>) => void,
  deleteNetworkModifiedStatus: (networkId: string) => void,
  addMessage: (message: Message) => void,
  networks: Map<string, Network>,
  visualStyles: Record<string, VisualStyle>,
  summaries: Record<string, NdexNetworkSummary>,
  tables: Record<string, TableRecord>,
  viewModels: Record<string, NetworkView[]>,
  networkVisualStyleOpt: Record<string, VisualStyleOptions>,
  opaqueAspects: Record<string, OpaqueAspects>,
): Promise<void> => {
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
        addNetworkToWorkspace,
        network,
        visualStyle,
        summary,
        nodeTable,
        edgeTable,
        networkViews?.[0],
        visualStyleOptions,
        opaqueAspect,
      )
      continue
    }
    if (networkModifiedStatus[networkId] === true) {
      try {
        await saveNetworkToNDEx(
          ndexClient,
          updateSummary,
          networkId,
          network,
          visualStyle,
          summary,
          nodeTable,
          edgeTable,
          networkViews?.[0],
          visualStyleOptions,
          opaqueAspect
        )
        deleteNetworkModifiedStatus(networkId)
      } catch (e) {
        try {
          await saveCopyToNDEx(
            ndexBaseUrl,
            accessToken,
            ndexClient,
            addNetworkToWorkspace,
            network,
            visualStyle,
            summary,
            nodeTable,
            edgeTable,
            networkViews?.[0],
            visualStyleOptions,
            opaqueAspect
          )
          addMessage({
            message: `Unable to save the modified network to NDEx. Instead, saved its copy to NDEx. Error: ${e.message as string}`,
            duration: 3000,
          })
        } catch (e) {
          addMessage({
            message: `Unable to save the network or its copy to NDEx. Error: ${e.message as string}`,
            duration: 3000,
          })
          throw e
        }
      }
    }
  }
}
