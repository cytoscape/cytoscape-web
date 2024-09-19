import NetworkFn, {
  NetworkAttributes,
  Node,
  Edge,
  Network,
} from '../models/NetworkModel'
import { v4 as uuidv4 } from 'uuid'
import TableFn, { Table } from '../models/TableModel'
import ViewModelFn, { NetworkView } from '../models/ViewModel'
import VisualStyleFn, { VisualStyle } from '../models/VisualStyleModel'
import { NetworkWithView } from '../models/NetworkWithViewModel'
import { useNetworkStore } from '../store/NetworkStore'
import { useTableStore } from '../store/TableStore'
import { useViewModelStore } from '../store/ViewModelStore'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { useCallback } from 'react'
import { NetworkStore } from '../models/StoreModel/NetworkStoreModel'
import { TableStore } from '../models/StoreModel/TableStoreModel'
import { useNetworkSummaryStore } from '../store/NetworkSummaryStore'
import { getBaseSummary } from '../models/NetworkSummaryModel'
import { IdType } from '../models'

/**
 * Create an empty network object with generated ID
 *
 * @returns Network object
 *
 */
export const createEmptyNetwork = (): Network => {
  const id: IdType = uuidv4()
  return NetworkFn.createNetworkFromLists(id, [], [])
}

const toNode = (id: IdType): Node => {
  return {
    id,
  }
}

const toEdge = (edge: [IdType, IdType]): Edge => {
  return {
    id: edge[0] + '-' + edge[1],
    s: edge[0],
    t: edge[1],
  }
}

const createNetworkFromEdgeList = (
  edgeList: Array<[IdType, IdType]>,
): Network => {
  const id: IdType = uuidv4()

  const nodeSet: Set<IdType> = new Set(edgeList.flat())
  const nodes: Node[] = Array.from(nodeSet).map(toNode)
  const edges: Edge[] = edgeList.map(toEdge)
  return NetworkFn.createNetworkFromLists(id, nodes, edges)
}

/**
 * Create a complete network object with view and style for the given network
 *
 * @param network
 *
 * @returns NetworkWithView object
 */
export const createViewForNetwork = (network: Network): NetworkWithView => {
  const networkId: IdType = network.id

  // Add base columns (e.g., name)
  const nodeTable: Table = TableFn.createTable(networkId)
  const edgeTable: Table = TableFn.createTable(networkId)
  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
  const networkView: NetworkView = ViewModelFn.createViewModel(network)
  const networkAttributes: NetworkAttributes = {
    id: networkId,
    attributes: {},
  }

  const withView: NetworkWithView = {
    network,
    nodeTable,
    edgeTable,
    visualStyle,
    networkViews: [networkView],
    networkAttributes,
  }

  return withView
}

interface CreateNetworkWithViewProps {
  name?: string
  description?: string
}

/**
 * Register all of the objects in the given networkWithView object
 *
 */
export const useCreateNetworkWithView = (): (({
  name,
  description,
}: CreateNetworkWithViewProps) => NetworkWithView) => {
  const addNetwork = useNetworkStore((state: NetworkStore) => state.add)
  const addTable = useTableStore((state: TableStore) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addSummary = useNetworkSummaryStore((state) => state.add)

  const createNetworkWithView = useCallback(
    ({ name, description }: CreateNetworkWithViewProps) => {
      const network: Network = createEmptyNetwork()
      const withView: NetworkWithView = createViewForNetwork(network)
      const summary = getBaseSummary({
        uuid: network.id,
        name: name || '',
        description: description || '',
      })
      addNetwork(network)
      addVisualStyle(network.id, withView.visualStyle)
      addTable(network.id, withView.nodeTable, withView.edgeTable)
      addViewModel(network.id, withView.networkViews[0])
      addSummary(network.id, summary)

      return withView
    },
    [],
  )

  return createNetworkWithView
}
