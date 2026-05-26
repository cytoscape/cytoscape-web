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
import {
  createNodesCore,
  type NodeOperationStoreActions,
  type CreateNodesParams,
} from '../../models/CyNetworkModel'
import { useNetworkStore } from './stores/NetworkStore'
import { useTableStore } from './stores/TableStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
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

  /**
   * Whether to skip undo/redo recording
   * @internal - Used by useUndoStack for redo operations
   * @default false
   */
  skipUndo?: boolean
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
  const deleteNodesFromNetwork = useNetworkStore((state) => state.deleteNodes)
  const networks = useNetworkStore((state) => state.networks)

  // Table store actions
  const editRows = useTableStore((state) => state.editRows)
  const deleteRows = useTableStore((state) => state.deleteRows)
  const tables = useTableStore((state) => state.tables)

  // ViewModel store actions
  const addNodeView = useViewModelStore((state) => state.addNodeView)
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

      // Prepare attributes with defaults (shallow copy to avoid mutating caller's object)
      const attributes = { ...(options?.attributes ?? {}) }
      const tableRecord = tables[networkId]
      if (tableRecord?.nodeTable) {
        const hasNameColumn = tableRecord.nodeTable.columns.some(
          (col: any) => col.name === 'name',
        )
        if (hasNameColumn && !attributes.name) {
          attributes.name = `Node ${newNodeId}`
        }
      }

      // Build store actions object
      const storeActions: NodeOperationStoreActions = {
        deleteNodesFromNetwork,
        addNode,
        deleteRows,
        editRows,
        deleteViewObjects,
        addNodeView,
        updateNetworkSummary,
        networks,
        tables,
        viewModels,
        visualStyles,
      }

      // Build params
      const params: CreateNodesParams = {
        networkId,
        nodeIds: [newNodeId],
        position,
        attributes,
      }

      // Call the pure function to create the node
      createNodesCore(params, storeActions)

      // Select the new node if autoSelect is enabled (default: true)
      const shouldAutoSelect = options?.autoSelect !== false
      if (shouldAutoSelect) {
        exclusiveSelect(networkId, [newNodeId], [])
      }

      // Record for undo/redo (unless skipUndo is true)
      if (!options?.skipUndo) {
        postEdit(
          UndoCommandType.CREATE_NODES,
          `Create Node ${newNodeId}`,
          // Undo: delete the node
          [networkId, [newNodeId]],
          // Redo: recreate the node
          [networkId, [newNodeId], position, attributes],
        )
      }

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
