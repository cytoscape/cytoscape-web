import { Cx2 } from '../models/CxModel/Cx2'
import NetworkFn, { Network } from '../models/NetworkModel'
import TableFn, { Table } from '../models/TableModel'
import ViewModelFn, { NetworkView } from '../models/ViewModel'
import VisualStyleFn, { VisualStyle } from '../models/VisualStyleModel'
import { v4 as uuidv4 } from 'uuid'

/**
 * An utility interface to hold all the data needed to build a network view
 */
export interface NetworkWithView {
  network: Network
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
