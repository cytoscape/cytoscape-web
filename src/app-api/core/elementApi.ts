// src/app-api/core/elementApi.ts
// Framework-agnostic Element API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useUndoStore } from '../../data/hooks/stores/UndoStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
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
import { TableType } from '../../models/StoreModel/TableStoreModel'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { ValueType } from '../../models/TableModel'
import { AttributeName } from '../../models/TableModel/AttributeName'
import { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
import { VisualPropertyValueType } from '../../models/VisualStyleModel/VisualPropertyValue/VisualPropertyValueType'
import { ApiErrorCode, ApiResult, fail, ok } from '../types/ApiResult'

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
  ): ApiResult<{ nodeId: IdType }>

  createEdge(
    networkId: IdType,
    sourceNodeId: IdType,
    targetNodeId: IdType,
    options?: CreateEdgeOptions,
  ): ApiResult<{ edgeId: IdType }>

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
  ): ApiResult<{ deletedNodeCount: number; deletedEdgeCount: number }>

  deleteEdges(
    networkId: IdType,
    edgeIds: IdType[],
  ): ApiResult<{ deletedEdgeCount: number }>

  generateNextNodeId(networkId: IdType): IdType
  generateNextEdgeId(networkId: IdType): IdType
}

// ── Private helpers ──────────────────────────────────────────────────────────

const DEFAULT_UNDO_STACK_SIZE = 20

/**
 * Framework-agnostic postEdit — replicates useUndoStack's postEdit
 * using store .getState() calls instead of React context.
 */
function corePostEdit(
  undoCommand: UndoCommandType,
  description: string,
  undoParams: any[],
  redoParams: any[],
): void {
  const uiState = useUiStateStore.getState()
  const workspaceState = useWorkspaceStore.getState()
  const activeNetworkViewId = uiState.ui.activeNetworkView
  const currentNetworkId = workspaceState.workspace.currentNetworkId
  const targetNetworkId =
    activeNetworkViewId === '' ? currentNetworkId : activeNetworkViewId

  const undoState = useUndoStore.getState()
  const stack = undoState.undoRedoStacks[targetNetworkId] ?? {
    undoStack: [],
    redoStack: [],
  }
  const newEdit = { undoCommand, description, undoParams, redoParams }
  const nextUndoStack = [...stack.undoStack, newEdit].slice(
    -DEFAULT_UNDO_STACK_SIZE,
  )
  undoState.setUndoStack(targetNetworkId, nextUndoStack)
  undoState.setRedoStack(targetNetworkId, [])
}

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
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      const nodeExists = network.nodes.some((n) => n.id === nodeId)
      if (!nodeExists) {
        return fail(
          ApiErrorCode.NodeNotFound,
          `Node ${nodeId} not found in network ${networkId}`,
        )
      }

      // Read attributes from table
      const tableRecord = useTableStore.getState().tables[networkId]
      const row = tableRecord?.nodeTable?.rows?.get(nodeId) ?? {}

      // Read position from view model
      const viewModel = useViewModelStore
        .getState()
        .getViewModel(networkId)
      const nodeView = viewModel?.nodeViews?.[nodeId]
      const position: [number, number, number?] = nodeView
        ? nodeView.z !== undefined
          ? [nodeView.x, nodeView.y, nodeView.z]
          : [nodeView.x, nodeView.y]
        : [0, 0]

      return ok({ attributes: row as Record<AttributeName, ValueType>, position })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  getEdge(networkId, edgeId): ApiResult<EdgeData> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      const edge = network.edges.find((e) => e.id === edgeId)
      if (edge === undefined) {
        return fail(
          ApiErrorCode.EdgeNotFound,
          `Edge ${edgeId} not found in network ${networkId}`,
        )
      }

      const tableRecord = useTableStore.getState().tables[networkId]
      const row = tableRecord?.edgeTable?.rows?.get(edgeId) ?? {}

      return ok({
        sourceId: edge.s,
        targetId: edge.t,
        attributes: row as Record<AttributeName, ValueType>,
      })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  createNode(networkId, position, options): ApiResult<{ nodeId: IdType }> {
    try {
      const networkState = useNetworkStore.getState()
      const network = networkState.networks.get(networkId)
      if (network === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }

      // Generate unique ID (replicate useCreateNode.generateNextNodeId)
      const existingIds = network.nodes
        .map((n) => parseInt(n.id))
        .filter((id) => !isNaN(id))
      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : -1
      const newNodeId = `${maxId + 1}`

      // Prepare attributes with defaults
      const attributes: Record<AttributeName, ValueType> = {
        ...(options?.attributes ?? {}),
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
        UndoCommandType.CREATE_NODES,
        `Create Node ${newNodeId}`,
        [networkId, [newNodeId]],
        [networkId, [newNodeId], position, attributes],
      )

      return ok({ nodeId: newNodeId })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  createEdge(
    networkId,
    sourceNodeId,
    targetNodeId,
    options,
  ): ApiResult<{ edgeId: IdType }> {
    try {
      const networkState = useNetworkStore.getState()
      const network = networkState.networks.get(networkId)
      if (network === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }

      const sourceNode = network.nodes.find((n) => n.id === sourceNodeId)
      if (!sourceNode) {
        return fail(
          ApiErrorCode.NodeNotFound,
          `Source node ${sourceNodeId} not found in network ${networkId}`,
        )
      }

      const targetNode = network.nodes.find((n) => n.id === targetNodeId)
      if (!targetNode) {
        return fail(
          ApiErrorCode.NodeNotFound,
          `Target node ${targetNodeId} not found in network ${networkId}`,
        )
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
        ...(options?.attributes ?? {}),
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
        UndoCommandType.CREATE_EDGES,
        `Create Edge ${newEdgeId}`,
        [networkId, [newEdgeId]],
        [networkId, [newEdgeId], sourceNodeId, targetNodeId, attributes],
      )

      return ok({ edgeId: newEdgeId })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  moveEdge(networkId, edgeId, newSourceId, newTargetId): ApiResult {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }

      const edgeExists = network.edges.some((e) => e.id === edgeId)
      if (!edgeExists) {
        return fail(
          ApiErrorCode.EdgeNotFound,
          `Edge ${edgeId} not found in network ${networkId}`,
        )
      }

      const sourceExists = network.nodes.some((n) => n.id === newSourceId)
      if (!sourceExists) {
        return fail(
          ApiErrorCode.NodeNotFound,
          `Source node ${newSourceId} not found in network ${networkId}`,
        )
      }

      const targetExists = network.nodes.some((n) => n.id === newTargetId)
      if (!targetExists) {
        return fail(
          ApiErrorCode.NodeNotFound,
          `Target node ${newTargetId} not found in network ${networkId}`,
        )
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
        UndoCommandType.MOVE_EDGES,
        `Move edge ${edgeId}`,
        [networkId, edgeId, oldSourceId, oldTargetId],
        [networkId, edgeId, newSourceId, newTargetId],
      )

      return ok()
    } catch (e) {
      return fail(
        ApiErrorCode.OperationFailed,
        `Failed to move edge: ${String(e)}`,
      )
    }
  },

  deleteNodes(
    networkId,
    nodeIds,
  ): ApiResult<{ deletedNodeCount: number; deletedEdgeCount: number }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }

      if (nodeIds.length === 0) {
        return fail(
          ApiErrorCode.InvalidInput,
          'No nodes specified for deletion',
        )
      }

      const nodesToDelete = network.nodes.filter((node) =>
        nodeIds.includes(node.id),
      )
      if (nodesToDelete.length === 0) {
        return fail(
          ApiErrorCode.NodeNotFound,
          'None of the specified nodes exist',
        )
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
              deleteBypass(networkId, vpName as VisualPropertyName, allDeletedIds)
            }
          }
        })
      }

      corePostEdit(
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

      return ok({
        deletedNodeCount: result.deletedNodeIds.length,
        deletedEdgeCount: result.deletedEdges.length,
      })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  deleteEdges(
    networkId,
    edgeIds,
  ): ApiResult<{ deletedEdgeCount: number }> {
    try {
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }

      if (edgeIds.length === 0) {
        return fail(
          ApiErrorCode.InvalidInput,
          'No edges specified for deletion',
        )
      }

      const edgesToDelete = network.edges.filter((edge) =>
        edgeIds.includes(edge.id),
      )
      if (edgesToDelete.length === 0) {
        return fail(
          ApiErrorCode.EdgeNotFound,
          'None of the specified edges exist',
        )
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

      return ok({ deletedEdgeCount: result.deletedEdgeIds.length })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  generateNextNodeId(networkId): IdType {
    const network = useNetworkStore.getState().networks.get(networkId)
    if (!network) return '0'
    const existingIds = network.nodes
      .map((n) => parseInt(n.id))
      .filter((id) => !isNaN(id))
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : -1
    return `${maxId + 1}`
  },

  generateNextEdgeId(networkId): IdType {
    const network = useNetworkStore.getState().networks.get(networkId)
    if (!network) return 'e0'
    const existingIds = network.edges
      .map((e) => {
        const id = e.id.startsWith('e') ? e.id.slice(1) : e.id
        return parseInt(id)
      })
      .filter((id) => !isNaN(id))
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : -1
    return `e${maxId + 1}`
  },
}
