import { useEffect } from 'react'
import { IdType } from '../../models/IdType'
import { useNetworkStore } from '../NetworkStore'
import { useNetworkSummaryStore } from '../NetworkSummaryStore'
import { useTableStore } from '../TableStore'
import { useViewModelStore } from '../ViewModelStore'
import { useVisualStyleStore } from '../VisualStyleStore'
import { useWorkspaceStore } from '../WorkspaceStore'

/**
 * Based on the changes in the workspace store, this hook will
 * handle cascading changes to the database.
 *
 * Mostly for clean up tasks.
 */

export const useWorkspaceManager = (): void => {
  const deleteNetwork = useNetworkStore((state) => state.delete)
  const deleteSummary = useNetworkSummaryStore((state) => state.delete)
  const deleteView = useViewModelStore((state) => state.delete)
  const deleteVisualStyle = useVisualStyleStore((state) => state.delete)
  const deleteTables = useTableStore((state) => state.delete)

  const deleteAllNetworks = useNetworkStore((state) => state.deleteAll)
  const deleteAllSummaries = useNetworkSummaryStore((state) => state.deleteAll)
  const deleteAllViews = useViewModelStore((state) => state.deleteAll)
  const deleteAllVisualStyles = useVisualStyleStore((state) => state.deleteAll)
  const deleteAllTables = useTableStore((state) => state.deleteAll)
  const deleteNetworkModifiedStatus = useWorkspaceStore(
    (state) => state.deleteNetworkModifiedStatus,
  )
  const deleteAllNetworkModifiedStatuses = useWorkspaceStore(
    (state) => state.deleteAllNetworkModifiedStatuses,
  )

  const handleDeleteNetwork = (deleted: IdType): void => {
    deleteNetwork(deleted)
    deleteSummary(deleted)
    deleteView(deleted)
    deleteVisualStyle(deleted)
    deleteTables(deleted)
    deleteNetworkModifiedStatus(deleted)
  }

  const handleDeleteAll = (): void => {
    deleteAllNetworks()
    deleteAllSummaries()
    deleteAllViews()
    deleteAllVisualStyles()
    deleteAllTables()
    deleteAllNetworkModifiedStatuses()
  }

  useEffect(() => {
    const sub = useWorkspaceStore.subscribe(
      (state) => state.workspace.networkIds,
      (ids, lastIds) => {
        if (ids.length === 0 && lastIds.length !== 0) {
          handleDeleteAll()
          console.log('! All networks removed from workspace')
        } else if (ids.length < lastIds.length) {
          const removed = lastIds.filter((id) => !ids.includes(id))
          handleDeleteNetwork(removed[0])
          console.log(
            '*************************************!! A network removed from workspace',
            removed[0],
          )
        }
      },
    )
    return () => {
      sub() // Unsubscribe
    }
  }, [])
}
