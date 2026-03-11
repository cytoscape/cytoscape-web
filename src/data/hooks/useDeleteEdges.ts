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
      // Get fresh network state from store (not stale snapshot)
      const network = useNetworkStore.getState().networks.get(networkId)
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

      // Check if any of the requested edges actually exist
      const edgesToDelete: Edge[] = network.edges.filter((edge) =>
        edgeIds.includes(edge.id),
      )

      if (edgesToDelete.length === 0) {
        return {
          success: false,
          deletedEdgeCount: 0,
          error: 'None of the specified edges exist',
        }
      }

      // Filter to only edge IDs that actually exist
      const existingEdgeIds = edgesToDelete.map((edge) => edge.id)

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

      // Capture visual style bypasses before deletion
      const deletedBypasses = new Map<
        VisualPropertyName,
        Map<IdType, any>
      >()
      const visualStyle = visualStyles[networkId]
      if (visualStyle) {
        Object.keys(visualStyle).forEach((vpName) => {
          const visualProperty = visualStyle[vpName as VisualPropertyName]
          if (visualProperty?.bypassMap) {
            const bypassesForProperty = new Map<IdType, any>()
            existingEdgeIds.forEach((id) => {
              if (visualProperty.bypassMap.has(id)) {
                bypassesForProperty.set(id, visualProperty.bypassMap.get(id))
              }
            })
            if (bypassesForProperty.size > 0) {
              deletedBypasses.set(vpName as VisualPropertyName, bypassesForProperty)
            }
          }
        })
      }

      // Call the pure function to delete edges (only existing ones)
      // Pass the network we validated to avoid stale snapshot issues
      const result = deleteEdgesCore(networkId, existingEdgeIds, network, storeActions)

      // Clean up visual style bypasses for deleted edges
      if (visualStyle) {
        // Iterate through all visual properties and remove bypasses
        Object.keys(visualStyle).forEach((vpName) => {
          const visualProperty = visualStyle[vpName as VisualPropertyName]
          if (visualProperty?.bypassMap) {
            const hasBypassesToDelete = existingEdgeIds.some((id) =>
              visualProperty.bypassMap.has(id),
            )
            if (hasBypassesToDelete) {
              deleteBypass(networkId, vpName as VisualPropertyName, existingEdgeIds)
            }
          }
        })
      }

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
            deletedBypasses,
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
