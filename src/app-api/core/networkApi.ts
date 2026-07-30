// src/app-api/core/networkApi.ts
// Framework-agnostic Network API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { v4 as uuidv4 } from 'uuid'

import {
  deleteAllNetworksFromAllStores,
  deleteNetworkFromAllStores,
} from '../../data/hooks/deleteNetworkOrchestrator'
import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
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
import { AppCodes, ApiResult, fail, ok } from '../types/ApiResult'
import { validateNodesExist, validateTableElementsExist } from './validation'

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

export interface CreateNetworkFromNodeListOptions {
  /** Name for the new network. @default "Subnetwork of <source name>" */
  name?: string
  description?: string
  /** Whether to add the network to the workspace. @default false */
  addToWorkspace?: boolean
}

export interface NetworkApi {
  createNetworkFromEdgeList(
    props: CreateNetworkFromEdgeListProps,
  ): ApiResult<{ networkId: IdType; cyNetwork: CyNetwork }>

  /**
   * Create a new network from a subset of an existing network's nodes.
   * Unlike createNetworkFromEdgeList, isolated (unconnected) nodes are
   * allowed. Element IDs, table columns, attribute rows, and node
   * positions are copied from the source. When `edgeIds` is omitted or
   * 'all', every source edge whose endpoints are both in `nodeIds` is
   * included (induced subgraph); an explicit `edgeIds` array selects a
   * subset, and each listed edge must connect nodes in `nodeIds`.
   */
  createNetworkFromNodeList(
    networkId: IdType,
    nodeIds: IdType[],
    edgeIds?: IdType[] | 'all',
    options?: CreateNetworkFromNodeListOptions,
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
  const nodeSet = new Set<IdType>(
    edgeList.flatMap((edge) => [edge[0], edge[1]]),
  )
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
        return fail(AppCodes.INVALID_INPUT, 'name is required and must be non-empty')
      }
      if (!edgeList || edgeList.length === 0) {
        return fail(AppCodes.INVALID_INPUT, 'edgeList must be non-empty')
      }

      const cyNetwork = assembleCyNetworkFromEdgeList(
        name,
        description,
        edgeList,
      )
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
      useVisualStyleStore
        .getState()
        .createPassthroughMapping(
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
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  createNetworkFromNodeList(networkId, nodeIds, edgeIds, options) {
    try {
      const source = useNetworkStore.getState().networks.get(networkId)
      if (source === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      if (!nodeIds || nodeIds.length === 0) {
        return fail(AppCodes.INVALID_INPUT, 'nodeIds must be non-empty')
      }
      const missingNodes = validateNodesExist(networkId, nodeIds)
      if (missingNodes) return missingNodes

      const nodeIdSet = new Set(nodeIds)
      let edges: Edge[]
      if (edgeIds === undefined || edgeIds === 'all') {
        // Induced subgraph: every edge whose endpoints are both kept
        edges = source.edges.filter(
          (e) => nodeIdSet.has(e.s) && nodeIdSet.has(e.t),
        )
      } else {
        const missingEdges = validateTableElementsExist(
          networkId,
          'edge',
          edgeIds,
        )
        if (missingEdges) return missingEdges

        const edgeIdSet = new Set(edgeIds)
        edges = source.edges.filter((e) => edgeIdSet.has(e.id))
        const dangling = edges.filter(
          (e) => !nodeIdSet.has(e.s) || !nodeIdSet.has(e.t),
        )
        if (dangling.length > 0) {
          return fail(
            AppCodes.INVALID_INPUT,
            `Edges reference nodes outside nodeIds: ${dangling
              .map((e) => e.id)
              .join(', ')}`,
          )
        }
      }

      // Element IDs are preserved so attributes and positions carry over
      const newNetworkId: IdType = uuidv4()
      const network = NetworkFn.createNetworkFromLists(
        newNetworkId,
        nodeIds.map((id) => ({ id })),
        edges.map((e) => ({ id: e.id, s: e.s, t: e.t })),
      )

      // Copy column schemas and the selected rows from the source tables
      const sourceTables = useTableStore.getState().tables[networkId]
      const copyColumns = (cols?: Array<{ name: string; type: ValueTypeName }>) =>
        (cols ?? []).map((c) => ({ name: c.name, type: c.type }))
      const copyRows = (
        rows: Map<IdType, Record<AttributeName, ValueType>> | undefined,
        ids: IdType[],
      ): Map<IdType, Record<AttributeName, ValueType>> => {
        const copied = new Map<IdType, Record<AttributeName, ValueType>>()
        ids.forEach((id) => {
          const row = rows?.get(id)
          if (row !== undefined) copied.set(id, { ...row })
        })
        return copied
      }
      const nodeTable = TableFn.createTable(
        newNetworkId,
        copyColumns(sourceTables?.nodeTable?.columns),
        copyRows(sourceTables?.nodeTable?.rows, nodeIds),
      )
      const edgeTable = TableFn.createTable(
        newNetworkId,
        copyColumns(sourceTables?.edgeTable?.columns),
        copyRows(
          sourceTables?.edgeTable?.rows,
          edges.map((e) => e.id),
        ),
      )

      // Copy node positions from the source view when available
      const networkView = createViewModel(network)
      const sourceView = useViewModelStore.getState().getViewModel(networkId)
      if (sourceView !== undefined) {
        nodeIds.forEach((id) => {
          const sourceNodeView = sourceView.nodeViews[id]
          const newNodeView = networkView.nodeViews[id]
          if (sourceNodeView !== undefined && newNodeView !== undefined) {
            networkView.nodeViews[id] = {
              ...newNodeView,
              x: sourceNodeView.x,
              y: sourceNodeView.y,
              ...(sourceNodeView.z !== undefined
                ? { z: sourceNodeView.z }
                : {}),
            }
          }
        })
      }

      const visualStyle = VisualStyleFn.createVisualStyle()
      const networkAttributes: NetworkAttributes = {
        id: newNetworkId,
        attributes: {},
      }
      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        networkAttributes,
        undoRedoStack: { undoStack: [], redoStack: [] },
      }

      const sourceName =
        useNetworkSummaryStore.getState().summaries[networkId]?.name
      const name =
        options?.name?.trim() || `Subnetwork of ${sourceName ?? networkId}`
      const summary = createNetworkSummary({
        networkId: newNetworkId,
        name,
        description: options?.description,
        nodeCount: network.nodes.length,
        edgeCount: network.edges.length,
      })

      useNetworkStore.getState().add(network)
      useVisualStyleStore.getState().add(newNetworkId, visualStyle)
      useTableStore.getState().add(newNetworkId, nodeTable, edgeTable)
      useViewModelStore.getState().add(newNetworkId, networkView)
      useNetworkSummaryStore.getState().add(newNetworkId, summary)

      // Passthrough label mapping when the copied schema has a name column
      if (nodeTable.columns.some((c) => c.name === 'name')) {
        useVisualStyleStore.getState().createPassthroughMapping(
          newNetworkId,
          VisualPropertyName.NodeLabel,
          'name',
          ValueTypeName.String,
        )
      }

      if (options?.addToWorkspace) {
        useWorkspaceStore.getState().addNetworkIds(newNetworkId)
        useWorkspaceStore.getState().setCurrentNetworkId(newNetworkId)
      }

      return ok({ networkId: newNetworkId, cyNetwork })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  createNetworkFromCx2({ cxData, navigate = true, addToWorkspace = true }) {
    try {
      const validation = validateCX2(cxData)
      if (!validation.isValid) {
        return fail(AppCodes.INVALID_CX2, validation.errorMessage ?? 'CX2 validation failed')
      }

      const cyNetwork: CyNetwork = createCyNetworkFromCx2(uuidv4(), cxData)
      const {
        network,
        networkAttributes,
        nodeTable,
        edgeTable,
        visualStyle,
        visualStyleSet,
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
      useVisualStyleStore
        .getState()
        .add(network.id, visualStyle, visualStyleSet)
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
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  // The options.navigate flag is retained for API compatibility but no
  // longer changes behavior: the orchestrator always repairs
  // currentNetworkId when the deleted network was current, and never
  // switches networks otherwise (the old navigate:true switched to the
  // first remaining network even when deleting a non-current one).
  deleteNetwork(networkId, _options) {
    try {
      const networkExists = useNetworkStore.getState().networks.has(networkId)
      if (!networkExists) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }

      // Single source of truth for the cascade, shared with
      // useDeleteCyNetwork (REVIEW.md A4) — includes the per-network UI
      // state purge. It also owns the currentNetworkId invariant: the
      // pointer is repaired whenever the deleted network was current,
      // regardless of the navigate option (R2-13 — previously
      // navigate:false left it dangling).
      deleteNetworkFromAllStores(networkId)

      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  deleteCurrentNetwork(options) {
    const currentNetworkId =
      useWorkspaceStore.getState().workspace.currentNetworkId
    if (!currentNetworkId || currentNetworkId === '') {
      return fail(AppCodes.NO_CURRENT_NETWORK)
    }
    return networkApi.deleteNetwork(currentNetworkId, options)
  },

  deleteAllNetworks() {
    try {
      // Single source of truth for the cascade (REVIEW.md A4) — its
      // deleteAllNetworkUiState covers the per-network UI state purge
      deleteAllNetworksFromAllStores()

      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },
}
