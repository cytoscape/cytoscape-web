/**
 * Hook for creating edges with full integration across all stores
 *
 * This hook orchestrates edge creation by:
 * 1. Generating a unique sequential ID
 * 2. Adding the edge to the network topology
 * 3. Creating a table row with default or custom values
 * 4. Adding an edge view
 * 5. Recording the action for undo/redo
 *
 * @example
 * ```typescript
 * const { createEdge } = useCreateEdge()
 *
 * // Create edge between nodes with custom attributes
 * const edgeId = createEdge('network-123', 'node1', 'node2', {
 *   interaction: 'activates',
 *   weight: 0.8
 * })
 * ```
 */

import { IdType } from '../../models/IdType'
import { ValueType } from '../../models/TableModel'
import { AttributeName } from '../../models/TableModel/AttributeName'
import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { TableType } from '../../models/StoreModel/TableStoreModel'
import { EdgeView } from '../../models/ViewModel'
import {
  createEdgesCore,
  type EdgeOperationStoreActions,
  type CreateEdgesParams,
} from '../../models/CyNetworkModel'
import { useNetworkStore } from './stores/NetworkStore'
import { useTableStore } from './stores/TableStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useUndoStack } from './useUndoStack'

export interface CreateEdgeOptions {
  /**
   * Custom attribute values for the edge's table row
   * Will be merged with default values for unspecified columns
   */
  attributes?: Record<AttributeName, ValueType>

  /**
   * Whether to select the newly created edge
   * @default true
   */
  autoSelect?: boolean

  /**
   * Whether to skip undo/redo recording
   * @internal - Used by useUndoStack for redo operations
   * @default false
   */
  skipUndo?: boolean
}

export interface CreateEdgeResult {
  /**
   * The ID of the newly created edge
   */
  edgeId: IdType

  /**
   * Whether the operation was successful
   */
  success: boolean

  /**
   * Error message if the operation failed
   */
  error?: string
}

/**
 * Hook for creating edges with full store integration and undo/redo support
 */
export const useCreateEdge = () => {
  // Network store actions
  const addEdge = useNetworkStore((state) => state.addEdge)
  const deleteEdgesFromNetwork = useNetworkStore((state) => state.deleteEdges)
  const networks = useNetworkStore((state) => state.networks)

  // Table store actions
  const editRows = useTableStore((state) => state.editRows)
  const deleteRows = useTableStore((state) => state.deleteRows)
  const tables = useTableStore((state) => state.tables)

  // ViewModel store actions
  const addEdgeView = useViewModelStore((state) => state.addEdgeView)
  const deleteViewObjects = useViewModelStore((state) => state.deleteObjects)
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const viewModels = useViewModelStore((state) => state.viewModels)

  // Visual style store
  const visualStyles = useVisualStyleStore((state) => state.visualStyles)

  // Network summary store
  const updateNetworkSummary = useNetworkSummaryStore((state) => state.update)

  // Undo/redo support
  const { postEdit } = useUndoStack()

  /**
   * Generate the next sequential edge ID for a network
   * Edge IDs are prefixed with 'e' (e.g., 'e0', 'e1', 'e2')
   * because Cytoscape.js doesn't allow nodes and edges to have the same IDs
   */
  const generateNextEdgeId = (networkId: IdType): IdType => {
    const network = networks.get(networkId)
    if (!network) {
      return 'e0'
    }

    const existingIds = network.edges
      .map((e) => {
        // Edge IDs start with 'e' prefix (e.g., 'e0', 'e1', 'e123')
        const id = e.id.startsWith('e') ? e.id.slice(1) : e.id
        return parseInt(id)
      })
      .filter((id) => !isNaN(id))

    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : -1
    return `e${maxId + 1}`
  }

  /**
   * Create a new edge in the network
   *
   * @param networkId - The ID of the network to add the edge to
   * @param sourceNodeId - The ID of the source node
   * @param targetNodeId - The ID of the target node
   * @param options - Optional configuration for edge creation
   * @returns Result object with the new edge ID and success status
   */
  const createEdge = (
    networkId: IdType,
    sourceNodeId: IdType,
    targetNodeId: IdType,
    options?: CreateEdgeOptions,
  ): CreateEdgeResult => {
    try {
      // Validate network exists
      const network = networks.get(networkId)
      if (!network) {
        return {
          edgeId: '',
          success: false,
          error: `Network ${networkId} not found`,
        }
      }

      // Validate source node exists
      const sourceNode = network.nodes.find((n) => n.id === sourceNodeId)
      if (!sourceNode) {
        return {
          edgeId: '',
          success: false,
          error: `Source node ${sourceNodeId} not found`,
        }
      }

      // Validate target node exists
      const targetNode = network.nodes.find((n) => n.id === targetNodeId)
      if (!targetNode) {
        return {
          edgeId: '',
          success: false,
          error: `Target node ${targetNodeId} not found`,
        }
      }

      // Generate unique ID
      const newEdgeId = generateNextEdgeId(networkId)

      // Prepare attributes with defaults
      const attributes = options?.attributes ?? {}
      const tableRecord = tables[networkId]
      if (tableRecord?.edgeTable) {
        const hasNameColumn = tableRecord.edgeTable.columns.some(
          (col: any) => col.name === 'name',
        )
        if (hasNameColumn && !attributes.name) {
          attributes.name = `${sourceNodeId} (interacts with) ${targetNodeId}`
        }
      }

      // Build store actions object
      const storeActions: EdgeOperationStoreActions = {
        deleteEdgesFromNetwork,
        addEdge,
        deleteRows,
        editRows,
        deleteViewObjects,
        addEdgeView,
        updateNetworkSummary,
        networks,
        tables,
        viewModels,
        visualStyles,
      }

      // Build params
      const params: CreateEdgesParams = {
        networkId,
        edgeIds: [newEdgeId],
        sourceId: sourceNodeId,
        targetId: targetNodeId,
        attributes,
      }

      // Call the pure function to create the edge
      createEdgesCore(params, storeActions)

      // Select the new edge if autoSelect is enabled (default: true)
      const shouldAutoSelect = options?.autoSelect !== false
      if (shouldAutoSelect) {
        exclusiveSelect(networkId, [], [newEdgeId])
      }

      // Record for undo/redo (unless skipUndo is true)
      if (!options?.skipUndo) {
        postEdit(
          UndoCommandType.CREATE_EDGES,
          `Create Edge ${newEdgeId}`,
          // Undo: delete the edge
          [networkId, [newEdgeId]],
          // Redo: recreate the edge
          [networkId, [newEdgeId], sourceNodeId, targetNodeId, attributes],
        )
      }

      return {
        edgeId: newEdgeId,
        success: true,
      }
    } catch (error) {
      return {
        edgeId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  return {
    createEdge,
    generateNextEdgeId,
  }
}
