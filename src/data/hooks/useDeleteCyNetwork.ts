import { IdType } from '../../models/IdType'
import {
  deleteAllNetworksFromAllStores,
  deleteNetworkFromAllStores,
} from './deleteNetworkOrchestrator'
import { useUrlNavigation } from './navigation/useUrlNavigation'
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
 * Hook that provides functions to delete networks from workspace and all
 * stores. The cascade itself lives in deleteNetworkOrchestrator (the
 * single source of truth, shared with the App API — REVIEW.md A4); this
 * hook only adds URL navigation on top.
 */
export const useDeleteCyNetwork = (): UseDeleteCyNetworkReturn => {
  const { navigateToNetwork } = useUrlNavigation()

  const deleteNetwork = (id: IdType, options?: DeleteNetworkOptions): void => {
    const navigate = options?.navigate ?? true

    // The orchestrator cleans every store (including per-network UI state
    // and the active view) and repairs currentNetworkId
    const { currentNetworkId } = deleteNetworkFromAllStores(id)

    if (navigate) {
      const freshWorkspace = useWorkspaceStore.getState().workspace
      navigateToNetwork({
        workspaceId: freshWorkspace.id,
        networkId: currentNetworkId,
        searchParams: new URLSearchParams(location.search),
        replace: true,
      })
    }
  }

  const deleteCurrentNetwork = (
    options: DeleteNetworkOptions = { navigate: true },
  ): void => {
    const currentNetworkId =
      useWorkspaceStore.getState().workspace.currentNetworkId
    if (currentNetworkId !== '') {
      deleteNetwork(currentNetworkId, options)
    }
  }

  const deleteAllNetworks = (): void => {
    deleteAllNetworksFromAllStores()

    // The URL must leave the deleted network too: WorkspaceEditor loads a
    // network only when the URL's network id changes, so re-adding the same
    // network (Open Sample Networks) would navigate to an unchanged path and
    // never load it.
    navigateToNetwork({
      workspaceId: useWorkspaceStore.getState().workspace.id,
      networkId: '',
      searchParams: new URLSearchParams(location.search),
      replace: true,
    })
  }

  return {
    deleteNetwork,
    deleteCurrentNetwork,
    deleteAllNetworks,
  }
}
