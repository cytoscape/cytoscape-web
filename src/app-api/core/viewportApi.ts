// src/app-api/core/viewportApi.ts
// Framework-agnostic Viewport API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useRendererFunctionStore } from '../../data/hooks/stores/RendererFunctionStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { IdType } from '../../models/IdType'
import { ApiErrorCode, ApiResult, fail, ok } from '../types/ApiResult'

// ── Public types ─────────────────────────────────────────────────────────────

/** JSON-serializable position map: nodeId → [x, y, z?] */
export type PositionRecord = Record<IdType, [number, number, number?]>

export interface ViewportApi {
  fit(networkId: IdType): Promise<ApiResult>

  getNodePositions(
    networkId: IdType,
    nodeIds: IdType[],
  ): ApiResult<{ positions: PositionRecord }>

  updateNodePositions(networkId: IdType, positions: PositionRecord): ApiResult
}

// ── Core implementation ──────────────────────────────────────────────────────

export const viewportApi: ViewportApi = {
  async fit(networkId): Promise<ApiResult> {
    try {
      const fn = useRendererFunctionStore
        .getState()
        .getFunction('cyjs', 'fit', networkId)
      if (fn === undefined) {
        return fail(
          ApiErrorCode.FunctionNotAvailable,
          `Fit function not registered for network ${networkId}`,
        )
      }
      fn()
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  getNodePositions(
    networkId,
    nodeIds,
  ): ApiResult<{ positions: PositionRecord }> {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      const positions: PositionRecord = {}
      for (const nodeId of nodeIds) {
        const nodeView = viewModel.nodeViews?.[nodeId]
        if (nodeView !== undefined) {
          positions[nodeId] =
            nodeView.z !== undefined
              ? [nodeView.x, nodeView.y, nodeView.z]
              : [nodeView.x, nodeView.y]
        }
      }
      return ok({ positions })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  updateNodePositions(networkId, positions): ApiResult {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      // Convert PositionRecord (JSON-serializable) to Map required by store
      const positionMap = new Map<IdType, [number, number, number?]>(
        Object.entries(positions) as Array<[IdType, [number, number, number?]]>,
      )
      useViewModelStore.getState().updateNodePositions(networkId, positionMap)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },
}
