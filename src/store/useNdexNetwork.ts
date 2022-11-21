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
  putVisualStylesToDb,
  getNetworkFromDb,
  getTablesFromDb,
  getVisualStyleFromDb,
} from './persist/db'

import { useVisualStyleStore } from './VisualStyleStore'
import { useNetworkStore } from './NetworkStore'
import { useTableStore } from './TableStore'
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
  const networks: Record<IdType, Network> = useNetworkStore(
    (state) => state.networks,
  )

  const network: Network | undefined = networks[id]

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
  putNetworkToDb(id, network)
  putTablesToDb(id, nodeTable, edgeTable)
  putVisualStylesToDb(id, visualStyle)

  return { network, visualStyle, nodeTable, edgeTable }
}
