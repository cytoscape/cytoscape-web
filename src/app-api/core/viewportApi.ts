// src/app-api/core/viewportApi.ts
// Framework-agnostic Viewport API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useRendererFunctionStore } from '../../data/hooks/stores/RendererFunctionStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { IdType } from '../../models/IdType'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import ViewModelFn, { NodeView } from '../../models/ViewModel'
import { AppCodes, ApiResult, fail, ok } from '../types/ApiResult'
import { corePostEdit, markNetworkModified } from './undo'
import { validateNodesExist } from './validation'

// ── Public types ─────────────────────────────────────────────────────────────

/** JSON-serializable position map: nodeId → [x, y, z?] */
export type PositionRecord = Record<IdType, [number, number, number?]>

export interface UpdateNodePositionsOptions {
  /**
   * Record the move as one undo entry, so the user can undo it with Edit ▸
   * Undo (Ctrl/⌘+Z), as they can a drag or a layout. Off by default: an app
   * that animates nodes or moves them in steps would otherwise fill the undo
   * stack and push out the user's own edits. Only `true` turns it on.
   */
  recordUndo?: boolean
}

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

  /**
   * Move nodes. All or nothing: fails without moving any node when a key is
   * not a node in the network or a value is not `[x, y]` / `[x, y, z]` of
   * finite numbers. Records no undo entry unless `options.recordUndo` is
   * `true`; the entry then holds only the nodes that move.
   */
  updateNodePositions(
    networkId: IdType,
    positions: PositionRecord,
    options?: UpdateNodePositionsOptions,
  ): ApiResult
}

/** Whether a node view is already at `position` (z only when given). */
const isAt = (
  nodeView: NodeView,
  position: [number, number, number?],
): boolean =>
  nodeView.x === position[0] &&
  nodeView.y === position[1] &&
  (position[2] === undefined || nodeView.z === position[2])

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

  updateNodePositions(networkId, positions, options): ApiResult {
    try {
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      // App input is untyped at runtime. Checked after the network lookup, so
      // a bogus networkId still reports NETWORK_NOT_FOUND.
      if (
        positions === null ||
        typeof positions !== 'object' ||
        Array.isArray(positions)
      ) {
        return fail(
          AppCodes.INVALID_INPUT,
          'positions must be an object of node id to [x, y] or [x, y, z]',
        )
      }
      // An empty record moves no node.
      const entries = Object.entries(positions)
      if (entries.length === 0) {
        return ok()
      }

      const invalid = entries.find(
        ([, position]) => !ViewModelFn.isNodePosition(position),
      )
      if (invalid !== undefined) {
        return fail(
          AppCodes.INVALID_INPUT,
          `position of node "${invalid[0]}" must be [x, y] or [x, y, z] of finite numbers`,
        )
      }

      const missingNodes = validateNodesExist(
        networkId,
        entries.map(([nodeId]) => nodeId),
      )
      if (missingNodes) return missingNodes

      const positionMap = new Map<IdType, [number, number, number?]>(entries)

      // Snapshot before the write. Only nodes that move go in the entry, and a
      // node without a view has no position to put back. An app that adds a z
      // to a node without one cannot have it removed by undo: the store only
      // writes z, never clears it.
      const undoPositions = new Map<IdType, [number, number, number?]>()
      const redoPositions = new Map<IdType, [number, number, number?]>()
      if (options?.recordUndo === true) {
        for (const [nodeId, position] of positionMap) {
          const nodeView: NodeView | undefined = viewModel.nodeViews[nodeId]
          if (nodeView === undefined || isAt(nodeView, position)) continue
          undoPositions.set(
            nodeId,
            nodeView.z === undefined
              ? [nodeView.x, nodeView.y]
              : [nodeView.x, nodeView.y, nodeView.z],
          )
          redoPositions.set(nodeId, position)
        }
      }

      useViewModelStore.getState().updateNodePositions(networkId, positionMap)
      if (redoPositions.size > 0) {
        // Marks the network modified too
        corePostEdit(
          networkId,
          UndoCommandType.MOVE_NODES,
          'Move Nodes',
          [networkId, undoPositions],
          [networkId, redoPositions],
        )
      } else {
        markNetworkModified(networkId)
      }
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },
}
