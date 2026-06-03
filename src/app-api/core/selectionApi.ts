// src/app-api/core/selectionApi.ts
// Framework-agnostic Selection API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { IdType } from '../../models/IdType'
import { ApiErrorCode, ApiResult, fail, ok } from '../types/ApiResult'

// ── Public types ─────────────────────────────────────────────────────────────

export interface SelectionState {
  selectedNodes: IdType[]
  selectedEdges: IdType[]
}

export interface SelectionApi {
  exclusiveSelect(
    networkId: IdType,
    nodeIds: IdType[],
    edgeIds: IdType[],
  ): ApiResult

  additiveSelect(networkId: IdType, ids: IdType[]): ApiResult
  additiveUnselect(networkId: IdType, ids: IdType[]): ApiResult
  toggleSelected(networkId: IdType, ids: IdType[]): ApiResult
  getSelection(networkId: IdType): ApiResult<SelectionState>
}

// ── Core implementation ──────────────────────────────────────────────────────

export const selectionApi: SelectionApi = {
  exclusiveSelect(networkId, nodeIds, edgeIds): ApiResult {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      useViewModelStore.getState().exclusiveSelect(networkId, nodeIds, edgeIds)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  additiveSelect(networkId, ids): ApiResult {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      useViewModelStore.getState().additiveSelect(networkId, ids)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  additiveUnselect(networkId, ids): ApiResult {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      useViewModelStore.getState().additiveUnselect(networkId, ids)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  toggleSelected(networkId, ids): ApiResult {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      useViewModelStore.getState().toggleSelected(networkId, ids)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  getSelection(networkId): ApiResult<SelectionState> {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      return ok({
        selectedNodes: viewModel.selectedNodes,
        selectedEdges: viewModel.selectedEdges,
      })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },
}
