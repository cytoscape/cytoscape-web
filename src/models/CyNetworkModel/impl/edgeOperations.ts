import { IdType } from '../../IdType'
import { Edge, Network } from '../../NetworkModel'
import { EdgeView } from '../../ViewModel'
import { ValueType } from '../../TableModel'
import { TableType } from '../../StoreModel/TableStoreModel'
import { VisualStyle } from '../../VisualStyleModel'
import { NetworkSummary } from '../../NetworkSummaryModel'

/**
 * Store actions interface for edge operations
 */
export interface EdgeOperationStoreActions {
  // Network store actions
  deleteEdgesFromNetwork: (networkId: IdType, edgeIds: IdType[]) => void
  addEdge: (
    networkId: IdType,
    edgeId: IdType,
    sourceId: IdType,
    targetId: IdType,
  ) => void

  // Table store actions
  deleteRows: (networkId: IdType, rowIds: IdType[]) => void
  editRows: (
    networkId: IdType,
    tableType: TableType,
    rows: Map<IdType, Record<string, ValueType>>,
  ) => void

  // ViewModel store actions
  deleteViewObjects: (networkId: IdType, ids: IdType[]) => void
  addEdgeView: (networkId: IdType, edgeView: EdgeView) => void

  // Summary store actions
  updateNetworkSummary: (
    networkId: IdType,
    summaryUpdate: Partial<NetworkSummary>,
  ) => void

  // Store state getters
  networks: Map<IdType, Network>
  tables: Record<IdType, { nodeTable: any; edgeTable: any }>
  viewModels: Record<IdType, any>
  visualStyles: Record<IdType, VisualStyle>
}

/**
 * Result of an edge deletion operation
 */
export interface DeleteEdgesResult {
  deletedEdgeIds: IdType[]
  deletedEdgeViews: EdgeView[]
  deletedEdgeRows: Map<IdType, Record<string, ValueType>>
}

/**
 * Pure function to delete edges from a network
 *
 * This function orchestrates the deletion of edges across all stores:
 * - Removes edges from network topology
 * - Cleans up view objects
 * - Removes table rows
 * - Updates network summary
 *
 * Can be called from both useDeleteEdges hook and undo/redo handlers
 *
 * @param networkId - The network to delete edges from
 * @param edgeIds - Array of edge IDs to delete
 * @param storeActions - All required store actions
 * @returns Information about deleted edges and rows for undo/redo
 */
export const deleteEdgesCore = (
  networkId: IdType,
  edgeIds: IdType[],
  storeActions: EdgeOperationStoreActions,
): DeleteEdgesResult => {
  const {
    deleteEdgesFromNetwork,
    deleteRows,
    deleteViewObjects,
    updateNetworkSummary,
    networks,
    tables,
    viewModels,
  } = storeActions

  // Get network and validate
  const network = networks.get(networkId)
  if (!network) {
    throw new Error(`Network ${networkId} not found`)
  }

  // Collect data before deletion for undo/redo
  const tableRecord = tables[networkId]
  const viewModel = viewModels[networkId]

  const deletedEdgeRows = new Map<IdType, Record<string, ValueType>>()
  if (tableRecord?.edgeTable) {
    edgeIds.forEach((edgeId) => {
      const row = tableRecord.edgeTable.rows.get(edgeId)
      if (row) {
        deletedEdgeRows.set(edgeId, { ...row })
      }
    })
  }

  const deletedEdgeViews: EdgeView[] = []
  if (viewModel?.edgeViews) {
    edgeIds.forEach((edgeId) => {
      const edgeView = viewModel.edgeViews[edgeId]
      if (edgeView) {
        deletedEdgeViews.push({ ...edgeView })
      }
    })
  }

  // 1. Delete edges from network topology
  deleteEdgesFromNetwork(networkId, edgeIds)

  // 2. Delete view objects
  deleteViewObjects(networkId, edgeIds)

  // 3. Delete table rows
  deleteRows(networkId, edgeIds)

  // 4. Update network summary
  const updatedNetwork = networks.get(networkId)
  if (updatedNetwork) {
    updateNetworkSummary(networkId, {
      nodeCount: updatedNetwork.nodes.length,
      edgeCount: updatedNetwork.edges.length,
    })
  }

  return {
    deletedEdgeIds: edgeIds,
    deletedEdgeViews,
    deletedEdgeRows,
  }
}

/**
 * Parameters for creating edges
 */
export interface CreateEdgesParams {
  networkId: IdType
  edgeIds: IdType[]
  sourceId: IdType
  targetId: IdType
  attributes: Record<string, ValueType>
}

/**
 * Pure function to create edges in a network
 *
 * This function orchestrates edge creation across all stores:
 * - Adds edges to network topology
 * - Creates table rows with attributes
 * - Creates edge views
 * - Updates network summary
 *
 * Can be called from both useCreateEdge hook and undo/redo handlers
 *
 * @param params - Edge creation parameters
 * @param storeActions - All required store actions
 */
export const createEdgesCore = (
  params: CreateEdgesParams,
  storeActions: EdgeOperationStoreActions,
): void => {
  const { networkId, edgeIds, sourceId, targetId, attributes } = params
  const {
    addEdge,
    addEdgeView,
    editRows,
    updateNetworkSummary,
    networks,
    tables,
    viewModels,
  } = storeActions

  // Get network and validate
  const network = networks.get(networkId)
  if (!network) {
    throw new Error(`Network ${networkId} not found`)
  }

  // Validate source and target nodes exist
  const sourceNode = network.nodes.find((n) => n.id === sourceId)
  const targetNode = network.nodes.find((n) => n.id === targetId)

  if (!sourceNode) {
    throw new Error(`Source node ${sourceId} not found`)
  }
  if (!targetNode) {
    throw new Error(`Target node ${targetId} not found`)
  }

  edgeIds.forEach((edgeId) => {
    // 1. Add edge to network topology
    addEdge(networkId, edgeId, sourceId, targetId)

    // 2. Add table row with attributes
    const tableRecord = tables[networkId]
    if (tableRecord?.edgeTable) {
      const rowData: Record<string, ValueType> = { ...attributes }
      const rowsToAdd = new Map<IdType, Record<string, ValueType>>()
      rowsToAdd.set(edgeId, rowData)
      editRows(networkId, TableType.EDGE, rowsToAdd)
    }

    // 3. Add edge view
    const viewModel = viewModels[networkId]
    if (viewModel) {
      const edgeView: EdgeView = {
        id: edgeId,
        values: new Map(),
      }
      addEdgeView(networkId, edgeView)
    }
  })

  // 4. Update network summary
  const updatedNetwork = networks.get(networkId)
  if (updatedNetwork) {
    updateNetworkSummary(networkId, {
      nodeCount: updatedNetwork.nodes.length,
      edgeCount: updatedNetwork.edges.length,
    })
  }
}

