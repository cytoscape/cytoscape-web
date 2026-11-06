import {
  buildEdgeStoreActions,
  buildNodeStoreActions,
} from '../../app-api/core/elementApi'
import { corePostEdit } from '../../app-api/core/undo'
import { logStore } from '../../debug'
import { deleteEdgesCore, deleteNodesCore } from '../../models/CyNetworkModel'
import type { IdType } from '../../models/IdType'
import type { Edge } from '../../models/NetworkModel'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import type { ValueType } from '../../models/TableModel'
import type { EdgeView, NodeView } from '../../models/ViewModel'
import type { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
import { useNetworkStore } from '../hooks/stores/NetworkStore'
import { useViewModelStore } from '../hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../hooks/stores/VisualStyleStore'

type Bypasses = Map<VisualPropertyName, Map<IdType, any>>

/** The style bypasses set on any of the elements, per visual property */
const captureBypasses = (networkId: IdType, ids: IdType[]): Bypasses => {
  const captured: Bypasses = new Map()
  const visualStyle = useVisualStyleStore.getState().visualStyles[networkId]
  if (visualStyle === undefined) return captured
  Object.keys(visualStyle).forEach((vpName) => {
    const bypassMap = visualStyle[vpName as VisualPropertyName]?.bypassMap
    if (bypassMap === undefined) return
    const values = new Map<IdType, any>()
    ids.forEach((id) => {
      if (bypassMap.has(id)) values.set(id, bypassMap.get(id))
    })
    if (values.size > 0) captured.set(vpName as VisualPropertyName, values)
  })
  return captured
}

const plural = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`

/**
 * Delete the selected nodes and edges of a network (the edges of a deleted
 * node go with it) as ONE undo entry, `DELETE_ELEMENTS`, so a single undo
 * brings everything back. Clears the selection. Plain function over the
 * stores, with no React.
 *
 * Returns false, and changes nothing, when the network or its view model is
 * not loaded or nothing is selected.
 */
export const deleteSelectedElements = (networkId: IdType): boolean => {
  const network = useNetworkStore.getState().networks.get(networkId)
  const view = useViewModelStore.getState().getViewModel(networkId)
  if (network === undefined || view === undefined) return false

  // The selection can name elements that are gone; keep the existing ones
  const selectedNodes = new Set(view.selectedNodes)
  const selectedEdges = new Set(view.selectedEdges)
  const nodeIds = network.nodes
    .filter((node) => selectedNodes.has(node.id))
    .map((node) => node.id)
  const edges: Edge[] = network.edges
    .filter((edge) => selectedEdges.has(edge.id))
    .map((edge) => ({ ...edge }))
  const edgeIds = edges.map((edge) => edge.id)
  if (nodeIds.length === 0 && edgeIds.length === 0) return false

  // Bypasses of everything that goes: the nodes, the selected edges and the
  // other edges of the nodes. Captured before the deletion.
  const nodeIdSet = new Set(nodeIds)
  const incidentEdgeIds = network.edges
    .filter((edge) => nodeIdSet.has(edge.s) || nodeIdSet.has(edge.t))
    .map((edge) => edge.id)
  const allIds = [...new Set([...nodeIds, ...edgeIds, ...incidentEdgeIds])]
  const deletedBypasses = captureBypasses(networkId, allIds)

  // Edges first, so the node deletion reports only the edges it removes
  let edgeViews: EdgeView[] = []
  let edgeRows = new Map<IdType, Record<string, ValueType>>()
  if (edgeIds.length > 0) {
    const result = deleteEdgesCore(
      networkId,
      edgeIds,
      network,
      buildEdgeStoreActions(),
    )
    edgeViews = result.deletedEdgeViews
    edgeRows = result.deletedEdgeRows
  }

  let nodeViews: NodeView[] = []
  let nodeRows = new Map<IdType, Record<string, ValueType>>()
  const allEdges = [...edges]
  if (nodeIds.length > 0) {
    const result = deleteNodesCore(
      networkId,
      nodeIds,
      useNetworkStore.getState().networks.get(networkId) ?? network,
      buildNodeStoreActions(),
    )
    nodeViews = result.deletedNodeViews
    nodeRows = result.deletedNodeRows
    allEdges.push(...result.deletedEdges)
    edgeViews = [...edgeViews, ...result.deletedEdgeViews]
    edgeRows = new Map([...edgeRows, ...result.deletedEdgeRows])
  }

  if (deletedBypasses.size > 0) {
    const { deleteBypass } = useVisualStyleStore.getState()
    deletedBypasses.forEach((_values, vpName) => {
      deleteBypass(networkId, vpName, allIds)
    })
  }

  useViewModelStore.getState().exclusiveSelect(networkId, [], [])

  const description = [
    nodeIds.length > 0 ? plural(nodeIds.length, 'Node') : '',
    edgeIds.length > 0 ? plural(edgeIds.length, 'Edge') : '',
  ]
    .filter((part) => part !== '')
    .join(' and ')
  corePostEdit(
    networkId,
    UndoCommandType.DELETE_ELEMENTS,
    `Delete ${description}`,
    // Undo: DELETE_NODES's restore, with every deleted edge
    [
      networkId,
      nodeIds,
      allEdges,
      nodeViews,
      edgeViews,
      nodeRows,
      edgeRows,
      deletedBypasses,
    ],
    // Redo: delete the same nodes and edges again
    [networkId, nodeIds, edgeIds],
  )
  logStore.info(
    `[deleteSelectedElements]: deleted ${description} from ${networkId}`,
  )
  return true
}
