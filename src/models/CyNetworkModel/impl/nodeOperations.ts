import { IdType } from '../../IdType'
import { Edge, Network } from '../../NetworkModel'
import { NodeView } from '../../ViewModel'
import { ValueType } from '../../TableModel'
import { TableType } from '../../StoreModel/TableStoreModel'
import { VisualStyle } from '../../VisualStyleModel'
import { NetworkSummary } from '../../NetworkSummaryModel'

/**
 * Store actions interface for node operations
 * This defines all the store methods needed to manipulate nodes
 */
export interface NodeOperationStoreActions {
  // Network store actions
  deleteNodesFromNetwork: (networkId: IdType, nodeIds: IdType[]) => Edge[]
  addNode: (networkId: IdType, nodeId: IdType) => void

  // Table store actions
  deleteRows: (networkId: IdType, rowIds: IdType[]) => void
  editRows: (
    networkId: IdType,
    tableType: TableType,
    rows: Map<IdType, Record<string, ValueType>>,
  ) => void

  // ViewModel store actions
  deleteViewObjects: (networkId: IdType, ids: IdType[]) => void
  addNodeView: (networkId: IdType, nodeView: NodeView) => void

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
 * Result of a node deletion operation
 */
export interface DeleteNodesResult {
  deletedNodeIds: IdType[]
  deletedEdges: Edge[]
  deletedNodeViews: NodeView[]
  deletedEdgeViews: any[]
  deletedNodeRows: Map<IdType, Record<string, ValueType>>
  deletedEdgeRows: Map<IdType, Record<string, ValueType>>
}

/**
 * Pure function to delete nodes from a network
 *
 * This function orchestrates the deletion of nodes across all stores:
 * - Removes nodes from network topology
 * - Removes connected edges
 * - Cleans up view objects
 * - Removes table rows
 * - Updates network summary
 *
 * Can be called from both useDeleteNodes hook and undo/redo handlers
 *
 * @param networkId - The network to delete nodes from
 * @param nodeIds - Array of node IDs to delete
 * @param storeActions - All required store actions
 * @returns Information about deleted nodes, edges, and rows for undo/redo
 */
export const deleteNodesCore = (
  networkId: IdType,
  nodeIds: IdType[],
  storeActions: NodeOperationStoreActions,
): DeleteNodesResult => {
  const {
    deleteNodesFromNetwork,
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

  const deletedNodeRows = new Map<IdType, Record<string, ValueType>>()
  if (tableRecord?.nodeTable) {
    nodeIds.forEach((nodeId) => {
      const row = tableRecord.nodeTable.rows.get(nodeId)
      if (row) {
        deletedNodeRows.set(nodeId, { ...row })
      }
    })
  }

  const deletedNodeViews: NodeView[] = []
  if (viewModel?.nodeViews) {
    nodeIds.forEach((nodeId) => {
      const nodeView = viewModel.nodeViews[nodeId]
      if (nodeView) {
        deletedNodeViews.push({ ...nodeView })
      }
    })
  }

  // 1. Delete nodes from network topology (returns deleted connecting edges)
  const deletedEdges = deleteNodesFromNetwork(networkId, nodeIds)

  // Collect deleted edge data for undo/redo
  const deletedEdgeRows = new Map<IdType, Record<string, ValueType>>()
  if (tableRecord?.edgeTable) {
    deletedEdges.forEach((edge) => {
      const row = tableRecord.edgeTable.rows.get(edge.id)
      if (row) {
        deletedEdgeRows.set(edge.id, { ...row })
      }
    })
  }

  const deletedEdgeViews: any[] = []
  if (viewModel?.edgeViews) {
    deletedEdges.forEach((edge) => {
      const edgeView = viewModel.edgeViews[edge.id]
      if (edgeView) {
        deletedEdgeViews.push({ ...edgeView })
      }
    })
  }

  // 2. Delete view objects (nodes + edges)
  const allDeletedIds = [...nodeIds, ...deletedEdges.map((e) => e.id)]
  deleteViewObjects(networkId, allDeletedIds)

  // 3. Delete table rows (nodes + edges)
  deleteRows(networkId, allDeletedIds)

  // 4. Update network summary
  const updatedNetwork = networks.get(networkId)
  if (updatedNetwork) {
    updateNetworkSummary(networkId, {
      nodeCount: updatedNetwork.nodes.length,
      edgeCount: updatedNetwork.edges.length,
    })
  }

  return {
    deletedNodeIds: nodeIds,
    deletedEdges,
    deletedNodeViews,
    deletedEdgeViews,
    deletedNodeRows,
    deletedEdgeRows,
  }
}

/**
 * Parameters for creating nodes
 */
export interface CreateNodesParams {
  networkId: IdType
  nodeIds: IdType[]
  position: [number, number, number?]
  attributes: Record<string, ValueType>
}

/**
 * Pure function to create nodes in a network
 *
 * This function orchestrates node creation across all stores:
 * - Adds nodes to network topology
 * - Creates table rows with attributes
 * - Creates node views with positions
 * - Updates network summary
 *
 * Can be called from both useCreateNode hook and undo/redo handlers
 *
 * @param params - Node creation parameters
 * @param storeActions - All required store actions
 */
export const createNodesCore = (
  params: CreateNodesParams,
  storeActions: NodeOperationStoreActions,
): void => {
  const { networkId, nodeIds, position, attributes } = params
  const {
    addNode,
    addNodeView,
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

  nodeIds.forEach((nodeId) => {
    // 1. Add node to network topology
    addNode(networkId, nodeId)

    // 2. Add table row with attributes
    const tableRecord = tables[networkId]
    if (tableRecord?.nodeTable) {
      const rowData: Record<string, ValueType> = { ...attributes }
      const rowsToAdd = new Map<IdType, Record<string, ValueType>>()
      rowsToAdd.set(nodeId, rowData)
      editRows(networkId, TableType.NODE, rowsToAdd)
    }

    // 3. Add node view with position
    const viewModel = viewModels[networkId]
    if (viewModel) {
      const nodeView: NodeView = {
        id: nodeId,
        x: position[0],
        y: position[1],
        z: position[2],
        values: new Map(),
      }
      addNodeView(networkId, nodeView)
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

