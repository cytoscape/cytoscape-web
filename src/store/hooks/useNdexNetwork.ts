import NetworkFn, { Network } from '../../models/NetworkModel'
import TableFn, { Table } from '../../models/TableModel'
import VisualStyleFn, { VisualStyle } from '../../models/VisualStyleModel'
import { Cx2 } from '../../models/CxModel/Cx2'
import {
  putNetworkToDb,
  putTablesToDb,
  putVisualStyleToDb,
  getNetworkFromDb,
  getTablesFromDb,
  getVisualStyleFromDb,
  putNetworkViewToDb,
  getNetworkViewFromDb,
} from '../persist/db'

import ViewModelFn, { NetworkView } from '../../models/ViewModel'

// TODO: Make client TS compatible
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'

interface FullNetworkData {
  network: Network
  nodeTable: Table
  edgeTable: Table
  visualStyle: VisualStyle
  networkView: NetworkView
}

export const useNdexNetwork = async (
  ndexNetworkId: string,
  url: string,
  accessToken?: string,
): Promise<FullNetworkData> => {
  try {
    // First, check the local cache
    const cache: CachedData = await getCachedData(ndexNetworkId)

    // This is necessary only when data is not in the cache
    if (
      cache.network === undefined ||
      cache.nodeTable === undefined ||
      cache.edgeTable === undefined ||
      cache.visualStyle === undefined ||
      cache.networkView === undefined
    ) {
      return await createDataFromCx(ndexNetworkId, url, accessToken)
    } else {
      return {
        network: cache.network,
        nodeTable: cache.nodeTable,
        edgeTable: cache.edgeTable,
        visualStyle: cache.visualStyle,
        networkView: cache.networkView,
      }
    }
  } catch (error) {
    console.error('Failed to get network', error)
    throw error
  }
}

/**
 *
 * @param ndexNetworkId
 * @param url
 * @returns
 */
const createDataFromCx = async (
  ndexNetworkId: string,
  url: string,
  accessToken?: string,
): Promise<FullNetworkData> => {
  const cxData: Cx2 = await ndexNetworkFetcher(ndexNetworkId, url, accessToken)
  const network: Network = NetworkFn.createNetworkFromCx(ndexNetworkId, cxData)
  // FIXME: This should be replaced to correct DB operation
  await putNetworkToDb(network)

  const [nodeTable, edgeTable]: [Table, Table] = TableFn.createTablesFromCx(
    ndexNetworkId,
    cxData,
  )
  await putTablesToDb(ndexNetworkId, nodeTable, edgeTable)

  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyleFromCx(cxData)
  await putVisualStyleToDb(ndexNetworkId, visualStyle)

  const networkView: NetworkView = ViewModelFn.createViewModelFromCX(
    ndexNetworkId,
    cxData,
  )
  await putNetworkViewToDb(ndexNetworkId, networkView)

  return { network, nodeTable, edgeTable, visualStyle, networkView }
}

interface CachedData {
  network?: Network
  nodeTable?: Table
  edgeTable?: Table
  visualStyle?: VisualStyle
  networkView?: NetworkView
}

const getCachedData = async (id: string): Promise<CachedData> => {
  const network = await getNetworkFromDb(id)
  const tables = await getTablesFromDb(id)
  const networkView = await getNetworkViewFromDb(id)
  const visualStyle = await getVisualStyleFromDb(id)

  return {
    network,
    visualStyle,
    nodeTable: tables !== undefined ? tables.nodeTable : undefined,
    edgeTable: tables !== undefined ? tables.edgeTable : undefined,
    networkView,
  }
}

const ndexNetworkFetcher = async (
  ndexUuid: string,
  url: string,
  accessToken?: string,
): Promise<Cx2> => {
  const ndexClient = new NDEx(url)

  if (accessToken !== undefined && accessToken !== '') {
    ndexClient.setAuthToken(accessToken)
  }
  const cx2Network: Promise<Cx2> = ndexClient.getCX2Network(ndexUuid)
  return await cx2Network
}
