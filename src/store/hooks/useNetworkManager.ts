import { useEffect } from 'react'
import { IdType } from '../../models/IdType'
import { useNetworkStore } from '../NetworkStore'
import { useViewModelStore } from '../ViewModelStore'
import { useWorkspaceStore } from '../WorkspaceStore'

/**
 * Based on the changes in the workspace store, this hook will
 * handle cascading changes to the database.
 *
 * Mostly for clean up tasks.
 */
export const useNetworkManager = (): void => {
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const deleteObjects = useViewModelStore((state) => state.deleteObjects)

  const sub = useNetworkStore.subscribe(
    (state) => state.networks.get(currentNetworkId),
    (network, lastNetwork) => {
      console.log('### Network model updated', network, lastNetwork)
      handleDeleteObjects([])
    },
  )

  const handleDeleteObjects = (deleted: IdType[]): void => {
    deleteObjects(currentNetworkId, deleted)
  }

  useEffect(() => {
    return () => {
      sub() // Unsubscribe
    }
  }, [])
}
