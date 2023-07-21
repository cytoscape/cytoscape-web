import { useEffect } from 'react'
import { IdType } from '../../models/IdType'
import { UpdateEventType, useNetworkStore } from '../NetworkStore'
import { useViewModelStore } from '../ViewModelStore'

/**
 * Based on the changes in the workspace store, this hook will
 * handle cascading changes to the database.
 *
 * Mostly for clean up tasks.
 */
export const useNetworkViewManager = (): void => {
  const networkViewModels = useViewModelStore((state) => state.viewModels)
  const lastUpdated = useNetworkStore((state) => state.lastUpdated)

  const deleteViewObjects: (networkId: IdType, ids: IdType[]) => void =
    useViewModelStore((state) => state.deleteObjects)

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)

  useEffect(() => {
    if (lastUpdated === undefined) {
      return
    }

    const { networkId, type, payload } = lastUpdated
    if (type === UpdateEventType.DELETE) {
      const deletedIds = new Set<IdType>(payload)

      const networkViewModel = networkViewModels[networkId]

      const selectedNodes: IdType[] =
        networkViewModel !== undefined ? networkViewModel.selectedNodes : []
      const selectedEdges: IdType[] =
        networkViewModel !== undefined ? networkViewModel.selectedEdges : []

      const deletedNodes: IdType[] = []
      const deletedEdges: IdType[] = []
      // Split the selection into nodes and edges
      deletedIds.forEach((id) => {
        if (networkViewModel?.nodeViews[id] !== undefined) {
          deletedNodes.push(id)
        } else if (networkViewModel?.edgeViews[id] !== undefined) {
          deletedEdges.push(id)
        }
      })

      let newNodeSelection: IdType[] = []
      let newEdgeSelection: IdType[] = []

      if (deletedNodes.length === 0) {
        // Nodes were not deleted, so no need to update selection
        newNodeSelection = selectedNodes
      } else {
        const deletedNodeIds = new Set<IdType>(deletedNodes)
        const newSelectedNodeSet = new Set(
          [...selectedNodes].filter((x) => !deletedNodeIds.has(x)),
        )
        newNodeSelection = [...newSelectedNodeSet]
      }

      if (deletedEdges.length === 0) {
        // Edges were not deleted, so no need to update selection
        newEdgeSelection = selectedEdges
      } else {
        const deletedEdgeIds = new Set<IdType>(deletedEdges)
        const newSelectedEdgeSet = new Set(
          [...selectedEdges].filter((x) => !deletedEdgeIds.has(x)),
        )
        newEdgeSelection = [...newSelectedEdgeSet]
      }

      exclusiveSelect(networkId, newNodeSelection, newEdgeSelection)

      // Check selection
      console.log(
        '* Network view model and selection updated',
        lastUpdated,
        newNodeSelection,
        newEdgeSelection,
      )

      deleteViewObjects(networkId, payload)
    }
  }, [lastUpdated])
}
