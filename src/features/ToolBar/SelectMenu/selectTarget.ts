import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../../models/IdType'

/**
 * The network the Select menu acts on: the active network view (a Hierarchy
 * Viewer subnetwork once its pane was clicked), else the current network.
 * The STYLE and FILTER tabs pick their network the same way.
 */
export const resolveSelectTargetNetworkId = (
  activeNetworkView: IdType | undefined,
  currentNetworkId: IdType,
): IdType =>
  activeNetworkView === undefined || activeNetworkView === ''
    ? currentNetworkId
    : activeNetworkView

/** The Select menu's network, read from the stores now (no subscription) */
export const getSelectTargetNetworkId = (): IdType =>
  resolveSelectTargetNetworkId(
    useUiStateStore.getState().ui.activeNetworkView,
    useWorkspaceStore.getState().workspace.currentNetworkId,
  )

/** The Select menu's network, re-rendering when it changes */
export const useSelectTargetNetworkId = (): IdType => {
  const activeNetworkView = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  return resolveSelectTargetNetworkId(activeNetworkView, currentNetworkId)
}
