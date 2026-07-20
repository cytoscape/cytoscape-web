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

    // The orchestrator cleans every store and repairs currentNetworkId
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
  }

  return {
    deleteNetwork,
    deleteCurrentNetwork,
    deleteAllNetworks,
  }
}
