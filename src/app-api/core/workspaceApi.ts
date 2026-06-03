// src/app-api/core/workspaceApi.ts
// Framework-agnostic Workspace API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../models/IdType'
import { ApiErrorCode, ApiResult, fail, ok } from '../types/ApiResult'

// ── Public types ─────────────────────────────────────────────────────────────

export interface WorkspaceInfo {
  workspaceId: IdType
  name: string
  /** Empty string when no networks are open */
  currentNetworkId: IdType
  networkCount: number
}

export interface WorkspaceNetworkInfo {
  networkId: IdType
  name: string
  description: string
  nodeCount: number
  edgeCount: number
  /** true when the network has unsaved local changes */
  isModified: boolean
}

export interface WorkspaceApi {
  /** Returns workspace metadata (id, name, current network id, count). Always succeeds. */
  getWorkspaceInfo(): ApiResult<WorkspaceInfo>

  /** Returns the ordered list of network IDs in the workspace. */
  getNetworkIds(): ApiResult<{ networkIds: IdType[] }>

  /**
   * Returns summary metadata for all networks in the workspace.
   * Networks whose summary is not found in NetworkSummaryStore are silently omitted.
   */
  getNetworkList(): ApiResult<WorkspaceNetworkInfo[]>

  /**
   * Returns summary metadata for a single network.
   * fail(NetworkNotFound) if networkId is not in the workspace or its summary is missing.
   */
  getNetworkSummary(networkId: IdType): ApiResult<WorkspaceNetworkInfo>

  /**
   * Returns the currently active network ID.
   * fail(NoCurrentNetwork) when no networks are open or no network is selected.
   */
  getCurrentNetworkId(): ApiResult<{ networkId: IdType }>

  /**
   * Switches the active network in the workspace.
   * `network:switched` fires automatically via initEventBus.
   * fail(InvalidInput) for empty string. fail(NetworkNotFound) if not in workspace.
   */
  switchCurrentNetwork(networkId: IdType): ApiResult

  /**
   * Renames the workspace.
   * fail(InvalidInput) for empty/whitespace-only names.
   */
  setWorkspaceName(name: string): ApiResult
}

// ── Implementation ────────────────────────────────────────────────────────────

export const workspaceApi: WorkspaceApi = {
  getWorkspaceInfo() {
    try {
      const { workspace } = useWorkspaceStore.getState()
      return ok<WorkspaceInfo>({
        workspaceId: workspace.id,
        name: workspace.name,
        currentNetworkId: workspace.currentNetworkId,
        networkCount: workspace.networkIds.length,
      })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  getNetworkIds() {
    try {
      const { workspace } = useWorkspaceStore.getState()
      return ok({ networkIds: [...workspace.networkIds] })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  getNetworkList() {
    try {
      const { workspace } = useWorkspaceStore.getState()
      const { summaries } = useNetworkSummaryStore.getState()

      const list: WorkspaceNetworkInfo[] = []
      for (const networkId of workspace.networkIds) {
        const summary = summaries[networkId]
        if (summary === undefined) continue // silently omit missing entries

        list.push({
          networkId,
          name: summary.name,
          description: summary.description ?? '',
          nodeCount: summary.nodeCount,
          edgeCount: summary.edgeCount,
          isModified: workspace.networkModified[networkId] ?? false,
        })
      }

      return ok(list)
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  getNetworkSummary(networkId) {
    try {
      const { workspace } = useWorkspaceStore.getState()

      if (!workspace.networkIds.includes(networkId)) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} is not in the workspace`,
        )
      }

      const { summaries } = useNetworkSummaryStore.getState()
      const summary = summaries[networkId]
      if (summary === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Summary not found for network ${networkId}`,
        )
      }

      return ok<WorkspaceNetworkInfo>({
        networkId,
        name: summary.name,
        description: summary.description ?? '',
        nodeCount: summary.nodeCount,
        edgeCount: summary.edgeCount,
        isModified: workspace.networkModified[networkId] ?? false,
      })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  getCurrentNetworkId() {
    try {
      const { workspace } = useWorkspaceStore.getState()

      if (
        workspace.networkIds.length === 0 ||
        workspace.currentNetworkId === ''
      ) {
        return fail(
          ApiErrorCode.NoCurrentNetwork,
          'No network is currently selected',
        )
      }

      return ok({ networkId: workspace.currentNetworkId })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  switchCurrentNetwork(networkId) {
    try {
      if (!networkId || networkId.trim() === '') {
        return fail(
          ApiErrorCode.InvalidInput,
          'networkId must be a non-empty string',
        )
      }

      const { workspace } = useWorkspaceStore.getState()
      if (!workspace.networkIds.includes(networkId)) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} is not in the workspace`,
        )
      }

      useWorkspaceStore.getState().setCurrentNetworkId(networkId)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  setWorkspaceName(name) {
    try {
      if (!name || name.trim() === '') {
        return fail(
          ApiErrorCode.InvalidInput,
          'name must be a non-empty string',
        )
      }

      useWorkspaceStore.getState().setName(name.trim())
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },
}
