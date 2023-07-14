import { useEffect } from 'react'
import { IdType } from '../../models/IdType'
import { useNetworkStore } from '../NetworkStore'
// import { useViewModelStore } from '../ViewModelStore'
// import { useWorkspaceStore } from '../WorkspaceStore'
// import { Network } from '../../models/NetworkModel'

/**
 * Based on the changes in the workspace store, this hook will
 * handle cascading changes to the database.
 *
 * Mostly for clean up tasks.
 */
let counter = 0
export const useNetworkViewManager = (): void => {
  // const currentNetworkId: IdType = useWorkspaceStore(
  //   (state) => state.workspace.currentNetworkId,
  // )
  // const networks: Map<IdType, Network> = useNetworkStore(
  //   (state) => state.networks,
  // )
  const setLastModified = useNetworkStore((state) => state.setLastModified)

  // function to remove objects from the view model
  // const deleteObjects = useViewModelStore((state) => state.deleteObjects)

  const handleDeleteObjects = (deleted: IdType[]): void => {
    if (deleted !== undefined && deleted.length > 0) {
      // deleteObjects(currentNetworkId, deleted)
    }
  }

  useEffect(() => {
    const sub = useNetworkStore.subscribe(
      (state) => state,
      (state, lastState) => {
        counter++
        console.log('Calling update', counter)
        if (lastState === undefined || state === undefined) {
          return
        }

        // const lastModified: string = state.lastModified
        // const target: Network | undefined = networks.get(state)
        // if (target === undefined) {
        //   return
        // }

        console.log('### Network model updated', state)
        handleDeleteObjects([])
        setLastModified('')
      },
    )
    return () => {
      sub() // Unsubscribe
    }
  }, [])
}
