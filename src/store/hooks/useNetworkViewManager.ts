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
          console.log('* Network view model updated', lastUpdated)
        }
      },
    )
    return () => {
      sub() // Unsubscribe
    }
  }, [])
}
