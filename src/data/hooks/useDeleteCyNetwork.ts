import { useHcxValidatorStore } from '../../features/HierarchyViewer/store/HcxValidatorStore'
import { IdType } from '../../models/IdType'
import { useUrlNavigation } from './navigation/useUrlNavigation'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from './stores/OpaqueAspectStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'

interface UseDeleteCyNetworkReturn {
  deleteNetwork: (id: IdType, options?: DeleteNetworkOptions) => void
  deleteCurrentNetwork: (options?: DeleteNetworkOptions) => void
  deleteAllNetworks: () => void
}

interface DeleteNetworkOptions {
  navigate?: boolean
}

/**
 * Hook that provides functions to delete networks from workspace and all stores.
 * Handles:
 * - Removing network from workspace
 * - Cascading deletion of related data (summaries, views, tables, etc.)
 * - Navigation to next available network (optional)
 * - Clearing active network view
 */
export const useDeleteCyNetwork = (): UseDeleteCyNetworkReturn => {
  // Individual delete functions
  const deleteNetworkFromStore = useNetworkStore((state) => state.delete)
  const deleteSummary = useNetworkSummaryStore((state) => state.delete)
  const deleteView = useViewModelStore((state) => state.delete)
  const deleteVisualStyle = useVisualStyleStore((state) => state.delete)
  const deleteTables = useTableStore((state) => state.delete)
  const deleteAspects = useOpaqueAspectStore((state) => state.delete)
  const deleteNetworkModifiedStatus = useWorkspaceStore(
    (state) => state.deleteNetworkModifiedStatus,
  )
  const deleteValidationResult = useHcxValidatorStore(
    (state) => state.deleteValidationResult,
  )

  // Delete all functions
  const deleteAllNetworksFromStore = useNetworkStore((state) => state.deleteAll)
  const deleteAllSummaries = useNetworkSummaryStore((state) => state.deleteAll)
  const deleteAllViews = useViewModelStore((state) => state.deleteAll)
  const deleteAllVisualStyles = useVisualStyleStore((state) => state.deleteAll)
  const deleteAllTables = useTableStore((state) => state.deleteAll)
  const deleteAllAspects = useOpaqueAspectStore((state) => state.deleteAll)
  const deleteAllNetworkModifiedStatuses = useWorkspaceStore(
    (state) => state.deleteAllNetworkModifiedStatuses,
  )
  const deleteAllValidationResults = useHcxValidatorStore(
    (state) => state.deleteAllValidationResults,
  )

  // Workspace functions
  const deleteNetworkFromWorkspace = useWorkspaceStore(
    (state) => state.deleteNetwork,
  )
  const deleteAllNetworksFromWorkspace = useWorkspaceStore(
    (state) => state.deleteAllNetworks,
  )
  const workspace = useWorkspaceStore((state) => state.workspace)
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  // State accessors
  const validationResults = useHcxValidatorStore(
    (state) => state.validationResults,
  )
  const activeNetworkView = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const setActiveNetworkView = useUiStateStore(
    (state) => state.setActiveNetworkView,
  )

  const { navigateToNetwork } = useUrlNavigation()

  const deleteNetwork = (
    id: IdType,
    options?: DeleteNetworkOptions,
  ): void => {
    const navigate = options?.navigate ?? true

    // Delete from all stores
    deleteNetworkFromStore(id)
    deleteSummary(id)
    deleteView(id)
    deleteVisualStyle(id)
    deleteTables(id)
    deleteNetworkModifiedStatus(id)
    deleteAspects(id)

    if (activeNetworkView === id) {
      setActiveNetworkView('')
    }

    if (validationResults[id] !== undefined) {
      deleteValidationResult(id)
    }

    // Delete from workspace
    deleteNetworkFromWorkspace(id)

    // Handle navigation if requested
    if (navigate) {
      const nextNetworkId =
        workspace.networkIds.filter((networkId) => networkId !== id)?.[0] ?? ''

      if (nextNetworkId !== '') {
        setCurrentNetworkId(nextNetworkId)
        navigateToNetwork({
          workspaceId: workspace.id,
          networkId: nextNetworkId,
          searchParams: new URLSearchParams(location.search),
          replace: true,
        })
      } else {
        setCurrentNetworkId('')
        navigateToNetwork({
          workspaceId: workspace.id,
          networkId: '',
          searchParams: new URLSearchParams(location.search),
          replace: true,
        })
      }
    }
  }

  const deleteCurrentNetwork = (
    options: DeleteNetworkOptions = { navigate: true },
  ): void => {
    const currentNetworkId = workspace.currentNetworkId
    if (currentNetworkId !== '') {
      deleteNetwork(currentNetworkId, options)
    }
  }

  const deleteAllNetworks = (): void => {
    deleteAllNetworksFromStore()
    deleteAllSummaries()
    deleteAllViews()
    deleteAllVisualStyles()
    deleteAllTables()
    deleteAllAspects()
    deleteAllNetworkModifiedStatuses()
    deleteAllValidationResults()
    setActiveNetworkView('')

    // Delete from workspace
    deleteAllNetworksFromWorkspace()
  }

  return {
    deleteNetwork,
    deleteCurrentNetwork,
    deleteAllNetworks,
  }
}

