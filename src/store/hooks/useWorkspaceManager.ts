import { useEffect } from 'react'
import { IdType } from '../../models/IdType'
import { useNetworkStore } from '../NetworkStore'
import { useNetworkSummaryStore } from '../NetworkSummaryStore'
import { useTableStore } from '../TableStore'
import { useViewModelStore } from '../ViewModelStore'
import { useVisualStyleStore } from '../VisualStyleStore'
import { useWorkspaceStore } from '../WorkspaceStore'
import { useUiStateStore } from '../UiStateStore'
import { useHcxValidatorStore } from '../../features/HierarchyViewer/store/HcxValidatorStore'

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

  const deleteValidationResult = useHcxValidatorStore(
    (state) => state.deleteValidationResult,
  )
  const deleteAllValidationResults = useHcxValidatorStore(
    (state) => state.deleteAllValidationResults,
  )
  const validationResults = useHcxValidatorStore(
    (state) => state.validationResults,
  )

  const setActiveNetworkView = useUiStateStore(
    (state) => state.setActiveNetworkView,
  )
  const activeNetworkView = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )

  const handleDeleteNetwork = (deleted: IdType): void => {
    deleteNetwork(deleted)
    deleteSummary(deleted)
    deleteView(deleted)
    deleteVisualStyle(deleted)
    deleteTables(deleted)
    deleteNetworkModifiedStatus(deleted)

    if (activeNetworkView === deleted) {
      setActiveNetworkView('')
    }

    if (validationResults[deleted] !== undefined) {
      deleteValidationResult(deleted)
    }
  }

  const handleDeleteAll = (): void => {
    deleteAllNetworks()
    deleteAllSummaries()
    deleteAllViews()
    deleteAllVisualStyles()
    deleteAllTables()
    deleteAllNetworkModifiedStatuses()
    deleteAllValidationResults()
    setActiveNetworkView('')
  }

  useEffect(() => {
    const handleNetworkIdDeletion = useWorkspaceStore.subscribe(
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

    // when current network id changes, update the active network view
    const handleCurrentNetworkIdChange = useWorkspaceStore.subscribe(
      (state) => state.workspace.currentNetworkId,
      (id, lastId) => {
        if (id !== lastId) {
          if (id === '') {
            setActiveNetworkView('')
          } else {
            setActiveNetworkView(id)
          }
        }
      },
    )
    return () => {
      handleNetworkIdDeletion() // Unsubscribe
      handleCurrentNetworkIdChange()
    }
  }, [])
}
