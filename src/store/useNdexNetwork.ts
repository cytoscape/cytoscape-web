/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * Custgom hook to get network object
 */
import { useContext } from 'react'
import { AppConfigContext } from '../AppConfigContext'
import { IdType } from '../models/IdType'
import NetworkFn, { Network } from '../models/NetworkModel'
import TableFn, { Table } from '../models/TableModel'
import VisualStyleFn, { VisualStyle } from '../models/VisualStyleModel'
import { Cx2 } from '../utils/cx/Cx2'
import {
  putNetworkToDb,
  putTablesToDb,
  putVisualStyleToDb,
  getNetworkFromDb,
  getTablesFromDb,
  getVisualStyleFromDb,
  putNetworkViewToDb,
  getNetworkViewFromDb,
} from './persist/db'

import { useVisualStyleStore } from './VisualStyleStore'
import { useNetworkStore } from './NetworkStore'
import { useTableStore } from './TableStore'
import ViewModelFn, { NetworkView } from '../models/ViewModel'

// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'

/**
 * Custom Hook to fetch data from remote or local Cache
 * State will be shared via globaz zustand store
 *
 *
 * @param url
 * @returns
 */
export const useNdexNetwork = (
  id: IdType,
  fetcher: (
    id: string,
    url: string,
  ) => Promise<{
    network: Network
    visualStyle: VisualStyle
    nodeTable: Table
    edgeTable: Table
  }> = networkFetcher,
): Network => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const ndexUrl = `${ndexBaseUrl}/networks/${id}`

  // Network Store
  const addNewNetwork = useNetworkStore((state) => state.add)

  // Visual Style Store
  const setVisualStyle = useVisualStyleStore((state) => state.set)

  // Table Store
  const setTables = useTableStore((state) => state.setTables)

  // Global state via zustand
  const networks: Map<IdType, Network> = useNetworkStore(
    (state) => state.networks,
  )

  const network: Network | undefined = networks.get(id)

  if (network == null) {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw fetcher(id, ndexUrl).then(
      ({ network, visualStyle, nodeTable, edgeTable }) => {
        addNewNetwork(network)
        setVisualStyle(id, visualStyle)
        setTables(id, nodeTable, edgeTable)
      },
    )
  }
  return network
}

export const networkFetcher = async (
  id: IdType,
  url: string,
): Promise<{
  network: Network
  visualStyle: VisualStyle
  nodeTable: Table
  edgeTable: Table
}> => {
  // Try local DB first
  const cachedNetwork = await getNetworkFromDb(id)
  const cachedVisualStyle = await getVisualStyleFromDb(id)
  const cachedTables = await getTablesFromDb(id)

  if (cachedNetwork !== undefined) {
    return {
      network: cachedNetwork,
      visualStyle: cachedVisualStyle ?? VisualStyleFn.createVisualStyle(),
      nodeTable: cachedTables.nodeTable ?? TableFn.createTable(id),
      edgeTable: cachedTables.edgeTable ?? TableFn.createTable(id),
    }
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Error! status: ${response.status}`)
  }

  const cxData: Cx2 = (await response.json()) as Cx2
  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyleFromCx(cxData)
  const network: Network = NetworkFn.createNetworkFromCx(id, cxData)
  const [nodeTable, edgeTable]: [Table, Table] = TableFn.createTablesFromCx(
    id,
    cxData,
  )

  // Add network to local IndexedDB
  putNetworkToDb(network)
  putTablesToDb(id, nodeTable, edgeTable)
  putVisualStyleToDb(id, visualStyle)

  return { network, visualStyle, nodeTable, edgeTable }
}

interface FullNetworkData {
  network: Network
  nodeTable: Table
  edgeTable: Table
  visualStyle: VisualStyle
  networkView: NetworkView
}

export const getNdexNetwork = async (
  ndexNetworkId: string,
  url: string,
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
      return await createDataFromCx(ndexNetworkId, url)
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
): Promise<FullNetworkData> => {
  const cxData: Cx2 = await ndexNetworkFetcher(ndexNetworkId, url)
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
): Promise<Cx2> => {
  const ndexClient = new NDEx(`${url}/v2`)
  const cx2Network: Promise<Cx2> = ndexClient.getCX2Network(ndexUuid)
  return await cx2Network
}
