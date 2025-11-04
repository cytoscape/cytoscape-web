/**
 * View Model Converter from CX2
 *
 * Converts CX2 format data to ViewModel.
 */
import { Cx2 } from '../../Cx2'
import { IdType } from '../../../IdType'
import { NetworkView } from '../../../ViewModel/NetworkView'
import { NodeView } from '../../../ViewModel/NodeView'
import { EdgeView } from '../../../ViewModel/EdgeView'
import { translateCXEdgeId } from './networkConverter'
import * as cxUtil from '../../extractor'
import { Node as CxNode } from '../../Cx2/CoreAspects/Node'
import { Edge as CxEdge } from '../../Cx2/CoreAspects/Edge'
import { VisualPropertyValueType } from '../../../VisualStyleModel'
import {
  EdgeVisualPropertyName,
  NetworkVisualPropertyName,
  NodeVisualPropertyName,
} from '../../../VisualStyleModel/VisualPropertyName'

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

