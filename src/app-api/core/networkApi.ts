// src/app-api/core/networkApi.ts
// Framework-agnostic Network API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { v4 as uuidv4 } from 'uuid'

import { useHcxValidatorStore } from '../../features/HierarchyViewer/store/HcxValidatorStore'
import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../../data/hooks/stores/OpaqueAspectStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useUndoStore } from '../../data/hooks/stores/UndoStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { Cx2 } from '../../models/CxModel/Cx2'
import { createCyNetworkFromCx2 } from '../../models/CxModel/impl'
import { validateCX2 } from '../../models/CxModel/impl/validator'
import { CyNetwork } from '../../models/CyNetworkModel'
import { IdType } from '../../models/IdType'
import NetworkFn, {
  Edge,
  NetworkAttributes,
  Node,
} from '../../models/NetworkModel'
import { createNetworkSummary } from '../../models/NetworkSummaryModel/impl/networkSummaryImpl'
import TableFn, {
  AttributeName,
  ValueType,
  ValueTypeName,
} from '../../models/TableModel'
import { createViewModel } from '../../models/ViewModel/impl/viewModelImpl'
import VisualStyleFn, { VisualPropertyName } from '../../models/VisualStyleModel'
import { ApiErrorCode, ApiResult, fail, ok } from '../types/ApiResult'

// ── Public types ─────────────────────────────────────────────────────────────

export interface CreateNetworkFromEdgeListProps {
  name: string
  description?: string
  edgeList: Array<[IdType, IdType, string?]>
  /** Whether to add the network to the workspace. @default false */
  addToWorkspace?: boolean
}

export interface CreateNetworkFromCx2Props {
  cxData: Cx2
  /** Whether to navigate to the new network (set as current). @default true */
  navigate?: boolean
  /** Whether to add the network to the workspace. @default true */
  addToWorkspace?: boolean
}

export interface DeleteNetworkOptions {
  /** Whether to switch to the next available network after deletion. @default true */
  navigate?: boolean
}

export interface NetworkApi {
  createNetworkFromEdgeList(
    props: CreateNetworkFromEdgeListProps,
  ): ApiResult<{ networkId: IdType; cyNetwork: CyNetwork }>

  createNetworkFromCx2(
    props: CreateNetworkFromCx2Props,
  ): ApiResult<{ networkId: IdType; cyNetwork: CyNetwork }>

  deleteNetwork(networkId: IdType, options?: DeleteNetworkOptions): ApiResult

  deleteCurrentNetwork(options?: DeleteNetworkOptions): ApiResult

  deleteAllNetworks(): ApiResult
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function buildNodeIdMap(
  edgeList: Array<[IdType, IdType, string?]>,
): Map<IdType, IdType> {
  const nodeSet = new Set<IdType>(edgeList.flatMap((edge) => [edge[0], edge[1]]))
  const nodeIdMap = new Map<IdType, IdType>()
  let nodeCount = 0
  nodeSet.forEach((id) => {
    nodeIdMap.set(id, nodeCount.toString())
    nodeCount++
  })
  return nodeIdMap
}

function buildNetwork(
  edgeList: Array<[IdType, IdType, string?]>,
  nodeIdMap: Map<IdType, IdType>,
) {
  const networkId: IdType = uuidv4()
  const nodes: Node[] = Array.from(nodeIdMap.values()).map((id) => ({ id }))
  let edgeIndex = 0
  const edges: Edge[] = edgeList.map((edge): Edge => {
    const sourceId = nodeIdMap.get(edge[0])
    const targetId = nodeIdMap.get(edge[1])
    if (sourceId !== undefined && targetId !== undefined) {
      return { id: 'e' + edgeIndex++, s: sourceId, t: targetId }
    }
    throw new Error(`Node not found for edge: ${String(edge)}`)
  })
  return NetworkFn.createNetworkFromLists(networkId, nodes, edges)
}

function assembleCyNetworkFromEdgeList(
  name: string,
  description: string | undefined,
  edgeList: Array<[IdType, IdType, string?]>,
): CyNetwork {
  const nodeIdMap = buildNodeIdMap(edgeList)
  const network = buildNetwork(edgeList, nodeIdMap)
  const networkId = network.id

  const nodeTableData = new Map<IdType, Record<AttributeName, ValueType>>()
  nodeIdMap.forEach((id, originalName) => {
    nodeTableData.set(id, { name: originalName })
  })

  const nodeTable = TableFn.createTable(
    networkId,
    [{ name: 'name', type: 'string' }],
    nodeTableData,
  )
  const edgeTable = TableFn.createTable(networkId, [], new Map())
  const networkView = createViewModel(network)
  const visualStyle = VisualStyleFn.createVisualStyle()
  const networkAttributes: NetworkAttributes = { id: networkId, attributes: {} }

  return {
    network,
    nodeTable,
    edgeTable,
    visualStyle,
    networkViews: [networkView],
    networkAttributes,
    undoRedoStack: { undoStack: [], redoStack: [] },
  }
}

// ── Implementation ────────────────────────────────────────────────────────────

export const networkApi: NetworkApi = {
  createNetworkFromEdgeList({
    name,
    description,
    edgeList,
    addToWorkspace = false,
  }) {
    try {
      if (!name || name.trim() === '') {
        return fail(
          ApiErrorCode.InvalidInput,
          'name is required and must be non-empty',
        )
      }
      if (!edgeList || edgeList.length === 0) {
        return fail(ApiErrorCode.InvalidInput, 'edgeList must be non-empty')
      }

      const cyNetwork = assembleCyNetworkFromEdgeList(name, description, edgeList)
      const { network, nodeTable, edgeTable, visualStyle, networkViews } =
        cyNetwork
      const networkId = network.id

      const summary = createNetworkSummary({
        networkId,
        name: name.trim(),
        description,
        nodeCount: network.nodes.length,
        edgeCount: network.edges.length,
      })

      // Add to 5 core stores
      useNetworkStore.getState().add(network)
      useVisualStyleStore.getState().add(networkId, visualStyle)
      useTableStore.getState().add(networkId, nodeTable, edgeTable)
      useViewModelStore.getState().add(networkId, networkViews[0])
      useNetworkSummaryStore.getState().add(networkId, summary)

      // Create passthrough mapping for node labels (mirrors useCreateNetwork)
      useVisualStyleStore.getState().createPassthroughMapping(
        networkId,
        VisualPropertyName.NodeLabel,
        'name',
        ValueTypeName.String,
      )

      if (addToWorkspace) {
        useWorkspaceStore.getState().addNetworkIds(networkId)
        useWorkspaceStore.getState().setCurrentNetworkId(networkId)
      }

      return ok({ networkId, cyNetwork })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  createNetworkFromCx2({ cxData, navigate = true, addToWorkspace = true }) {
    try {
      const validation = validateCX2(cxData)
      if (!validation.isValid) {
        return fail(
          ApiErrorCode.InvalidCx2,
          validation.errorMessage ?? 'CX2 validation failed',
        )
      }

      const cyNetwork: CyNetwork = createCyNetworkFromCx2(uuidv4(), cxData)
      const {
        network,
        networkAttributes,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews,
      } = cyNetwork

      let summary
      if (networkAttributes) {
        const { attributes } = networkAttributes
        const name =
          (attributes['name'] as string) ?? `CX2 Network (${network.id})`
        const description = (attributes['description'] as string) ?? ''
        summary = createNetworkSummary({
          networkId: network.id,
          name,
          description,
          nodeCount: network.nodes.length,
          edgeCount: network.edges.length,
        })
        summary.version = (attributes['version'] as string) ?? 'unknown'
      } else {
        summary = createNetworkSummary({
          networkId: network.id,
          name: `CX2 Network (${network.id})`,
          nodeCount: network.nodes.length,
          edgeCount: network.edges.length,
        })
      }
      summary.hasLayout = true

      // Add to 5 core stores
      useNetworkStore.getState().add(network)
      useVisualStyleStore.getState().add(network.id, visualStyle)
      useTableStore.getState().add(network.id, nodeTable, edgeTable)
      useViewModelStore.getState().add(network.id, networkViews[0])
      useNetworkSummaryStore.getState().add(network.id, summary)

      if (addToWorkspace) {
        useWorkspaceStore.getState().addNetworkIds(network.id)
      }

      if (navigate) {
        useWorkspaceStore.getState().setCurrentNetworkId(network.id)
      }

      return ok({ networkId: network.id, cyNetwork })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  deleteNetwork(networkId, options) {
    try {
      const networkExists = useNetworkStore.getState().networks.has(networkId)
      if (!networkExists) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }

      const navigate = options?.navigate ?? true

      // Snapshot workspace BEFORE mutation to determine next network
      const workspace = useWorkspaceStore.getState().workspace
      const nextNetworkId = navigate
        ? (workspace.networkIds.filter((id) => id !== networkId)?.[0] ?? '')
        : ''

      // Delete from all stores (mirrors useDeleteCyNetwork)
      useNetworkStore.getState().delete(networkId)
      useNetworkSummaryStore.getState().delete(networkId)
      useViewModelStore.getState().delete(networkId)
      useVisualStyleStore.getState().delete(networkId)
      useTableStore.getState().delete(networkId)
      useWorkspaceStore.getState().deleteNetworkModifiedStatus(networkId)
      useOpaqueAspectStore.getState().delete(networkId)
      useUndoStore.getState().deleteStack(networkId)

      // Clear active network view if this network was active
      const activeNetworkView = useUiStateStore.getState().ui.activeNetworkView
      if (activeNetworkView === networkId) {
        useUiStateStore.getState().setActiveNetworkView('')
      }

      // Clear HCX validation result if it exists
      const validationResults =
        useHcxValidatorStore.getState().validationResults
      if (validationResults[networkId] !== undefined) {
        useHcxValidatorStore.getState().deleteValidationResult(networkId)
      }

      // Remove from workspace
      useWorkspaceStore.getState().deleteNetwork(networkId)

      // Switch to next available network
      if (navigate) {
        useWorkspaceStore.getState().setCurrentNetworkId(nextNetworkId)
      }

      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  deleteCurrentNetwork(options) {
    const currentNetworkId =
      useWorkspaceStore.getState().workspace.currentNetworkId
    if (!currentNetworkId || currentNetworkId === '') {
      return fail(
        ApiErrorCode.NoCurrentNetwork,
        'No network is currently selected',
      )
    }
    return networkApi.deleteNetwork(currentNetworkId, options)
  },

  deleteAllNetworks() {
    try {
      useNetworkStore.getState().deleteAll()
      useNetworkSummaryStore.getState().deleteAll()
      useViewModelStore.getState().deleteAll()
      useVisualStyleStore.getState().deleteAll()
      useTableStore.getState().deleteAll()
      useOpaqueAspectStore.getState().deleteAll()
      useUndoStore.getState().deleteAllStacks()
      useWorkspaceStore.getState().deleteAllNetworkModifiedStatuses()
      useHcxValidatorStore.getState().deleteAllValidationResults()
      useUiStateStore.getState().setActiveNetworkView('')
      useWorkspaceStore.getState().deleteAllNetworks()

      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },
}
