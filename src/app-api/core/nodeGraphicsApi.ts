// src/app-api/core/nodeGraphicsApi.ts
//
// Node Graphics API — an app registers one render hook; the host calls it with
// each changed node and draws the returned image as that node's
// Cytoscape.js background-image.
//
// Two access paths, matching contextMenuApi:
//   1. Per-app factory: createNodeGraphicsApi(appId) — used by buildPerAppApis.
//      The hook carries the appId and is cleaned up on app disable.
//   2. Anonymous singleton: nodeGraphicsApi — for window.CyWebApi only.
//      Never auto-cleaned; plugin apps must use AppContext.apis.nodeGraphics.
//
// Hook output is renderer-only and is never exported to CX2. See
// docs/design/custom-graphics-image/node-graphics-render-hook.md.

import { v4 as uuidv4 } from 'uuid'

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useNodeGraphicsStore } from '../../data/hooks/stores/NodeGraphicsStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import type { IdType } from '../../models/IdType'
import type { NodeGraphicsRenderHook } from '../../models/StoreModel/NodeGraphicsStoreModel'
import type { ApiResult } from '../types/ApiResult'
import { AppCodes, fail, ok, StyleCodes } from '../types/ApiResult'

// ── Public types ─────────────────────────────────────────────────────────────

export type {
  NodeGraphicsContainment,
  NodeGraphicsCrossOrigin,
  NodeGraphicsFit,
  NodeGraphicsImage,
  NodeGraphicsRenderHook,
  NodeGraphicsRequest,
  NodeGraphicsResult,
} from '../../models/StoreModel/NodeGraphicsStoreModel'

export interface NodeGraphicsApi {
  /**
   * Register this app's node-graphics render hook, replacing any hook it
   * previously registered.
   *
   * The host calls `hook` with each node whose table row changed, and draws a
   * returned image as that node's background. Returning `null` leaves the node
   * to its Vizmapper custom graphic. The hook must be synchronous and must not
   * throw — see `refresh` for images that need async work.
   *
   * @returns `ok({ hookId })`; `fail(INVALID_CUSTOM_GRAPHICS)` if `hook` is not
   *   a function
   */
  setRenderHook(hook: NodeGraphicsRenderHook): ApiResult<{ hookId: string }>

  /**
   * Remove this app's hook and drop every image it produced. Affected nodes
   * fall back to their Vizmapper custom graphics.
   *
   * @returns `ok()`; `fail(FUNCTION_NOT_AVAILABLE)` if no hook is registered
   */
  clearRenderHook(): ApiResult

  /**
   * Re-run the hook for a network.
   *
   * Table edits invalidate automatically. This exists for images that depend on
   * the app's own state — a slider, a selected timepoint, a completed fetch —
   * which the host cannot observe. It is also how an app supplies async images:
   * compute and cache off to the side, then `refresh()` so the synchronous hook
   * can return the cached value.
   *
   * @param networkId - Omit to target the workspace's current network
   * @param nodeIds - Omit for every node in the network
   * @returns `ok({ nodeCount })`; `fail(FUNCTION_NOT_AVAILABLE)` if no hook is
   *   registered; `fail(NO_CURRENT_NETWORK)` / `fail(NETWORK_NOT_FOUND)`
   */
  refresh(
    networkId?: IdType,
    nodeIds?: IdType[],
  ): ApiResult<{ nodeCount: number }>
}

// ── Shared implementation ────────────────────────────────────────────────────

function registerHook(
  hook: NodeGraphicsRenderHook,
  appId?: string,
): ApiResult<{ hookId: string }> {
  try {
    if (typeof hook !== 'function') {
      return fail(
        StyleCodes.INVALID_CUSTOM_GRAPHICS,
        'nodeGraphics.renderHook',
        'hook must be a function',
      )
    }

    const hookId = uuidv4()
    useNodeGraphicsStore.getState().setHook({ hookId, appId, render: hook })
    return ok({ hookId })
  } catch (e) {
    return fail(AppCodes.OPERATION_FAILED, String(e))
  }
}

/** True when the caller identified by `appId` has a hook registered. */
function hasHook(appId?: string): boolean {
  return useNodeGraphicsStore.getState().hooks.some((h) => h.appId === appId)
}

function clearHook(appId?: string): ApiResult {
  try {
    if (!hasHook(appId)) {
      return fail(AppCodes.FUNCTION_NOT_AVAILABLE, 'nodeGraphics.renderHook')
    }
    // Scoped by owner: an app can only clear its own hook, and the anonymous
    // singleton can only clear the anonymous one.
    if (appId === undefined) {
      useNodeGraphicsStore.getState().removeAnonymousHook()
    } else {
      useNodeGraphicsStore.getState().removeAllByAppId(appId)
    }
    return ok()
  } catch (e) {
    return fail(AppCodes.OPERATION_FAILED, String(e))
  }
}

function refreshHook(
  appId: string | undefined,
  networkId?: IdType,
  nodeIds?: IdType[],
): ApiResult<{ nodeCount: number }> {
  try {
    if (!hasHook(appId)) {
      return fail(AppCodes.FUNCTION_NOT_AVAILABLE, 'nodeGraphics.renderHook')
    }

    const targetId =
      networkId ?? useWorkspaceStore.getState().workspace.currentNetworkId
    if (targetId === undefined || targetId === '') {
      return fail(AppCodes.NO_CURRENT_NETWORK)
    }

    const network = useNetworkStore.getState().networks.get(targetId)
    if (network === undefined) {
      return fail(AppCodes.NETWORK_NOT_FOUND, targetId)
    }

    useNodeGraphicsStore.getState().requestRefresh(targetId, nodeIds)

    return ok({
      nodeCount: nodeIds !== undefined ? nodeIds.length : network.nodes.length,
    })
  } catch (e) {
    return fail(AppCodes.OPERATION_FAILED, String(e))
  }
}

// ── Per-app factory (lifecycle-managed, used by buildPerAppApis) ──────────────

export const createNodeGraphicsApi = (appId: string): NodeGraphicsApi => ({
  setRenderHook: (hook) => registerHook(hook, appId),
  clearRenderHook: () => clearHook(appId),
  refresh: (networkId, nodeIds) => refreshHook(appId, networkId, nodeIds),
})

// ── Anonymous singleton — for window.CyWebApi only ────────────────────────────
// Plugin apps must NOT use this path; use AppContext.apis.nodeGraphics so the
// hook is cleaned up when the app is disabled.

export const nodeGraphicsApi: NodeGraphicsApi = {
  setRenderHook: (hook) => registerHook(hook, undefined),
  clearRenderHook: () => clearHook(undefined),
  refresh: (networkId, nodeIds) => refreshHook(undefined, networkId, nodeIds),
}
