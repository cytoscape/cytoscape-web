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
import { useNetworkStore } from './stores/NetworkStore'
import { useTableStore } from './stores/TableStore'
import { useViewModelStore } from './stores/ViewModelStore'
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
  const networks = useNetworkStore((state) => state.networks)

  // Table store actions
  const editRows = useTableStore((state) => state.editRows)
  const tables = useTableStore((state) => state.tables)

  // ViewModel store actions
  const addEdgeView = useViewModelStore((state) => state.addEdgeView)
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const viewModels = useViewModelStore((state) => state.viewModels)

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

      // 1. Add edge to network topology
      addEdge(networkId, newEdgeId, sourceNodeId, targetNodeId)

      // 2. Add table row with default/custom values
      const attributes = options?.attributes ?? {}
      const tableRecord = tables[networkId]
      if (tableRecord?.edgeTable) {
        const hasNameColumn = tableRecord.edgeTable.columns.some(
          (col) => col.name === 'name',
        )

        // Build the row data
        const rowData: Record<string, ValueType> = {}

        // Set defaults for all columns
        tableRecord.edgeTable.columns.forEach((column) => {
          switch (column.type) {
            case ValueTypeName.String:
              rowData[column.name] = ''
              break
            case ValueTypeName.Long:
            case ValueTypeName.Integer:
            case ValueTypeName.Double:
              rowData[column.name] = 0
              break
            case ValueTypeName.Boolean:
              rowData[column.name] = false
              break
            case ValueTypeName.ListString:
            case ValueTypeName.ListLong:
            case ValueTypeName.ListInteger:
            case ValueTypeName.ListDouble:
            case ValueTypeName.ListBoolean:
              rowData[column.name] = []
              break
            default:
              rowData[column.name] = ''
          }
        })

        // Apply default name if name column exists
        if (hasNameColumn && !attributes.name) {
          rowData.name = `${sourceNodeId} (interacts with) ${targetNodeId}`
        }

        // Override with custom attributes
        Object.entries(attributes).forEach(([columnName, value]) => {
          rowData[columnName] = value
        })

        // Add the row to the table
        const rowsToAdd = new Map<IdType, Record<string, ValueType>>()
        rowsToAdd.set(newEdgeId, rowData)
        editRows(networkId, TableType.EDGE, rowsToAdd)
      }

      // 3. Add edge view
      const viewModel = viewModels[networkId]
      if (viewModel) {
        const edgeView: EdgeView = {
          id: newEdgeId,
          values: new Map(),
        }
        addEdgeView(networkId, edgeView)
      }

      // 4. Select the new edge if autoSelect is enabled (default: true)
      const shouldAutoSelect = options?.autoSelect !== false
      if (shouldAutoSelect) {
        exclusiveSelect(networkId, [], [newEdgeId])
      }

      // 5. Record for undo/redo
      postEdit(
        UndoCommandType.CREATE_EDGES,
        `Create Edge ${newEdgeId}`,
        // Undo: delete the edge
        [networkId, [newEdgeId]],
        // Redo: recreate the edge
        [networkId, [newEdgeId], sourceNodeId, targetNodeId, attributes],
      )

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
