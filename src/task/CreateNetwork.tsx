import NetworkFn, {
  NetworkAttributes,
  Node,
  Edge,
  Network,
} from '../models/NetworkModel'
import { v4 as uuidv4 } from 'uuid'
import TableFn, { AttributeName, Table, ValueType } from '../models/TableModel'
import VisualStyleFn, { VisualStyle } from '../models/VisualStyleModel'
import { NetworkWithView } from '../models/NetworkWithViewModel'
import { useNetworkStore } from '../store/NetworkStore'
import { useTableStore } from '../store/TableStore'
import { useViewModelStore } from '../store/ViewModelStore'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { useCallback } from 'react'
import { NetworkStore } from '../models/StoreModel/NetworkStoreModel'
import { TableRecord, TableStore } from '../models/StoreModel/TableStoreModel'
import { useNetworkSummaryStore } from '../store/NetworkSummaryStore'
import { getBaseSummary } from '../models/NetworkSummaryModel'
import { IdType } from '../models'
import { createViewModelFromNetwork } from '../models/ViewModel/impl/ViewModelImpl'

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

/**
 * Create a network object from the given edge list
 *
 * @param edgeList List of edges in the form of [source, target, edge type?]
 *
 * @returns Network object
 */
export const createNetworkFromEdgeList = (
  edgeList: Array<[IdType, IdType, string?]>,
): Network => {
  // Generate a new UUID for the network
  const id: IdType = uuidv4()

  // Get unique nodes from the edge list
  const nodeSet = new Set<IdType>(
    edgeList.flatMap((edge) => [edge[0], edge[1]]),
  )
  const nodes: Node[] = Array.from(nodeSet).map(toNode)
  const edges: Edge[] = edgeList.map(toEdge)
  return NetworkFn.createNetworkFromLists(id, nodes, edges)
}

/**
 * Create a table data object for the given network
 *  with minimal columns (e.g., name for nodes, interaction for edges)
 *
 * @param network
 * @returns
 */
const createTableData = (network: Network): TableRecord => {
  const networkId: IdType = network.id
  const nodeTableData = new Map<IdType, Record<AttributeName, ValueType>>()
  const edgeTableData = new Map<IdType, Record<AttributeName, ValueType>>()
  network.nodes.forEach((node) => {
    nodeTableData.set(node.id, { name: node.id })
  })
  network.edges.forEach((edge) => {
    edgeTableData.set(edge.id, { interaction: edge.id })
  })

  // Add base columns (e.g., name)
  const nodeTable: Table = TableFn.createTable(
    networkId,
    [{ name: 'name', type: 'string' }],
    nodeTableData,
  )
  const edgeTable: Table = TableFn.createTable(
    networkId,
    [{ name: 'interaction', type: 'string' }],
    edgeTableData,
  )

  return { nodeTable, edgeTable }
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
  const networkView = createViewModelFromNetwork(networkId, network)
  const { nodeTable, edgeTable } = createTableData(network)
  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
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
  name: string
  description?: string
  edgeList: Array<[IdType, IdType, string?]>
}

/**
 * Register all of the objects in the given networkWithView object
 *
 */
export const useCreateNetworkWithView = (): (({
  name,
  description,
  edgeList,
}: CreateNetworkWithViewProps) => NetworkWithView) => {
  const addNetwork = useNetworkStore((state: NetworkStore) => state.add)
  const addTable = useTableStore((state: TableStore) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addSummary = useNetworkSummaryStore((state) => state.add)

  const createNetworkWithView = useCallback(
    ({ name, description, edgeList }: CreateNetworkWithViewProps) => {
      // Create a simple network object from source-target edge list
      const network: Network = createNetworkFromEdgeList(edgeList)

      // Add all required objects to the network
      const withView: NetworkWithView = createViewForNetwork(network)
      const summary = getBaseSummary({
        uuid: network.id,
        name: name || '',
        description: description || '(N/A)',
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
