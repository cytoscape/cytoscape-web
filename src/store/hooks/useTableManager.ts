import { useEffect } from 'react'
import { useNetworkStore } from '../NetworkStore'
import { useTableStore } from '../TableStore'
import { UpdateEventType } from '../../models/StoreModel/NetworkStoreModel'

/**
 * Based on the changes in the workspace store, this hook will
 * handle cascading changes to the database.
 *
 * Mostly for clean up tasks.
 */
export const useTableManager = (): void => {
  const deleteRows = useTableStore((state) => state.deleteRows)

  useEffect(() => {
    const sub = useNetworkStore.subscribe(
      (state) => state.lastUpdated,
      (lastUpdated) => {
        if (lastUpdated === undefined) {
          return
        }

        const { networkId, type, payload } = lastUpdated
        if (type === UpdateEventType.DELETE) {
          deleteRows(networkId, payload)
          console.log('* Rows deleted updated', networkId, payload)
        }
      },
    )
    return () => {
      sub() // Unsubscribe
    }
  }, [])
}
