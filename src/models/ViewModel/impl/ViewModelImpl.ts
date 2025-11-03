import { Cx2 } from '../../CxModel/Cx2'
import { IdType } from '../../IdType'
import { NetworkView } from '../NetworkView'
import { NodeView } from '../NodeView'
import { EdgeView } from '../EdgeView'
import { translateCXEdgeId } from '../../NetworkModel/impl/NetworkImpl'
import * as cxUtil from '../../CxModel/cx2-util'
import { Node as CxNode } from '../../CxModel/Cx2/CoreAspects/Node'
import { Edge as CxEdge } from '../../CxModel/Cx2/CoreAspects/Edge'
import { Node, Edge } from '../../NetworkModel'
import { VisualPropertyValueType } from '../../VisualStyleModel'
import {
  EdgeVisualPropertyName,
  NetworkVisualPropertyName,
  NodeVisualPropertyName,
} from '../../VisualStyleModel/VisualPropertyName'
import { Network } from '../../NetworkModel'

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

/**
 * Creates a view model from CX2 format.
 * Extracts node positions from CX format if available, and handles z-coordinates.
 * Edge IDs are translated with the 'e' prefix.
 *
 * @param id - The ID for the view model
 * @param cx - The CX2 data object
 * @returns A new NetworkView instance
 */
export const createViewModelFromCX = (id: IdType, cx: Cx2): NetworkView => {
  const cxNodes: CxNode[] = cxUtil.getNodes(cx)
  const cxEdges: CxEdge[] = cxUtil.getEdges(cx)

  const nodeViews: Record<IdType, NodeView> = {}
  const edgeViews: Record<IdType, EdgeView> = {}

  cxNodes.forEach((node: CxNode) => {
    const nodeId: string = node.id.toString()
    const values = new Map<NodeVisualPropertyName, VisualPropertyValueType>()
    const nodeView: NodeView = {
      id: nodeId,
      x: node.x ?? 0,
      y: node.y ?? 0,
      values,
    }

    if (node.z !== null && node.z !== undefined) {
      nodeView.z = node.z
    }

    nodeViews[nodeId] = nodeView
  })

  cxEdges.forEach((edge: CxEdge) => {
    const translatedId = translateCXEdgeId(edge.id.toString())
    edgeViews[translatedId] = {
      id: translatedId,
      values: new Map<EdgeVisualPropertyName, VisualPropertyValueType>(),
    }
  })

  return createNetworkViewFromViews(id, nodeViews, edgeViews)
}
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
