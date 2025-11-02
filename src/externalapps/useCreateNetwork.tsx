import NetworkFn, {
  NetworkAttributes,
  Node,
  Edge,
  Network,
} from '../models/NetworkModel'
import { v4 as uuidv4 } from 'uuid'
import TableFn, {
  AttributeName,
  Table,
  ValueType,
  ValueTypeName,
} from '../models/TableModel'
import VisualStyleFn, {
  VisualPropertyName,
  VisualStyle,
} from '../models/VisualStyleModel'
import { NetworkWithView } from '../models/NetworkWithViewModel'
import { useNetworkStore } from '../store/NetworkStore'
import { useTableStore } from '../store/TableStore'
import { useViewModelStore } from '../store/ViewModelStore'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { useCallback } from 'react'
import { NetworkStore } from '../models/StoreModel/NetworkStoreModel'
import { TableRecord, TableStore } from '../models/StoreModel/TableStoreModel'
import { useNetworkSummaryStore } from '../store/NetworkSummaryStore'
import {
  getBaseSummary,
  NdexNetworkSummary,
} from '../models/NetworkSummaryModel'
import { IdType } from '../models'
import { createViewModelFromNetwork } from '../models/ViewModel/impl/ViewModelImpl'

const toNode = (id: IdType): Node => {
  return {
    id,
  }
}

const toEdge = (edge: [IdType, IdType], index: number): Edge => {
  return {
    id: 'e' + index,
    s: edge[0],
    t: edge[1],
  }
}

const createNodeIdMap = (nodeIdSet: Set<IdType>): Map<IdType, IdType> => {
  const idMap = new Map<string, IdType>()
  let nodeCount = 0
  nodeIdSet.forEach((id: IdType) => {
    idMap.set(id, nodeCount.toString())
    nodeCount++
  })
  return idMap
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
  nodeIdMap: Map<IdType, IdType>,
): Network => {
  // Generate a new UUID for the network
  const id: IdType = uuidv4()

  const nodes: Node[] = Array.from(nodeIdMap.values()).map(toNode)

  let edgeIndex = 0
  const edges: Edge[] = edgeList.map(
    (edge: [IdType, IdType, string?]): Edge => {
      const sourceId = nodeIdMap.get(edge[0])
      const targetId = nodeIdMap.get(edge[1])
      if (sourceId && targetId) {
        return toEdge([sourceId, targetId], edgeIndex++)
      } else {
        // Skip the edge if source or target is not found
        throw new Error(`Node not found for edge: ${edge}`)
      }
    },
  )
  return NetworkFn.createNetworkFromLists(id, nodes, edges)
}

/**
 * Create a table data object for the given network
 *  with minimal columns (e.g., name for nodes, interaction for edges)
 *
 * @param network
 * @returns
 */
const createTableData = (
  network: Network,
  nodeIdMap: Map<IdType, IdType>,
): TableRecord => {
  const networkId: IdType = network.id
  const nodeTableData = new Map<IdType, Record<AttributeName, ValueType>>()
  const edgeTableData = new Map<IdType, Record<AttributeName, ValueType>>()
  const nodeNames = Array.from(nodeIdMap.keys())
  nodeNames.forEach((nodeName: string) => {
    const nodeId = nodeIdMap.get(nodeName)
    if (nodeId) {
      nodeTableData.set(nodeId, { name: nodeName })
    }
  })

  // Add base columns (e.g., name)
  const nodeTable: Table = TableFn.createTable(
    networkId,
    [{ name: 'name', type: 'string' }],
    nodeTableData,
  )
  const edgeTable: Table = TableFn.createTable(networkId, [], edgeTableData)

  return { nodeTable, edgeTable }
}

/**
 * Create a complete network object with view and style for the given network
 *
 * @param network
 *
 * @returns NetworkWithView object
 */
const createViewForNetwork = (
  network: Network,
  nodeIdMap: Map<IdType, IdType>,
): NetworkWithView => {
  const networkId: IdType = network.id
  const networkView = createViewModelFromNetwork(networkId, network)
  const { nodeTable, edgeTable } = createTableData(network, nodeIdMap)
  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
  const networkAttributes: NetworkAttributes = {
    id: networkId,
    attributes: {},
  }
  const undoRedoStack = {
    undoStack: [],
    redoStack: [],
  }

  const withView: NetworkWithView = {
    network,
    nodeTable,
    edgeTable,
    visualStyle,
    networkViews: [networkView],
    networkAttributes,
    undoRedoStack,
  }

  return withView
}

interface CreateNetworkWithViewProps {
  name: string
  description?: string
  edgeList: Array<[IdType, IdType, string?]>
}

/**
 * Return a function to create a network with view and style
 * for the given edge list.
 *
 * Network-unique IDs will be assigned to nodes and edges
 * automatically and values in the edge list will be used as
 * names for nodes and interactions for edges.
 *
 * After network creation, tables keeps the map of IDs to names.
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

  const createPassthroughMapping = useVisualStyleStore(
    (state) => state.createPassthroughMapping,
  )

  const createNetworkWithView = useCallback(
    ({ name, description, edgeList }: CreateNetworkWithViewProps) => {
      // Replace original IDs with integer-based IDs
      // Get unique nodes from the edge list
      const nodeSet = new Set<IdType>(
        edgeList.flatMap((edge) => [edge[0], edge[1]]),
      )
      const nodeIdMap: Map<IdType, IdType> = createNodeIdMap(nodeSet)

      // Create a simple network object from source-target edge list
      const network: Network = createNetworkFromEdgeList(edgeList, nodeIdMap)

      // Add all required objects to the network
      const withView: NetworkWithView = createViewForNetwork(network, nodeIdMap)
      const summary: NdexNetworkSummary = getBaseSummary({
        name: name || `CyWeb Network (${network.id})`,
        network,
        description,
      })

      addNetwork(network)
      addVisualStyle(network.id, withView.visualStyle)
      addTable(network.id, withView.nodeTable, withView.edgeTable)
      addViewModel(network.id, withView.networkViews[0])
      addSummary(network.id, summary)

      // Update the Visual Style with minimal settings
      createPassthroughMapping(
        network.id,
        VisualPropertyName.NodeLabel,
        'name',
        ValueTypeName.String,
      )

      return withView
    },
    [],
  )

  return createNetworkWithView
}
