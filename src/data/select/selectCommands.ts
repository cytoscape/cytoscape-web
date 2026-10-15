import { logStore } from '../../debug'
import { DisplayMode } from '../../models/FilterModel/DisplayMode'
import type { IdType } from '../../models/IdType'
import { getElementsToHide } from '../../models/NetworkModel/impl/hideSelection'
import { hasHiddenElements } from '../../models/VisualStyleModel/impl/visibilityBypass'
import {
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
} from '../../models/VisualStyleModel/VisualPropertyName'
import { VisibilityType } from '../../models/VisualStyleModel/VisualPropertyValue/VisibilityType'
import { switchOffSubnetworkFilter } from '../filter/applyWorkspaceFilter'
import { useFilterStore } from '../hooks/stores/FilterStore'
import { useNetworkStore } from '../hooks/stores/NetworkStore'
import { useViewModelStore } from '../hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../hooks/stores/WorkspaceStore'

/**
 * The Select menu's commands (Cytoscape Desktop's Select menu): plain
 * functions over the stores, with no React. Each one returns false, and
 * changes nothing, when the network, its view model or its style is not
 * loaded. None of them creates an undo entry.
 */

const getSelection = (
  networkId: IdType,
): { selectedNodes: IdType[]; selectedEdges: IdType[] } | undefined => {
  const view = useViewModelStore.getState().getViewModel(networkId)
  if (view === undefined) return undefined
  return {
    selectedNodes: view.selectedNodes,
    selectedEdges: view.selectedEdges,
  }
}

/**
 * Replace the selection, computing the new one from the network and the
 * current selection
 */
const select = (
  networkId: IdType,
  next: (
    all: { nodeIds: IdType[]; edgeIds: IdType[] },
    current: { selectedNodes: IdType[]; selectedEdges: IdType[] },
  ) => { nodeIds: IdType[]; edgeIds: IdType[] },
): boolean => {
  const network = useNetworkStore.getState().networks.get(networkId)
  const current = getSelection(networkId)
  if (network === undefined || current === undefined) return false
  const { nodeIds, edgeIds } = next(
    {
      nodeIds: network.nodes.map((node) => node.id),
      edgeIds: network.edges.map((edge) => edge.id),
    },
    current,
  )
  useViewModelStore.getState().exclusiveSelect(networkId, nodeIds, edgeIds)
  return true
}

// As in Cytoscape Desktop, selecting all includes the hidden elements

export const selectAllNodes = (networkId: IdType): boolean =>
  select(networkId, (all, current) => ({
    nodeIds: all.nodeIds,
    edgeIds: current.selectedEdges,
  }))

export const selectAllEdges = (networkId: IdType): boolean =>
  select(networkId, (all, current) => ({
    nodeIds: current.selectedNodes,
    edgeIds: all.edgeIds,
  }))

export const deselectAllNodes = (networkId: IdType): boolean =>
  select(networkId, (_all, current) => ({
    nodeIds: [],
    edgeIds: current.selectedEdges,
  }))

export const deselectAllEdges = (networkId: IdType): boolean =>
  select(networkId, (_all, current) => ({
    nodeIds: current.selectedNodes,
    edgeIds: [],
  }))

export const selectAll = (networkId: IdType): boolean =>
  select(networkId, (all) => all)

export const deselectAll = (networkId: IdType): boolean =>
  select(networkId, () => ({ nodeIds: [], edgeIds: [] }))

/**
 * Whether the network has a selected node or edge (Hide Selected is enabled)
 */
export const hasSelection = (networkId: IdType): boolean => {
  const current = getSelection(networkId)
  return (
    current !== undefined &&
    (current.selectedNodes.length > 0 || current.selectedEdges.length > 0)
  )
}

/**
 * Whether a visibility bypass hides an element of the network (Show All is
 * enabled)
 */
export const hasHiddenElementsInNetwork = (networkId: IdType): boolean => {
  const { visualStyles } = useVisualStyleStore.getState()
  return (
    Object.hasOwn(visualStyles, networkId) &&
    hasHiddenElements(visualStyles[networkId])
  )
}

/**
 * Hide Selected Nodes and Edges, as Cytoscape Desktop does: the selected
 * nodes, every edge connected to them and the selected edges get a "none"
 * visibility bypass, added to the network's other visibility bypasses, and
 * are deselected, so nothing hidden stays selected. The bypasses belong to
 * the network's active visual style and are saved with it.
 */
export const hideSelected = (networkId: IdType): boolean => {
  const network = useNetworkStore.getState().networks.get(networkId)
  const current = getSelection(networkId)
  const { visualStyles, setBypass } = useVisualStyleStore.getState()
  if (
    network === undefined ||
    current === undefined ||
    !Object.hasOwn(visualStyles, networkId)
  ) {
    return false
  }
  const { nodeIds, edgeIds } = getElementsToHide(
    network.edges,
    current.selectedNodes,
    current.selectedEdges,
  )
  if (nodeIds.length === 0 && edgeIds.length === 0) return false

  if (nodeIds.length > 0) {
    setBypass(
      networkId,
      NodeVisualPropertyName.NodeVisibility,
      nodeIds,
      VisibilityType.None,
    )
  }
  if (edgeIds.length > 0) {
    setBypass(
      networkId,
      EdgeVisualPropertyName.EdgeVisibility,
      edgeIds,
      VisibilityType.None,
    )
  }
  const hiddenNodes = new Set(nodeIds)
  const hiddenEdges = new Set(edgeIds)
  useViewModelStore.getState().exclusiveSelect(
    networkId,
    current.selectedNodes.filter((id) => !hiddenNodes.has(id)),
    current.selectedEdges.filter((id) => !hiddenEdges.has(id)),
  )
  // No undo entry records this bypass change, so mark the network here
  // (see markNetworkModified in src/app-api/core/undo.ts)
  useWorkspaceStore.getState().setNetworkModified(networkId, true)
  logStore.info(
    `[hideSelected]: hid ${nodeIds.length} nodes and ${edgeIds.length} edges of ${networkId}`,
  )
  return true
}

/**
 * Show All (Cytoscape Desktop's "Show All Nodes and Edges"): remove every
 * node and edge visibility bypass of the network, whoever wrote it. The
 * selection is left alone.
 *
 * Visibility has two other writers, which Show All releases so that neither
 * claims to hide something it no longer hides:
 * - a FILTER tab filter applied in show mode: its record in
 *   `appliedWorkspaceFilters` is dropped (a select-mode record stays, since
 *   it hides nothing);
 * - the subnetwork's `filterWidgets` filter: it is switched off.
 */
export const showAll = (networkId: IdType): boolean => {
  const { visualStyles, setBypassMap } = useVisualStyleStore.getState()
  if (!Object.hasOwn(visualStyles, networkId)) return false

  const style = visualStyles[networkId]
  const hadBypass = [
    NodeVisualPropertyName.NodeVisibility,
    EdgeVisualPropertyName.EdgeVisibility,
  ].some((vpName) => (style[vpName]?.bypassMap.size ?? 0) > 0)
  setBypassMap(networkId, NodeVisualPropertyName.NodeVisibility, new Map())
  setBypassMap(networkId, EdgeVisualPropertyName.EdgeVisibility, new Map())

  const { appliedWorkspaceFilters, deleteAppliedWorkspaceFilter } =
    useFilterStore.getState()
  if (
    Object.hasOwn(appliedWorkspaceFilters, networkId) &&
    appliedWorkspaceFilters[networkId].displayMode === DisplayMode.SHOW_HIDE
  ) {
    deleteAppliedWorkspaceFilter(networkId)
  }
  switchOffSubnetworkFilter(networkId)

  // No undo entry records this bypass change, so mark the network here
  if (hadBypass) {
    useWorkspaceStore.getState().setNetworkModified(networkId, true)
  }
  logStore.info(`[showAll]: showed every node and edge of ${networkId}`)
  return true
}
