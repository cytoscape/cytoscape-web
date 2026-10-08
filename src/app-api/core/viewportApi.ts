// src/app-api/core/viewportApi.ts
// Framework-agnostic Viewport API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useRendererFunctionStore } from '../../data/hooks/stores/RendererFunctionStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { IdType } from '../../models/IdType'
import { AppCodes, ApiResult, fail, ok } from '../types/ApiResult'
import { markNetworkModified } from './undo'
import { validateNodesExist } from './validation'

// ── Public types ─────────────────────────────────────────────────────────────

/** JSON-serializable position map: nodeId → [x, y, z?] */
export type PositionRecord = Record<IdType, [number, number, number?]>

export interface ViewportApi {
  fit(networkId: IdType): Promise<ApiResult>

  /**
   * Read node positions. When `nodeIds` is omitted, every node's position
   * is returned. Requested ids with no view are reported in `missing`
   * (symmetric with elementApi.getNodes).
   */
  getNodePositions(
    networkId: IdType,
    nodeIds?: IdType[],
  ): ApiResult<{ positions: PositionRecord; missing: IdType[] }>

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
        return fail(AppCodes.FUNCTION_NOT_AVAILABLE, 'fit')
      }
      fn()
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getNodePositions(
    networkId,
    nodeIds,
  ): ApiResult<{ positions: PositionRecord; missing: IdType[] }> {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const nodeViews = viewModel.nodeViews ?? {}
      const readPosition = (
        nodeId: IdType,
      ): [number, number, number?] | undefined => {
        const nodeView = nodeViews[nodeId]
        if (nodeView === undefined) return undefined
        return nodeView.z !== undefined
          ? [nodeView.x, nodeView.y, nodeView.z]
          : [nodeView.x, nodeView.y]
      }

      const positions: PositionRecord = {}
      // Default to every node in the network when no ids are given
      const ids =
        nodeIds ??
        useNetworkStore
          .getState()
          .networks.get(networkId)
          ?.nodes.map((n) => n.id) ??
        Object.keys(nodeViews)
      const missing: IdType[] = []
      for (const nodeId of ids) {
        const position = readPosition(nodeId)
        if (position !== undefined) positions[nodeId] = position
        else missing.push(nodeId)
      }
      return ok({ positions, missing })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  updateNodePositions(networkId, positions): ApiResult {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      // An empty record moves no node. Checked after the network lookup, so a
      // bogus networkId still reports NETWORK_NOT_FOUND rather than silently
      // succeeding.
      const nodeIds = Object.keys(positions)
      if (nodeIds.length === 0) {
        return ok()
      }

      const missingNodes = validateNodesExist(networkId, nodeIds)
      if (missingNodes) return missingNodes

      // Convert PositionRecord (JSON-serializable) to Map required by store
      const positionMap = new Map<IdType, [number, number, number?]>(
        Object.entries(positions) as Array<[IdType, [number, number, number?]]>,
      )
      useViewModelStore.getState().updateNodePositions(networkId, positionMap)
      // No undo entry: MOVE_NODES is per-node and a batch reposition has no
      // matching command. layoutApi's own moves already go through
      // corePostEdit, which marks the network itself.
      markNetworkModified(networkId)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },
}
