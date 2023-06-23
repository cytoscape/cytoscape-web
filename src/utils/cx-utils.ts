import { Cx2 } from '../models/CxModel/Cx2'
import NetworkFn, { Network, NetworkAttributes } from '../models/NetworkModel'
import TableFn, { Table } from '../models/TableModel'
import ViewModelFn, { NetworkView } from '../models/ViewModel'
import VisualStyleFn, { VisualStyle } from '../models/VisualStyleModel'
import { v4 as uuidv4 } from 'uuid'
import {
  getNetworkFromDb,
  getTablesFromDb,
  getNetworkViewFromDb,
  getVisualStyleFromDb,
  putNetworkToDb,
  putNetworkViewToDb,
  putTablesToDb,
  putVisualStyleToDb,
} from '../store/persist/db'
import { CachedData } from './CachedData'

/**
 * An utility interface to hold all the data needed to build a network view
 */
export interface NetworkWithView {
  network: Network
  networkAttributes?: NetworkAttributes
  nodeTable: Table
  edgeTable: Table
  visualStyle: VisualStyle
  networkView: NetworkView
}

/**
 *
 * Utility function to create a full network view from CX2
 *
 * @param cx2
 * @param id
 * @returns
 */
export const createNetworkViewFromCx2 = (
  cx2: Cx2,
  id?: string,
): NetworkWithView => {
  // Use standard UUID v4 if id is not provided
  const uuid: string = id !== undefined ? id : uuidv4()

  const network: Network = NetworkFn.createNetworkFromCx(uuid, cx2)
  const [nodeTable, edgeTable]: [Table, Table] = TableFn.createTablesFromCx(
    uuid,
    cx2,
  )

  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyleFromCx(cx2)
  const networkView: NetworkView = ViewModelFn.createViewModelFromCX(uuid, cx2)

  return { network, nodeTable, edgeTable, visualStyle, networkView }
}

export const getCachedData = async (id: string): Promise<CachedData> => {
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

export const createDataFromCx = async (
  ndexNetworkId: string,
  cxData: Cx2,
): Promise<NetworkWithView> => {
  const network: Network = NetworkFn.createNetworkFromCx(ndexNetworkId, cxData)
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