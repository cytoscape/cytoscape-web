import { useHcxValidatorStore } from '../../features/HierarchyViewer/store/HcxValidatorStore'
import { IdType } from '../../models/IdType'
import { useFilterStore } from './stores/FilterStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from './stores/OpaqueAspectStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useUndoStore } from './stores/UndoStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'

/**
 * Single source of truth for the network-deletion cascade (REVIEW.md A4).
 *
 * Before this existed, the ~10-store cascade was duplicated by hand
 * between `useDeleteCyNetwork` and `networkApi.deleteNetwork`, and the two
 * copies had already drifted: the App API never repaired
 * `currentNetworkId` with `navigate: false` (R2-13), and both omitted the
 * persisted UiStateStore entries and the in-memory FilterStore search
 * indexes. Every per-network store must be cleaned HERE and only here.
 *
 * Framework-agnostic: no React imports; stores are accessed via
 * `getState()` so both React hooks and the App API core can call it.
 */

export interface DeleteNetworkCascadeResult {
  /**
   * The current network id after the deletion — unchanged when a
   * non-current network was deleted, otherwise the first remaining
   * network (or '' when the workspace is empty).
   */
  readonly currentNetworkId: IdType
}

export const deleteNetworkFromAllStores = (
  networkId: IdType,
): DeleteNetworkCascadeResult => {
  useNetworkStore.getState().delete(networkId)
  useNetworkSummaryStore.getState().delete(networkId)
  useViewModelStore.getState().delete(networkId)
  useVisualStyleStore.getState().delete(networkId)
  useTableStore.getState().delete(networkId)
  useWorkspaceStore.getState().deleteNetworkModifiedStatus(networkId)
  useOpaqueAspectStore.getState().delete(networkId)
  useUndoStore.getState().deleteStack(networkId)
  useUiStateStore.getState().deleteNetworkUiState(networkId)
  useFilterStore.getState().deleteNetworkIndex(networkId)

  if (useUiStateStore.getState().ui.activeNetworkView === networkId) {
    useUiStateStore.getState().setActiveNetworkView('')
  }

  if (
    useHcxValidatorStore.getState().validationResults[networkId] !== undefined
  ) {
    useHcxValidatorStore.getState().deleteValidationResult(networkId)
  }

  // Remove from the workspace
  useWorkspaceStore.getState().deleteNetwork(networkId)

  // The orchestrator owns the invariant `currentNetworkId ∈ networkIds ∪
  // {''}` (R2-13): repair the pointer whenever the deleted network was
  // current — regardless of whether the caller navigates afterwards.
  const workspace = useWorkspaceStore.getState().workspace
  if (workspace.currentNetworkId === networkId) {
    const nextNetworkId = workspace.networkIds[0] ?? ''
    useWorkspaceStore.getState().setCurrentNetworkId(nextNetworkId)
  }

  return {
    currentNetworkId: useWorkspaceStore.getState().workspace.currentNetworkId,
  }
}

export const deleteAllNetworksFromAllStores = (): void => {
  useNetworkStore.getState().deleteAll()
  useNetworkSummaryStore.getState().deleteAll()
  useViewModelStore.getState().deleteAll()
  useVisualStyleStore.getState().deleteAll()
  useTableStore.getState().deleteAll()
  useOpaqueAspectStore.getState().deleteAll()
  useUndoStore.getState().deleteAllStacks()
  useWorkspaceStore.getState().deleteAllNetworkModifiedStatuses()
  useHcxValidatorStore.getState().deleteAllValidationResults()
  useUiStateStore.getState().deleteAllNetworkUiState()
  useFilterStore.getState().deleteAllNetworkIndexes()

  useWorkspaceStore.getState().deleteAllNetworks()
}
