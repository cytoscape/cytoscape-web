/**
 * Hook for deleting nodes with full integration across all stores
 *
 * This hook orchestrates node deletion by:
 * 1. Deleting nodes from the network topology (which cascades to connected edges)
 * 2. Capturing deleted node and edge data for undo/redo
 * 3. Removing node and edge views from the view model
 * 4. Removing table rows for nodes and edges
 * 5. Cleaning up visual style bypasses for deleted elements
 * 6. Updating network summary counts
 * 7. Recording the action for undo/redo
 *
 * @example
 * ```typescript
 * const { deleteNodes } = useDeleteNodes()
 *
 * // Delete specific nodes
 * const result = deleteNodes('network-123', ['1', '2', '3'])
 *
 * // Check result
 * if (result.success) {
 *   console.log(`Deleted ${result.deletedNodeCount} nodes and ${result.deletedEdgeCount} edges`)
 * }
 * ```
 */

import { IdType } from '../../models/IdType'
import { ValueType } from '../../models/TableModel'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { TableType } from '../../models/StoreModel/TableStoreModel'
import { Edge, EdgeView, NodeView } from '../../models'
import { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
import {
  deleteNodesCore,
  type NodeOperationStoreActions,
} from '../../models/CyNetworkModel'
import { useNetworkStore } from './stores/NetworkStore'
import { useTableStore } from './stores/TableStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useUndoStack } from './useUndoStack'

export interface DeleteNodesOptions {
  /**
   * Whether to skip undo/redo recording
   * @internal - Used by useUndoStack for redo operations
   * @default false
   */
  skipUndo?: boolean
}

export interface DeleteNodesResult {
  /**
   * Whether the operation was successful
   */
  success: boolean

  /**
   * Number of nodes deleted
   */
  deletedNodeCount: number

  /**
   * Number of edges deleted (connected to the deleted nodes)
   */
  deletedEdgeCount: number

  /**
   * Error message if the operation failed
   */
  error?: string
}

/**
 * Hook for deleting nodes with full store integration and undo/redo support
 */
export const useDeleteNodes = () => {
  // Network store actions
  const deleteNodesFromNetwork = useNetworkStore((state) => state.deleteNodes)
  const addNode = useNetworkStore((state) => state.addNode)
  const networks = useNetworkStore((state) => state.networks)

  // Table store actions
  const deleteRows = useTableStore((state) => state.deleteRows)
  const editRows = useTableStore((state) => state.editRows)
  const tables = useTableStore((state) => state.tables)

  // ViewModel store actions
  const deleteViewObjects = useViewModelStore((state) => state.deleteObjects)
  const addNodeView = useViewModelStore((state) => state.addNodeView)
  const viewModels = useViewModelStore((state) => state.viewModels)

  // Visual style store actions
  const deleteBypass = useVisualStyleStore((state) => state.deleteBypass)
  const visualStyles = useVisualStyleStore((state) => state.visualStyles)

  // Network summary store actions
  const updateNetworkSummary = useNetworkSummaryStore((state) => state.update)

  // Undo/redo support
  const { postEdit } = useUndoStack()

  /**
   * Delete nodes from the network
   *
   * @param networkId - The ID of the network to delete nodes from
   * @param nodeIds - Array of node IDs to delete
   * @param options - Optional configuration
   * @returns Result object with deletion statistics and success status
   */
  const deleteNodes = (
    networkId: IdType,
    nodeIds: IdType[],
    options?: DeleteNodesOptions,
  ): DeleteNodesResult => {
    try {
      // Get fresh network state from store (not stale snapshot)
      const network = useNetworkStore.getState().networks.get(networkId)
      if (!network) {
        return {
          success: false,
          deletedNodeCount: 0,
          deletedEdgeCount: 0,
          error: `Network ${networkId} not found`,
        }
      }

      // Validate nodes exist
      if (nodeIds.length === 0) {
        return {
          success: false,
          deletedNodeCount: 0,
          deletedEdgeCount: 0,
          error: 'No nodes specified for deletion',
        }
      }

      // Check if any of the requested nodes actually exist
      const nodesToDelete = network.nodes.filter((node) =>
        nodeIds.includes(node.id),
      )

      if (nodesToDelete.length === 0) {
        return {
          success: false,
          deletedNodeCount: 0,
          deletedEdgeCount: 0,
          error: 'None of the specified nodes exist',
        }
      }

      // Filter to only node IDs that actually exist
      const existingNodeIds = nodesToDelete.map((node) => node.id)

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

      // Call the pure function to delete nodes (only existing ones)
      // Pass the network we validated to avoid stale snapshot issues
      const result = deleteNodesCore(networkId, existingNodeIds, network, storeActions)

      // Clean up visual style bypasses for deleted nodes and edges
      const visualStyle = visualStyles[networkId]
      if (visualStyle) {
        const allDeletedIds = [
          ...result.deletedNodeIds,
          ...result.deletedEdges.map((edge) => edge.id),
        ]

        // Iterate through all visual properties and remove bypasses
        Object.keys(visualStyle).forEach((vpName) => {
          const visualProperty = visualStyle[vpName as VisualPropertyName]
          if (visualProperty?.bypassMap) {
            const hasBypassesToDelete = allDeletedIds.some((id) =>
              visualProperty.bypassMap.has(id),
            )
            if (hasBypassesToDelete) {
              deleteBypass(networkId, vpName as VisualPropertyName, allDeletedIds)
            }
          }
        })
      }

      // Record for undo/redo (unless skipUndo is true)
      if (!options?.skipUndo) {
        postEdit(
          UndoCommandType.DELETE_NODES,
          `Delete ${nodeIds.length} Node${nodeIds.length === 1 ? '' : 's'}`,
          // Undo: restore the deleted nodes and edges
          [
            networkId,
            result.deletedNodeIds,
            result.deletedEdges,
            result.deletedNodeViews,
            result.deletedEdgeViews,
            result.deletedNodeRows,
            result.deletedEdgeRows,
          ],
          // Redo: delete the nodes again
          [networkId, result.deletedNodeIds],
        )
      }

      return {
        success: true,
        deletedNodeCount: result.deletedNodeIds.length,
        deletedEdgeCount: result.deletedEdges.length,
      }
    } catch (error) {
      return {
        success: false,
        deletedNodeCount: 0,
        deletedEdgeCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  return {
    deleteNodes,
  }
}
