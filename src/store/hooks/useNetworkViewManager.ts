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
  const deleteViewObjects: (networkId: IdType, ids: IdType[]) => void =
    useViewModelStore((state) => state.deleteObjects)

  const networkViewModels = useViewModelStore((state) => state.viewModels)
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)

  useEffect(() => {
    const sub = useNetworkStore.subscribe(
      (state) => state.lastUpdated,
      (lastUpdated) => {
        if (lastUpdated === undefined) {
          return
        }

        const { networkId, type, payload } = lastUpdated
        if (type === UpdateEventType.DELETE) {
          deleteViewObjects(networkId, payload)
          const deletedIds = new Set<IdType>(payload)

          const networkViewModel = networkViewModels[networkId]
          const selectedNodes: IdType[] =
            networkViewModel !== undefined ? networkViewModel.selectedNodes : []
          let newNodeSelection: IdType[] = []
          let newEdgeSelection: IdType[] = []

          if (selectedNodes.length > 0) {
            const selectedNodeIds = new Set<IdType>(selectedNodes)
            const intersection = new Set(
              [...deletedIds].filter((x) => !selectedNodeIds.has(x)),
            )
            if (intersection.size > 0) {
              newNodeSelection = [...intersection]
            }
          }
          const selectedEdges: IdType[] =
            networkViewModel !== undefined ? networkViewModel.selectedEdges : []
          if (selectedEdges.length > 0) {
            const selectedEdgeIds = new Set<IdType>(selectedEdges)
            const intersection = new Set(
              [...deletedIds].filter((x) => !selectedEdgeIds.has(x)),
            )
            if (intersection.size > 0) {
              newEdgeSelection = [...intersection]
            }
          }

          exclusiveSelect(networkId, newNodeSelection, newEdgeSelection)

          // Check selection
          console.log('* Network view model and selection updated', lastUpdated)
        }
      },
    )
    return () => {
      sub() // Unsubscribe
    }
  }, [])
}
