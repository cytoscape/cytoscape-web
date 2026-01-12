/**
 * Hook for deleting edges with full integration across all stores
 *
 * This hook orchestrates edge deletion by:
 * 1. Deleting edges from the network topology
 * 2. Capturing deleted edge data for undo/redo
 * 3. Removing edge views from the view model
 * 4. Removing table rows for edges
 * 5. Cleaning up visual style bypasses for deleted edges
 * 6. Updating network summary counts
 * 7. Recording the action for undo/redo
 *
 * @example
 * ```typescript
 * const { deleteEdges } = useDeleteEdges()
 *
 * // Delete specific edges
 * const result = deleteEdges('network-123', ['e1', 'e2', 'e3'])
 *
 * // Check result
 * if (result.success) {
 *   console.log(`Deleted ${result.deletedEdgeCount} edges`)
 * }
 * ```
 */

import { IdType } from '../../models/IdType'
import { ValueType } from '../../models/TableModel'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { TableType } from '../../models/StoreModel/TableStoreModel'
import { Edge, EdgeView } from '../../models'
import { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
import {
  deleteEdgesCore,
  type EdgeOperationStoreActions,
} from '../../models/CyNetworkModel'
import { useNetworkStore } from './stores/NetworkStore'
import { useTableStore } from './stores/TableStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useUndoStack } from './useUndoStack'

export interface DeleteEdgesOptions {
  /**
   * Whether to skip undo/redo recording
   * @internal - Used by useUndoStack for redo operations
   * @default false
   */
  skipUndo?: boolean
}

export interface DeleteEdgesResult {
  /**
   * Whether the operation was successful
   */
  success: boolean

  /**
   * Number of edges deleted
   */
  deletedEdgeCount: number

  /**
   * Error message if the operation failed
   */
  error?: string
}

/**
 * Hook for deleting edges with full store integration and undo/redo support
 */
export const useDeleteEdges = () => {
  // Network store actions
  const deleteEdgesFromNetwork = useNetworkStore((state) => state.deleteEdges)
  const addEdge = useNetworkStore((state) => state.addEdge)
  const networks = useNetworkStore((state) => state.networks)

  // Table store actions
  const deleteRows = useTableStore((state) => state.deleteRows)
  const editRows = useTableStore((state) => state.editRows)
  const tables = useTableStore((state) => state.tables)

  // ViewModel store actions
  const deleteViewObjects = useViewModelStore((state) => state.deleteObjects)
  const addEdgeView = useViewModelStore((state) => state.addEdgeView)
  const viewModels = useViewModelStore((state) => state.viewModels)

  // Visual style store actions
  const deleteBypass = useVisualStyleStore((state) => state.deleteBypass)
  const visualStyles = useVisualStyleStore((state) => state.visualStyles)

  // Network summary store actions
  const updateNetworkSummary = useNetworkSummaryStore((state) => state.update)

  // Undo/redo support
  const { postEdit } = useUndoStack()

  /**
   * Delete edges from the network
   *
   * @param networkId - The ID of the network to delete edges from
   * @param edgeIds - Array of edge IDs to delete
   * @param options - Optional configuration
   * @returns Result object with deletion statistics and success status
   */
  const deleteEdges = (
    networkId: IdType,
    edgeIds: IdType[],
    options?: DeleteEdgesOptions,
  ): DeleteEdgesResult => {
    try {
      // Validate network exists
      const network = networks.get(networkId)
      if (!network) {
        return {
          success: false,
          deletedEdgeCount: 0,
          error: `Network ${networkId} not found`,
        }
      }

      // Validate edges exist
      if (edgeIds.length === 0) {
        return {
          success: false,
          deletedEdgeCount: 0,
          error: 'No edges specified for deletion',
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

      // Call the pure function to delete edges
      const result = deleteEdgesCore(networkId, edgeIds, storeActions)

      // Get the actual edge objects for undo
      const edgesToDelete: Edge[] = network.edges.filter((edge) =>
        edgeIds.includes(edge.id),
      )

      // Record for undo/redo (unless skipUndo is true)
      if (!options?.skipUndo) {
        postEdit(
          UndoCommandType.DELETE_EDGES,
          `Delete ${result.deletedEdgeIds.length} Edge${result.deletedEdgeIds.length === 1 ? '' : 's'}`,
          // Undo: restore the deleted edges
          [
            networkId,
            edgesToDelete,
            result.deletedEdgeViews,
            result.deletedEdgeRows,
          ],
          // Redo: delete the edges again
          [networkId, result.deletedEdgeIds],
        )
      }

      return {
        success: true,
        deletedEdgeCount: result.deletedEdgeIds.length,
      }
    } catch (error) {
      return {
        success: false,
        deletedEdgeCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  return {
    deleteEdges,
  }
}
