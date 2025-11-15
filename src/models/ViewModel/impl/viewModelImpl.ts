import { Edge as CxEdge } from '../../CxModel/Cx2/CoreAspects/Edge'
import { Node as CxNode } from '../../CxModel/Cx2/CoreAspects/Node'
import { translateCXEdgeId } from '../../CxModel/impl/converters'
import { IdType } from '../../IdType'
import { Edge,Node } from '../../NetworkModel'
import { Network } from '../../NetworkModel'
import { isEdgeId } from '../../NetworkModel/impl/networkImpl'
import { VisualPropertyValueType } from '../../VisualStyleModel'
import {
  EdgeVisualPropertyName,
  NetworkVisualPropertyName,
  NodeVisualPropertyName,
} from '../../VisualStyleModel/VisualPropertyName'
import { EdgeView } from '../EdgeView'
import { NetworkView } from '../NetworkView'
import { NodeView } from '../NodeView'

// Default view type (a node-link diagram)
export const DEF_VIEW_TYPE = 'nodeLink'

/**
 * Internal helper to create a NetworkView from prepared node and edge views
 */
const createNetworkViewFromViews = (
  id: IdType,
  nodeViews: Record<IdType, NodeView>,
  edgeViews: Record<IdType, EdgeView>,
): NetworkView => {
  return {
    id,
    nodeViews,
    edgeViews,
    selectedNodes: [],
    selectedEdges: [],
    values: new Map<NetworkVisualPropertyName, VisualPropertyValueType>(),
  }
}

/**
 * Creates a view model from a Network object.
 * All node positions default to (0, 0) and no z-coordinate is set.
 *
 * @param network - The network to create a view model for
 * @param id - Optional explicit ID for the view model. Defaults to network.id
 * @returns A new NetworkView instance
 */
export const createViewModel = (network: Network, id?: IdType): NetworkView => {
  const viewId = id ?? network.id
  const nodeViews: Record<IdType, NodeView> = {}
  const edgeViews: Record<IdType, EdgeView> = {}

  network.nodes.forEach((node) => {
    const values = new Map<NodeVisualPropertyName, VisualPropertyValueType>()
    nodeViews[node.id] = {
      id: node.id,
      x: 0,
      y: 0,
      values,
    }
  })

  network.edges.forEach((edge) => {
    edgeViews[edge.id] = {
      id: edge.id,
      values: new Map<EdgeVisualPropertyName, VisualPropertyValueType>(),
    }
  })

  return createNetworkViewFromViews(viewId, nodeViews, edgeViews)
}

// NOTE: createViewModelFromCX has been moved to CxModel/impl/converters/viewModelConverter.ts
// The function has been removed from here to centralize CX2 conversion logic
export const addNodeViewsToModel = (
  networkView: NetworkView,
  nodeViews: NodeView[],
): NetworkView => {
  nodeViews.forEach((nodeView) => {
    networkView.nodeViews[nodeView.id] = nodeView
  })
  return networkView
}

export const addEdgeViewsToModel = (
  networkView: NetworkView,
  edgeViews: EdgeView[],
): NetworkView => {
  edgeViews.forEach((edgeView) => {
    networkView.edgeViews[edgeView.id] = edgeView
  })
  return networkView
}

export const addNodeViewToModel = (
  networkView: NetworkView,
  node: CxNode,
): NetworkView => {
  const nodeView: NodeView = {
    id: node.id.toString(),
    x: node.x ?? 0,
    y: node.y ?? 0,
    values: new Map<NodeVisualPropertyName, VisualPropertyValueType>(),
  }

  if (node.z !== undefined) {
    nodeView.z = node.z
  }

  networkView.nodeViews[node.id.toString()] = nodeView

  return networkView
}

export const addEdgeViewToModel = (
  networkView: NetworkView,
  edge: CxEdge,
): NetworkView => {
  const translatedId = translateCXEdgeId(edge.id.toString())
  const edgeView: EdgeView = {
    id: translatedId,
    values: new Map<EdgeVisualPropertyName, VisualPropertyValueType>(),
  }

  networkView.edgeViews[translatedId] = edgeView

  return networkView
}

/**
 * Generate a new view ID for a network view
 */
export const getNetworkViewId = (
  newView: NetworkView,
  views: NetworkView[],
): IdType => {
  let { type } = newView
  const { id } = newView
  if (type === undefined) {
    type = DEF_VIEW_TYPE
  }
  const prefix = `${id}-${type}`
  const existingIds: string[] = []

  views.forEach((view: NetworkView) => {
    const viewId: string = view.viewId ?? ''
    if (viewId.startsWith(prefix)) {
      existingIds.push(viewId)
    }
  })

  return `${id}-${type}-${existingIds.length + 1}`
}

/**
 * Set selected nodes and edges exclusively (replaces existing selection)
 */
export const exclusiveSelect = (
  networkView: NetworkView,
  selectedNodes: IdType[],
  selectedEdges: IdType[],
): NetworkView => {
  return {
    ...networkView,
    selectedNodes,
    selectedEdges,
  }
}

/**
 * Toggle selection of nodes and edges
 */
export const toggleSelected = (
  networkView: NetworkView,
  eles: IdType[],
): NetworkView => {
  const selectedNodesSet = new Set(networkView.selectedNodes)
  const selectedEdgesSet = new Set(networkView.selectedEdges)

  const nodeEles = eles.filter((id) => !isEdgeId(id))
  const edgeEles = eles.filter((id) => isEdgeId(id))

  nodeEles.forEach((id) => {
    if (selectedNodesSet.has(id)) {
      selectedNodesSet.delete(id)
    } else {
      selectedNodesSet.add(id)
    }
  })

  edgeEles.forEach((id) => {
    if (selectedEdgesSet.has(id)) {
      selectedEdgesSet.delete(id)
    } else {
      selectedEdgesSet.add(id)
    }
  })

  return {
    ...networkView,
    selectedNodes: Array.from(selectedNodesSet),
    selectedEdges: Array.from(selectedEdgesSet),
  }
}

/**
 * Add nodes and edges to selection without removing existing
 */
export const additiveSelect = (
  networkView: NetworkView,
  eles: IdType[],
): NetworkView => {
  const selectedNodesSet = new Set(networkView.selectedNodes)
  const selectedEdgesSet = new Set(networkView.selectedEdges)

  for (let i = 0; i < eles.length; i++) {
    const eleId = eles[i]
    if (isEdgeId(eleId)) {
      selectedEdgesSet.add(eleId)
    } else {
      selectedNodesSet.add(eleId)
    }
  }

  return {
    ...networkView,
    selectedNodes: Array.from(selectedNodesSet),
    selectedEdges: Array.from(selectedEdgesSet),
  }
}

/**
 * Remove nodes and edges from selection without affecting others
 */
export const additiveUnselect = (
  networkView: NetworkView,
  eles: IdType[],
): NetworkView => {
  const selectedNodesSet = new Set(networkView.selectedNodes)
  const selectedEdgesSet = new Set(networkView.selectedEdges)

  for (let i = 0; i < eles.length; i++) {
    const eleId = eles[i]
    if (isEdgeId(eleId)) {
      selectedEdgesSet.delete(eleId)
    } else {
      selectedNodesSet.delete(eleId)
    }
  }

  return {
    ...networkView,
    selectedNodes: Array.from(selectedNodesSet),
    selectedEdges: Array.from(selectedEdgesSet),
  }
}

/**
 * Set the position of a node
 */
export const setNodePosition = (
  networkView: NetworkView,
  nodeId: IdType,
  position: [number, number, number?],
): NetworkView => {
  const nodeView: NodeView | undefined = networkView.nodeViews[nodeId]
  if (nodeView === null || nodeView === undefined) {
    return networkView
  }

  const newNodeView: NodeView = {
    ...nodeView,
    x: position[0],
    y: position[1],
  }

  if (position[2] !== undefined) {
    newNodeView.z = position[2]
  }

  return {
    ...networkView,
    nodeViews: {
      ...networkView.nodeViews,
      [nodeId]: newNodeView,
    },
  }
}

/**
 * Update multiple node positions
 */
export const updateNodePositions = (
  networkView: NetworkView,
  positions: Map<IdType, [number, number, number?]>,
): NetworkView => {
  const newNodeViews: Record<IdType, NodeView> = { ...networkView.nodeViews }

  Object.keys(newNodeViews).forEach((nodeId: IdType) => {
    const nodeView: NodeView = newNodeViews[nodeId]
    const newPosition: [number, number, number?] | undefined = positions.get(nodeId)
    if (newPosition !== undefined) {
      const updatedNodeView: NodeView = {
        ...nodeView,
        x: newPosition[0],
        y: newPosition[1],
      }
      if (newPosition[2] !== undefined) {
        updatedNodeView.z = newPosition[2]
      }
      newNodeViews[nodeId] = updatedNodeView
    }
  })

  return {
    ...networkView,
    nodeViews: newNodeViews,
  }
}

/**
 * Delete nodes and edges from the view
 */
export const deleteObjects = (
  networkView: NetworkView,
  ids: IdType[],
): NetworkView => {
  const newNodeViews: Record<IdType, NodeView> = { ...networkView.nodeViews }
  const newEdgeViews: Record<IdType, EdgeView> = { ...networkView.edgeViews }

  ids.forEach((id) => {
    if (newNodeViews[id] !== undefined) {
      delete newNodeViews[id]
    } else if (newEdgeViews[id] !== undefined) {
      delete newEdgeViews[id]
    }
  })

  return {
    ...networkView,
    nodeViews: newNodeViews,
    edgeViews: newEdgeViews,
  }
}

/**
 * Add a single node view
 */
export const addNodeViewDirect = (
  networkView: NetworkView,
  nodeView: NodeView,
): NetworkView => {
  return {
    ...networkView,
    nodeViews: {
      ...networkView.nodeViews,
      [nodeView.id]: nodeView,
    },
  }
}

/**
 * Add a single edge view
 */
export const addEdgeViewDirect = (
  networkView: NetworkView,
  edgeView: EdgeView,
): NetworkView => {
  return {
    ...networkView,
    edgeViews: {
      ...networkView.edgeViews,
      [edgeView.id]: edgeView,
    },
  }
}

/**
 * Delete node views
 */
export const deleteNodeViews = (
  networkView: NetworkView,
  nodeIds: IdType[],
): NetworkView => {
  const newNodeViews: Record<IdType, NodeView> = { ...networkView.nodeViews }

  nodeIds.forEach((id) => {
    delete newNodeViews[id]
  })

  return {
    ...networkView,
    nodeViews: newNodeViews,
  }
}

/**
 * Delete edge views
 */
export const deleteEdgeViews = (
  networkView: NetworkView,
  edgeIds: IdType[],
): NetworkView => {
  const newEdgeViews: Record<IdType, EdgeView> = { ...networkView.edgeViews }

  edgeIds.forEach((edgeId) => {
    delete newEdgeViews[edgeId]
  })

  return {
    ...networkView,
    edgeViews: newEdgeViews,
  }
}
