// src/app-api/core/selectionApi.ts
// Framework-agnostic Selection API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { IdType } from '../../models/IdType'
import { AppCodes, ApiResult, fail, ok } from '../types/ApiResult'

// ── Public types ─────────────────────────────────────────────────────────────

export interface SelectionState {
  selectedNodes: IdType[]
  selectedEdges: IdType[]
}

export interface SelectionApi {
  /** Replace the selection with exactly these nodes and edges. */
  exclusiveSelect(
    networkId: IdType,
    nodeIds: IdType[],
    edgeIds: IdType[],
  ): ApiResult

  /** Add these nodes and edges to the current selection. */
  additiveSelect(
    networkId: IdType,
    nodeIds: IdType[],
    edgeIds: IdType[],
  ): ApiResult

  /** Remove these nodes and edges from the current selection. */
  additiveDeselect(
    networkId: IdType,
    nodeIds: IdType[],
    edgeIds: IdType[],
  ): ApiResult

  /** Flip the selected state of these nodes and edges. */
  toggleSelected(
    networkId: IdType,
    nodeIds: IdType[],
    edgeIds: IdType[],
  ): ApiResult

  /** Clear the entire selection. */
  clearSelection(networkId: IdType): ApiResult

  getSelection(networkId: IdType): ApiResult<SelectionState>
}

// ── Core implementation ──────────────────────────────────────────────────────

export const selectionApi: SelectionApi = {
  exclusiveSelect(networkId, nodeIds, edgeIds): ApiResult {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      useViewModelStore.getState().exclusiveSelect(networkId, nodeIds, edgeIds)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  additiveSelect(networkId, nodeIds, edgeIds): ApiResult {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      // The store's additiveSelect takes a merged id array
      useViewModelStore
        .getState()
        .additiveSelect(networkId, [...nodeIds, ...edgeIds])
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  additiveDeselect(networkId, nodeIds, edgeIds): ApiResult {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      useViewModelStore
        .getState()
        .additiveUnselect(networkId, [...nodeIds, ...edgeIds])
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  toggleSelected(networkId, nodeIds, edgeIds): ApiResult {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      useViewModelStore
        .getState()
        .toggleSelected(networkId, [...nodeIds, ...edgeIds])
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  clearSelection(networkId): ApiResult {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      useViewModelStore.getState().exclusiveSelect(networkId, [], [])
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getSelection(networkId): ApiResult<SelectionState> {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      return ok({
        selectedNodes: viewModel.selectedNodes,
        selectedEdges: viewModel.selectedEdges,
      })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },
}
