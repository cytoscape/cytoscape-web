/**
 * Hook for creating nodes with full integration across all stores
 *
 * This hook orchestrates node creation by:
 * 1. Generating a unique sequential ID
 * 2. Adding the node to the network topology
 * 3. Creating a table row with default or custom values
 * 4. Adding a node view with the specified position
 * 5. Recording the action for undo/redo
 *
 * @example
 * ```typescript
 * const { createNode } = useCreateNode()
 *
 * // Create node at position with custom attributes
 * const nodeId = createNode('network-123', [100, 200], {
 *   name: 'My Node',
 *   score: 42
 * })
 * ```
 */

import { IdType } from '../../models/IdType'
import { ValueType } from '../../models/TableModel'
import { AttributeName } from '../../models/TableModel/AttributeName'
import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { TableType } from '../../models/StoreModel/TableStoreModel'
import ViewModelFn, { NodeView } from '../../models/ViewModel'
import { useNetworkStore } from './stores/NetworkStore'
import { useTableStore } from './stores/TableStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useUndoStack } from './useUndoStack'

export interface CreateNodeOptions {
  /**
   * Custom attribute values for the node's table row
   * Will be merged with default values for unspecified columns
   */
  attributes?: Record<AttributeName, ValueType>

  /**
   * Whether to select the newly created node
   * @default true
   */
  autoSelect?: boolean
}

export interface CreateNodeResult {
  /**
   * The ID of the newly created node
   */
  nodeId: IdType

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
 * Hook for creating nodes with full store integration and undo/redo support
 */
export const useCreateNode = () => {
  // Network store actions
  const addNode = useNetworkStore((state) => state.addNode)
  const networks = useNetworkStore((state) => state.networks)

  // Table store actions
  const editRows = useTableStore((state) => state.editRows)
  const setValue = useTableStore((state) => state.setValue)
  const tables = useTableStore((state) => state.tables)

  // ViewModel store actions
  const addNodeView = useViewModelStore((state) => state.addNodeView)
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const viewModels = useViewModelStore((state) => state.viewModels)

  // Undo/redo support
  const { postEdit } = useUndoStack()

  /**
   * Generate the next sequential node ID for a network
   */
  const generateNextNodeId = (networkId: IdType): IdType => {
    const network = networks.get(networkId)
    if (!network) {
      return '0'
    }

    const existingIds = network.nodes
      .map((n) => parseInt(n.id))
      .filter((id) => !isNaN(id))

    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : -1
    return `${maxId + 1}`
  }

  /**
   * Create a new node in the network
   *
   * @param networkId - The ID of the network to add the node to
   * @param position - The [x, y, z?] position for the node
   * @param options - Optional configuration for node creation
   * @returns Result object with the new node ID and success status
   */
  const createNode = (
    networkId: IdType,
    position: [number, number, number?],
    options?: CreateNodeOptions,
  ): CreateNodeResult => {
    try {
      // Validate network exists
      const network = networks.get(networkId)
      if (!network) {
        return {
          nodeId: '',
          success: false,
          error: `Network ${networkId} not found`,
        }
      }

      // Generate unique ID
      const newNodeId = generateNextNodeId(networkId)

      // 1. Add node to network topology
      addNode(networkId, newNodeId)

      // 2. Add table row with default/custom values
      const attributes = options?.attributes ?? {}
      const tableRecord = tables[networkId]
      if (tableRecord?.nodeTable) {
        const hasNameColumn = tableRecord.nodeTable.columns.some(
          (col) => col.name === 'name',
        )

        // Build the row data
        const rowData: Record<string, ValueType> = {}

        // Set defaults for all columns
        tableRecord.nodeTable.columns.forEach((column) => {
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
          rowData.name = `Node ${newNodeId}`
        }

        // Override with custom attributes
        Object.entries(attributes).forEach(([columnName, value]) => {
          rowData[columnName] = value
        })

        // Add the row to the table
        const rowsToAdd = new Map<IdType, Record<string, ValueType>>()
        rowsToAdd.set(newNodeId, rowData)
        editRows(networkId, TableType.NODE, rowsToAdd)
      }

      // 4. Add node view with position
      const viewModel = viewModels[networkId]
      if (viewModel) {
        const nodeView: NodeView = {
          id: newNodeId,
          x: position[0],
          y: position[1],
          z: position[2],
          values: new Map(),
        }
        addNodeView(networkId, nodeView)
      }

      // 5. Select the new node if autoSelect is enabled (default: true)
      const shouldAutoSelect = options?.autoSelect !== false
      if (shouldAutoSelect) {
        exclusiveSelect(networkId, [newNodeId], [])
      }

      // 6. Record for undo/redo
      postEdit(
        UndoCommandType.CREATE_NODES,
        `Create Node ${newNodeId}`,
        // Undo: delete the node
        [networkId, [newNodeId]],
        // Redo: recreate the node
        [networkId, [newNodeId], position, attributes],
      )

      return {
        nodeId: newNodeId,
        success: true,
      }
    } catch (error) {
      return {
        nodeId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  return {
    createNode,
    generateNextNodeId,
  }
}
