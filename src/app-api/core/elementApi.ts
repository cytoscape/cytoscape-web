// src/app-api/core/elementApi.ts
// Framework-agnostic Element API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import {
  createEdgesCore,
  type CreateEdgesParams,
  createNodesCore,
  type CreateNodesParams,
  deleteEdgesCore,
  deleteNodesCore,
  type EdgeOperationStoreActions,
  type NodeOperationStoreActions,
} from '../../models/CyNetworkModel'
import { IdType } from '../../models/IdType'
import { getInternalNetworkDataStore } from '../../models/NetworkModel/impl/networkImpl'
import { TableType } from '../../models/StoreModel/TableStoreModel'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { ValueType } from '../../models/TableModel'
import { AttributeName } from '../../models/TableModel/AttributeName'
import { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
import { VisualPropertyValueType } from '../../models/VisualStyleModel/VisualPropertyValue/VisualPropertyValueType'
import {
  AppCodes,
  ApiResult,
  ElementCodes,
  fail,
  ok,
} from '../types/ApiResult'
import { corePostEdit } from './undo'
import { validateNoIdAttribute } from './validation'

// ── Public types ─────────────────────────────────────────────────────────────

export interface NodeData {
  attributes: Record<AttributeName, ValueType>
  position: [number, number, number?]
}

export interface EdgeData {
  sourceId: IdType
  targetId: IdType
  attributes: Record<AttributeName, ValueType>
}

export interface CreateNodeOptions {
  attributes?: Record<AttributeName, ValueType>
  /** Visual property bypasses applied atomically after node creation. */
  bypass?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>
  /** @default true */
  autoSelect?: boolean
}

export interface CreateEdgeOptions {
  attributes?: Record<AttributeName, ValueType>
  /** Visual property bypasses applied atomically after edge creation. */
  bypass?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>
  /** @default true */
  autoSelect?: boolean
}

export interface ElementApi {
  // --- Read ---
  getNode(networkId: IdType, nodeId: IdType): ApiResult<NodeData>
  getEdge(networkId: IdType, edgeId: IdType): ApiResult<EdgeData>

  // --- Create ---
  createNode(
    networkId: IdType,
    position: [number, number, number?],
    options?: CreateNodeOptions,
  ): ApiResult<{ nodeId: IdType; node: NodeData }>

  createEdge(
    networkId: IdType,
    sourceNodeId: IdType,
    targetNodeId: IdType,
    options?: CreateEdgeOptions,
  ): ApiResult<{ edgeId: IdType; edge: EdgeData }>

  // --- Update ---
  moveEdge(
    networkId: IdType,
    edgeId: IdType,
    newSourceId: IdType,
    newTargetId: IdType,
  ): ApiResult

  // --- Delete ---
  deleteNodes(
    networkId: IdType,
    nodeIds: IdType[],
  ): ApiResult<{
    deletedNodeCount: number
    deletedEdgeCount: number
    deletedNodes: Array<{ id: IdType } & NodeData>
    deletedEdges: Array<{ id: IdType } & EdgeData>
  }>

  deleteEdges(
    networkId: IdType,
    edgeIds: IdType[],
  ): ApiResult<{
    deletedEdgeCount: number
    deletedEdges: Array<{ id: IdType } & EdgeData>
  }>

  /** Return the id the next created node in this network will receive. */
  generateNextNodeId(networkId: IdType): ApiResult<{ nodeId: IdType }>

  /** Return the id the next created edge in this network will receive. */
  generateNextEdgeId(networkId: IdType): ApiResult<{ edgeId: IdType }>

  // --- Graph Traversal (read-only, cytoscape.js core wrappers) ---

  /** Return all node IDs in the network. */
  getNodeIds(networkId: IdType): ApiResult<{ nodeIds: IdType[] }>

  /** Return all edge IDs in the network. */
  getEdgeIds(networkId: IdType): ApiResult<{ edgeIds: IdType[] }>

  /**
   * Return all edges with their source and target node IDs in a single
   * call, so apps can build the network topology without one getEdge()
   * round-trip per edge.
   */
  getEdges(networkId: IdType): ApiResult<{
    edges: Array<{ id: IdType; sourceId: IdType; targetId: IdType }>
  }>

  /** Return all edges connected to a node (both incoming and outgoing). */
  getConnectedEdges(
    networkId: IdType,
    nodeId: IdType,
  ): ApiResult<{ edges: EdgeData[] }>

  /** Return all nodes directly connected to a node (undirected neighborhood). */
  getConnectedNodes(
    networkId: IdType,
    nodeId: IdType,
  ): ApiResult<{ nodeIds: IdType[] }>

  /** Return immediate outgoing nodes and edges (directed, one hop). */
  getOutgoers(
    networkId: IdType,
    nodeId: IdType,
  ): ApiResult<{ nodeIds: IdType[]; edgeIds: IdType[] }>

  /** Return immediate incoming nodes and edges (directed, one hop). */
  getIncomers(
    networkId: IdType,
    nodeId: IdType,
  ): ApiResult<{ nodeIds: IdType[]; edgeIds: IdType[] }>

  /** Return all downstream nodes (transitive closure, directed). */
  getSuccessors(
    networkId: IdType,
    nodeId: IdType,
  ): ApiResult<{ nodeIds: IdType[] }>

  /** Return all upstream nodes (transitive closure, directed). */
  getPredecessors(
    networkId: IdType,
    nodeId: IdType,
  ): ApiResult<{ nodeIds: IdType[] }>

  /** Return root nodes (no incoming edges) in the network. */
  getRoots(networkId: IdType): ApiResult<{ nodeIds: IdType[] }>

  /** Return leaf nodes (no outgoing edges) in the network. */
  getLeaves(networkId: IdType): ApiResult<{ nodeIds: IdType[] }>
}

// ── Private helpers ──────────────────────────────────────────────────────────

/**
 * Build NodeOperationStoreActions from current store state.
 * Called at execution time, not at module load, so state is always fresh.
 */
function buildNodeStoreActions(): NodeOperationStoreActions {
  const networkState = useNetworkStore.getState()
  const tableState = useTableStore.getState()
  const viewModelState = useViewModelStore.getState()
  const visualStyleState = useVisualStyleStore.getState()
  const summaryState = useNetworkSummaryStore.getState()

  return {
    deleteNodesFromNetwork: networkState.deleteNodes,
    addNode: networkState.addNode,
    deleteRows: tableState.deleteRows,
    editRows: tableState.editRows,
    deleteViewObjects: viewModelState.deleteObjects,
    addNodeView: viewModelState.addNodeView,
    updateNetworkSummary: summaryState.update,
    networks: networkState.networks,
    tables: tableState.tables,
    viewModels: viewModelState.viewModels,
    visualStyles: visualStyleState.visualStyles,
  }
}

/**
 * Build EdgeOperationStoreActions from current store state.
 */
function buildEdgeStoreActions(): EdgeOperationStoreActions {
  const networkState = useNetworkStore.getState()
  const tableState = useTableStore.getState()
  const viewModelState = useViewModelStore.getState()
  const visualStyleState = useVisualStyleStore.getState()
  const summaryState = useNetworkSummaryStore.getState()

  return {
    deleteEdgesFromNetwork: networkState.deleteEdges,
    addEdge: networkState.addEdge,
    deleteRows: tableState.deleteRows,
    editRows: tableState.editRows,
    deleteViewObjects: viewModelState.deleteObjects,
    addEdgeView: viewModelState.addEdgeView,
    updateNetworkSummary: summaryState.update,
    networks: networkState.networks,
    tables: tableState.tables,
    viewModels: viewModelState.viewModels,
    visualStyles: visualStyleState.visualStyles,
  }
}

// ── Core implementation ──────────────────────────────────────────────────────

export const elementApi: ElementApi = {
  getNode(networkId, nodeId): ApiResult<NodeData> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const nodeExists = network.nodes.some((n) => n.id === nodeId)
      if (!nodeExists) {
        return fail(ElementCodes.NODE_NOT_FOUND, nodeId)
      }

      // Read attributes from table
      const tableRecord = useTableStore.getState().tables[networkId]
      const row = tableRecord?.nodeTable?.rows?.get(nodeId) ?? {}

      // Read position from view model
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      const nodeView = viewModel?.nodeViews?.[nodeId]
      const position: [number, number, number?] = nodeView
        ? nodeView.z !== undefined
          ? [nodeView.x, nodeView.y, nodeView.z]
          : [nodeView.x, nodeView.y]
        : [0, 0]

      return ok({
        attributes: row as Record<AttributeName, ValueType>,
        position,
      })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getEdge(networkId, edgeId): ApiResult<EdgeData> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const edge = network.edges.find((e) => e.id === edgeId)
      if (edge === undefined) {
        return fail(ElementCodes.EDGE_NOT_FOUND, edgeId)
      }

      const tableRecord = useTableStore.getState().tables[networkId]
      const row = tableRecord?.edgeTable?.rows?.get(edgeId) ?? {}

      return ok({
        sourceId: edge.s,
        targetId: edge.t,
        attributes: row as Record<AttributeName, ValueType>,
      })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  createNode(
    networkId,
    position,
    options,
  ): ApiResult<{ nodeId: IdType; node: NodeData }> {
    try {
      const networkState = useNetworkStore.getState()
      const network = networkState.networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }

      const invalidAttributes = validateNoIdAttribute(
        options?.attributes,
        'node',
      )
      if (invalidAttributes) return invalidAttributes

      // Generate unique ID (replicate useCreateNode.generateNextNodeId)
      const existingIds = network.nodes
        .map((n) => parseInt(n.id))
        .filter((id) => !isNaN(id))
      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : -1
      const newNodeId = `${maxId + 1}`

      // Prepare attributes with defaults
      const attributes: Record<AttributeName, ValueType> = {
        ...options?.attributes,
      }
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord?.nodeTable) {
        const hasNameColumn = tableRecord.nodeTable.columns.some(
          (col) => col.name === 'name',
        )
        if (hasNameColumn && !attributes.name) {
          attributes.name = `Node ${newNodeId}`
        }
      }

      const storeActions = buildNodeStoreActions()
      const params: CreateNodesParams = {
        networkId,
        nodeIds: [newNodeId],
        position,
        attributes,
      }
      createNodesCore(params, storeActions)

      // Apply visual property bypasses atomically after node creation
      if (options?.bypass) {
        const setBypass = useVisualStyleStore.getState().setBypass
        const bypassEntries = Object.entries(options.bypass) as Array<
          [VisualPropertyName, VisualPropertyValueType]
        >
        for (const [vpName, vpValue] of bypassEntries) {
          setBypass(networkId, vpName, [newNodeId], vpValue)
        }
      }

      // autoSelect defaults to true
      if (options?.autoSelect !== false) {
        useViewModelStore.getState().exclusiveSelect(networkId, [newNodeId], [])
      }

      corePostEdit(
        networkId,
        UndoCommandType.CREATE_NODES,
        `Create Node ${newNodeId}`,
        [networkId, [newNodeId]],
        [networkId, [newNodeId], position, attributes],
      )

      return ok({ nodeId: newNodeId, node: { attributes, position } })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  createEdge(
    networkId,
    sourceNodeId,
    targetNodeId,
    options,
  ): ApiResult<{ edgeId: IdType; edge: EdgeData }> {
    try {
      const networkState = useNetworkStore.getState()
      const network = networkState.networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }

      const invalidAttributes = validateNoIdAttribute(
        options?.attributes,
        'edge',
      )
      if (invalidAttributes) return invalidAttributes

      const sourceNode = network.nodes.find((n) => n.id === sourceNodeId)
      if (!sourceNode) {
        return fail(ElementCodes.NODE_NOT_FOUND, sourceNodeId)
      }

      const targetNode = network.nodes.find((n) => n.id === targetNodeId)
      if (!targetNode) {
        return fail(ElementCodes.NODE_NOT_FOUND, targetNodeId)
      }

      // Generate unique edge ID (replicate useCreateEdge.generateNextEdgeId)
      const existingIds = network.edges
        .map((e) => {
          const id = e.id.startsWith('e') ? e.id.slice(1) : e.id
          return parseInt(id)
        })
        .filter((id) => !isNaN(id))
      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : -1
      const newEdgeId = `e${maxId + 1}`

      // Prepare attributes with defaults
      const attributes: Record<AttributeName, ValueType> = {
        ...options?.attributes,
      }
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord?.edgeTable) {
        const hasNameColumn = tableRecord.edgeTable.columns.some(
          (col) => col.name === 'name',
        )
        if (hasNameColumn && !attributes.name) {
          attributes.name = `${sourceNodeId} (interacts with) ${targetNodeId}`
        }
      }

      const storeActions = buildEdgeStoreActions()
      const params: CreateEdgesParams = {
        networkId,
        edgeIds: [newEdgeId],
        sourceId: sourceNodeId,
        targetId: targetNodeId,
        attributes,
      }
      createEdgesCore(params, storeActions)

      // Apply visual property bypasses atomically after edge creation
      if (options?.bypass) {
        const setBypass = useVisualStyleStore.getState().setBypass
        const bypassEntries = Object.entries(options.bypass) as Array<
          [VisualPropertyName, VisualPropertyValueType]
        >
        for (const [vpName, vpValue] of bypassEntries) {
          setBypass(networkId, vpName, [newEdgeId], vpValue)
        }
      }

      // autoSelect defaults to true
      if (options?.autoSelect !== false) {
        useViewModelStore.getState().exclusiveSelect(networkId, [], [newEdgeId])
      }

      corePostEdit(
        networkId,
        UndoCommandType.CREATE_EDGES,
        `Create Edge ${newEdgeId}`,
        [networkId, [newEdgeId]],
        [networkId, [newEdgeId], sourceNodeId, targetNodeId, attributes],
      )

      return ok({
        edgeId: newEdgeId,
        edge: {
          sourceId: sourceNodeId,
          targetId: targetNodeId,
          attributes,
        },
      })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  moveEdge(networkId, edgeId, newSourceId, newTargetId): ApiResult {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }

      const edgeExists = network.edges.some((e) => e.id === edgeId)
      if (!edgeExists) {
        return fail(ElementCodes.EDGE_NOT_FOUND, edgeId)
      }

      const sourceExists = network.nodes.some((n) => n.id === newSourceId)
      if (!sourceExists) {
        return fail(ElementCodes.NODE_NOT_FOUND, newSourceId)
      }

      const targetExists = network.nodes.some((n) => n.id === newTargetId)
      if (!targetExists) {
        return fail(ElementCodes.NODE_NOT_FOUND, newTargetId)
      }

      const { oldSourceId, oldTargetId } = useNetworkStore
        .getState()
        .moveEdge(networkId, edgeId, newSourceId, newTargetId)

      // Update source/target columns in edge table if they exist
      const tables = useTableStore.getState().tables[networkId]
      if (tables !== undefined) {
        const edgeTable = tables.edgeTable
        const row = edgeTable?.rows?.get(edgeId)
        if (row !== undefined) {
          const updatedRow = new Map<IdType, Record<AttributeName, ValueType>>()
          updatedRow.set(edgeId, {
            ...row,
            source: newSourceId,
            target: newTargetId,
          })
          useTableStore
            .getState()
            .editRows(networkId, TableType.EDGE, updatedRow)
        }
      }

      corePostEdit(
        networkId,
        UndoCommandType.MOVE_EDGES,
        `Move edge ${edgeId}`,
        [networkId, edgeId, oldSourceId, oldTargetId],
        [networkId, edgeId, newSourceId, newTargetId],
      )

      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, `Failed to move edge: ${String(e)}`)
    }
  },

  deleteNodes(
    networkId,
    nodeIds,
  ): ApiResult<{
    deletedNodeCount: number
    deletedEdgeCount: number
    deletedNodes: Array<{ id: IdType } & NodeData>
    deletedEdges: Array<{ id: IdType } & EdgeData>
  }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }

      if (nodeIds.length === 0) {
        return fail(AppCodes.INVALID_INPUT, 'No nodes specified for deletion')
      }

      const nodesToDelete = network.nodes.filter((node) =>
        nodeIds.includes(node.id),
      )
      if (nodesToDelete.length === 0) {
        return fail(ElementCodes.NODE_NOT_FOUND, nodeIds.join(', '))
      }

      const existingNodeIds = nodesToDelete.map((node) => node.id)

      // Capture visual style bypasses before deletion
      const visualStyles = useVisualStyleStore.getState().visualStyles
      const visualStyle = visualStyles[networkId]
      const deletedBypasses = new Map<VisualPropertyName, Map<IdType, any>>()
      if (visualStyle) {
        const edgesToBeDeleted = network.edges.filter(
          (edge) =>
            existingNodeIds.includes(edge.s) ||
            existingNodeIds.includes(edge.t),
        )
        const allDeletedIds = [
          ...existingNodeIds,
          ...edgesToBeDeleted.map((edge) => edge.id),
        ]
        Object.keys(visualStyle).forEach((vpName) => {
          const visualProperty = visualStyle[vpName as VisualPropertyName]
          if (visualProperty?.bypassMap) {
            const bypassesForProperty = new Map<IdType, any>()
            allDeletedIds.forEach((id) => {
              if (visualProperty.bypassMap.has(id)) {
                bypassesForProperty.set(id, visualProperty.bypassMap.get(id))
              }
            })
            if (bypassesForProperty.size > 0) {
              deletedBypasses.set(
                vpName as VisualPropertyName,
                bypassesForProperty,
              )
            }
          }
        })
      }

      const storeActions = buildNodeStoreActions()
      const result = deleteNodesCore(
        networkId,
        existingNodeIds,
        network,
        storeActions,
      )

      // Clean up visual style bypasses
      if (visualStyle) {
        const allDeletedIds = [
          ...result.deletedNodeIds,
          ...result.deletedEdges.map((edge) => edge.id),
        ]
        const deleteBypass = useVisualStyleStore.getState().deleteBypass
        Object.keys(visualStyle).forEach((vpName) => {
          const visualProperty = visualStyle[vpName as VisualPropertyName]
          if (visualProperty?.bypassMap) {
            const hasBypassesToDelete = allDeletedIds.some((id) =>
              visualProperty.bypassMap.has(id),
            )
            if (hasBypassesToDelete) {
              deleteBypass(
                networkId,
                vpName as VisualPropertyName,
                allDeletedIds,
              )
            }
          }
        })
      }

      corePostEdit(
        networkId,
        UndoCommandType.DELETE_NODES,
        `Delete ${existingNodeIds.length} Node${existingNodeIds.length === 1 ? '' : 's'}`,
        [
          networkId,
          result.deletedNodeIds,
          result.deletedEdges,
          result.deletedNodeViews,
          result.deletedEdgeViews,
          result.deletedNodeRows,
          result.deletedEdgeRows,
          deletedBypasses,
        ],
        [networkId, result.deletedNodeIds],
      )

      // Reshape internal result into public API types
      const deletedNodes: Array<{ id: IdType } & NodeData> =
        result.deletedNodeIds.map((nodeId) => {
          const row = result.deletedNodeRows.get(nodeId) ?? {}
          const nodeView = result.deletedNodeViews.find((v) => v.id === nodeId)
          const position: [number, number, number?] = nodeView
            ? nodeView.z !== undefined
              ? [nodeView.x, nodeView.y, nodeView.z]
              : [nodeView.x, nodeView.y]
            : [0, 0]
          return {
            id: nodeId,
            attributes: row as Record<AttributeName, ValueType>,
            position,
          }
        })

      const deletedEdgesData: Array<{ id: IdType } & EdgeData> =
        result.deletedEdges.map((edge) => {
          const row = result.deletedEdgeRows.get(edge.id) ?? {}
          return {
            id: edge.id,
            sourceId: edge.s,
            targetId: edge.t,
            attributes: row as Record<AttributeName, ValueType>,
          }
        })

      return ok({
        deletedNodeCount: result.deletedNodeIds.length,
        deletedEdgeCount: result.deletedEdges.length,
        deletedNodes,
        deletedEdges: deletedEdgesData,
      })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  deleteEdges(
    networkId,
    edgeIds,
  ): ApiResult<{
    deletedEdgeCount: number
    deletedEdges: Array<{ id: IdType } & EdgeData>
  }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }

      if (edgeIds.length === 0) {
        return fail(AppCodes.INVALID_INPUT, 'No edges specified for deletion')
      }

      const edgesToDelete = network.edges.filter((edge) =>
        edgeIds.includes(edge.id),
      )
      if (edgesToDelete.length === 0) {
        return fail(ElementCodes.EDGE_NOT_FOUND, edgeIds.join(', '))
      }

      const existingEdgeIds = edgesToDelete.map((edge) => edge.id)

      // Capture visual style bypasses before deletion
      const visualStyles = useVisualStyleStore.getState().visualStyles
      const visualStyle = visualStyles[networkId]
      const deletedBypasses = new Map<VisualPropertyName, Map<IdType, any>>()
      if (visualStyle) {
        Object.keys(visualStyle).forEach((vpName) => {
          const visualProperty = visualStyle[vpName as VisualPropertyName]
          if (visualProperty?.bypassMap) {
            const bypassesForProperty = new Map<IdType, any>()
            existingEdgeIds.forEach((id) => {
              if (visualProperty.bypassMap.has(id)) {
                bypassesForProperty.set(id, visualProperty.bypassMap.get(id))
              }
            })
            if (bypassesForProperty.size > 0) {
              deletedBypasses.set(
                vpName as VisualPropertyName,
                bypassesForProperty,
              )
            }
          }
        })
      }

      const storeActions = buildEdgeStoreActions()
      const result = deleteEdgesCore(
        networkId,
        existingEdgeIds,
        network,
        storeActions,
      )

      // Clean up visual style bypasses
      if (visualStyle) {
        const deleteBypass = useVisualStyleStore.getState().deleteBypass
        Object.keys(visualStyle).forEach((vpName) => {
          const visualProperty = visualStyle[vpName as VisualPropertyName]
          if (visualProperty?.bypassMap) {
            const hasBypassesToDelete = existingEdgeIds.some((id) =>
              visualProperty.bypassMap.has(id),
            )
            if (hasBypassesToDelete) {
              deleteBypass(
                networkId,
                vpName as VisualPropertyName,
                existingEdgeIds,
              )
            }
          }
        })
      }

      corePostEdit(
        networkId,
        UndoCommandType.DELETE_EDGES,
        `Delete ${result.deletedEdgeIds.length} Edge${result.deletedEdgeIds.length === 1 ? '' : 's'}`,
        [
          networkId,
          edgesToDelete,
          result.deletedEdgeViews,
          result.deletedEdgeRows,
          deletedBypasses,
        ],
        [networkId, result.deletedEdgeIds],
      )

      // Reshape internal result into public API types
      const deletedEdgesData: Array<{ id: IdType } & EdgeData> =
        edgesToDelete.map((edge) => {
          const row = result.deletedEdgeRows.get(edge.id) ?? {}
          return {
            id: edge.id,
            sourceId: edge.s,
            targetId: edge.t,
            attributes: row as Record<AttributeName, ValueType>,
          }
        })

      return ok({
        deletedEdgeCount: result.deletedEdgeIds.length,
        deletedEdges: deletedEdgesData,
      })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  generateNextNodeId(networkId): ApiResult<{ nodeId: IdType }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (!network) return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      const existingIds = network.nodes
        .map((n) => parseInt(n.id))
        .filter((id) => !isNaN(id))
      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : -1
      return ok({ nodeId: `${maxId + 1}` })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  generateNextEdgeId(networkId): ApiResult<{ edgeId: IdType }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (!network) return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      const existingIds = network.edges
        .map((e) => {
          const id = e.id.startsWith('e') ? e.id.slice(1) : e.id
          return parseInt(id)
        })
        .filter((id) => !isNaN(id))
      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : -1
      return ok({ edgeId: `e${maxId + 1}` })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  // ── Graph Traversal ──────────────────────────────────────────────────────

  getNodeIds(networkId): ApiResult<{ nodeIds: IdType[] }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      return ok({ nodeIds: network.nodes.map((n) => n.id) })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getEdgeIds(networkId): ApiResult<{ edgeIds: IdType[] }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      return ok({ edgeIds: network.edges.map((e) => e.id) })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getEdges(networkId): ApiResult<{
    edges: Array<{ id: IdType; sourceId: IdType; targetId: IdType }>
  }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      return ok({
        edges: network.edges.map((e) => ({
          id: e.id,
          sourceId: e.s,
          targetId: e.t,
        })),
      })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getConnectedEdges(
    networkId,
    nodeId,
  ): ApiResult<{ edges: EdgeData[] }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const cy = getInternalNetworkDataStore(network)
      const cyNode = cy.$id(nodeId)
      if (cyNode.empty()) {
        return fail(ElementCodes.NODE_NOT_FOUND, nodeId)
      }
      const tableRecord = useTableStore.getState().tables[networkId]
      const edges: EdgeData[] = cyNode.connectedEdges().map((cyEdge: any) => {
        const edgeId = cyEdge.id()
        const row = tableRecord?.edgeTable?.rows?.get(edgeId) ?? {}
        return {
          sourceId: cyEdge.source().id() as IdType,
          targetId: cyEdge.target().id() as IdType,
          attributes: row as Record<AttributeName, ValueType>,
        }
      })
      return ok({ edges })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getConnectedNodes(networkId, nodeId): ApiResult<{ nodeIds: IdType[] }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const cy = getInternalNetworkDataStore(network)
      const cyNode = cy.$id(nodeId)
      if (cyNode.empty()) {
        return fail(ElementCodes.NODE_NOT_FOUND, nodeId)
      }
      const nodeIds: IdType[] = cyNode
        .neighborhood()
        .nodes()
        .map((n: any) => n.id() as IdType)
      return ok({ nodeIds })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getOutgoers(
    networkId,
    nodeId,
  ): ApiResult<{ nodeIds: IdType[]; edgeIds: IdType[] }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const cy = getInternalNetworkDataStore(network)
      const cyNode = cy.$id(nodeId)
      if (cyNode.empty()) {
        return fail(ElementCodes.NODE_NOT_FOUND, nodeId)
      }
      const outgoers = cyNode.outgoers()
      return ok({
        nodeIds: outgoers.nodes().map((n: any) => n.id() as IdType),
        edgeIds: outgoers.edges().map((e: any) => e.id() as IdType),
      })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getIncomers(
    networkId,
    nodeId,
  ): ApiResult<{ nodeIds: IdType[]; edgeIds: IdType[] }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const cy = getInternalNetworkDataStore(network)
      const cyNode = cy.$id(nodeId)
      if (cyNode.empty()) {
        return fail(ElementCodes.NODE_NOT_FOUND, nodeId)
      }
      const incomers = cyNode.incomers()
      return ok({
        nodeIds: incomers.nodes().map((n: any) => n.id() as IdType),
        edgeIds: incomers.edges().map((e: any) => e.id() as IdType),
      })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getSuccessors(networkId, nodeId): ApiResult<{ nodeIds: IdType[] }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const cy = getInternalNetworkDataStore(network)
      const cyNode = cy.$id(nodeId)
      if (cyNode.empty()) {
        return fail(ElementCodes.NODE_NOT_FOUND, nodeId)
      }
      const nodeIds: IdType[] = cyNode
        .successors()
        .nodes()
        .map((n: any) => n.id() as IdType)
      return ok({ nodeIds })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getPredecessors(networkId, nodeId): ApiResult<{ nodeIds: IdType[] }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const cy = getInternalNetworkDataStore(network)
      const cyNode = cy.$id(nodeId)
      if (cyNode.empty()) {
        return fail(ElementCodes.NODE_NOT_FOUND, nodeId)
      }
      const nodeIds: IdType[] = cyNode
        .predecessors()
        .nodes()
        .map((n: any) => n.id() as IdType)
      return ok({ nodeIds })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getRoots(networkId): ApiResult<{ nodeIds: IdType[] }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const cy = getInternalNetworkDataStore(network)
      const nodeIds: IdType[] = cy
        .nodes()
        .roots()
        .map((n: any) => n.id() as IdType)
      return ok({ nodeIds })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getLeaves(networkId): ApiResult<{ nodeIds: IdType[] }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const cy = getInternalNetworkDataStore(network)
      const nodeIds: IdType[] = cy
        .nodes()
        .leaves()
        .map((n: any) => n.id() as IdType)
      return ok({ nodeIds })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },
}
