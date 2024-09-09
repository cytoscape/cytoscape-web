import { IdType } from '../models/IdType'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { getNdexClient } from './fetchers'
import { Message, NdexNetworkSummary, Network, NetworkView, Table, VisualStyle } from '../models'
import { VisualStyleOptions } from '../models/VisualStyleModel/VisualStyleOptions'
import { exportNetworkToCx2 } from '../store/io/exportCX'
import { TableRecord } from 'src/models/StoreModel/TableStoreModel'
import { useNdexNetwork } from '../store/hooks/useNdexNetwork'

export const ndexDuplicateKeyErrorMessage = 'duplicate key value violates unique constraint'

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

export const fetchMyWorkspaces = async (ndexBaseUrl:string,getToken:()=> Promise<string>): Promise<any> => {
  const ndexClient = new NDEx(ndexBaseUrl)
  const token = await getToken()
  ndexClient.setAuthToken(token)
  const myWorkspaces = await ndexClient.getUserCyWebWorkspaces()
  return myWorkspaces
}

export const saveCopyToNDEx = async (
  ndexBaseUrl:string,
  getToken:()=> Promise<string>,
  addNetworkToWorkspace: (ids: string | string[]) => void,
  network: Network,
  visualStyle: VisualStyle,
  summary: NdexNetworkSummary,
  nodeTable: Table,
  edgeTable: Table,
  viewModel: NetworkView,
  visualStyleOptions?: VisualStyleOptions,
): Promise<void> => {
  const ndexClient = new NDEx(ndexBaseUrl)
  const accessToken = await getToken()
  ndexClient.setAuthToken(accessToken)
  const cx = exportNetworkToCx2(
    network,
    visualStyle,
    summary,
    nodeTable,
    edgeTable,
    visualStyleOptions,
    viewModel,
    `Copy of ${summary.name}`,
  )
  const { uuid } = await ndexClient.createNetworkFromRawCX2(cx)
  addNetworkToWorkspace(uuid as IdType)
}

export const saveNetworkToNDEx = async (
  ndexBaseUrl:string,
  getToken:()=> Promise<string>,
  updateSummary:(id: string, summary: Partial<NdexNetworkSummary>) => void,
  networkId: string,
  network: Network,
  visualStyle: VisualStyle,
  summary: NdexNetworkSummary,
  nodeTable: Table,
  edgeTable: Table,
  viewModel: NetworkView,
  visualStyleOptions?: VisualStyleOptions,
): Promise<void> => {
  const ndexClient = new NDEx(ndexBaseUrl)
  const accessToken = await getToken()
  ndexClient.setAuthToken(accessToken)
  const cx = exportNetworkToCx2(
    network,
    visualStyle,
    summary,
    nodeTable,
    edgeTable,
    visualStyleOptions,
    viewModel,
  )
  await ndexClient.updateNetworkFromRawCX2(networkId, cx)
  const ndexSummary = await ndexClient.getNetworkSummary(networkId)
  const newNdexModificationTime = ndexSummary.modificationTime
  updateSummary(networkId, {
    modificationTime: newNdexModificationTime,
  })
}

export const saveAllNetworks = async (
  getToken:()=> Promise<string>,
  allNetworkId: string[],
  ndexBaseUrl:string,
  addNetworkToWorkspace: (ids: string | string[]) => void,
  networkModifiedStatus: Record<string, boolean | undefined>,
  updateSummary:(id: string, summary: Partial<NdexNetworkSummary>) => void,
  deleteNetworkModifiedStatus: (networkId: string) => void,
  addMessage: (message: Message) => void,
  networks: Map<string, Network>,
  visualStyles: Record<string, VisualStyle>,
  summaries: Record<string, NdexNetworkSummary>,
  tables: Record<string, TableRecord>,
  viewModels: Record<string, NetworkView[]>,
  networkVisualStyleOpt: Record<string, VisualStyleOptions>,
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

    if (!network || !visualStyle || !nodeTable || !edgeTable) {
      const currentToken = await getToken()
      const res = await useNdexNetwork(networkId, ndexBaseUrl, currentToken)
      // Using parentheses to perform destructuring assignment correctly
      ;({
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews,
        visualStyleOptions,
      } = res)
    }
    if (summary.isNdex === false) {
      await saveCopyToNDEx(
        ndexBaseUrl,
        getToken,
        addNetworkToWorkspace,
        network,
        visualStyle,
        summary,
        nodeTable,
        edgeTable,
        networkViews?.[0],
        visualStyleOptions,
      )
      continue
    }
    if (networkModifiedStatus[networkId] === true) {
      try {
        await saveNetworkToNDEx(
          ndexBaseUrl,
          getToken,
          updateSummary,
          networkId,
          network,
          visualStyle,
          summary,
          nodeTable,
          edgeTable,
          networkViews?.[0],
          visualStyleOptions,
        )
        deleteNetworkModifiedStatus(networkId)
      } catch (e) {
        try {
          await saveCopyToNDEx(
            ndexBaseUrl,
            getToken,
            addNetworkToWorkspace,
            network,
            visualStyle,
            summary,
            nodeTable,
            edgeTable,
            networkViews?.[0],
            visualStyleOptions,
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