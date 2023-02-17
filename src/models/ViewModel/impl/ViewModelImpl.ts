import { Cx2 } from '../../../utils/cx/Cx2'
import { IdType } from '../../IdType'
import { NetworkView } from '../NetworkView'
import { NodeView } from '../NodeView'
import { EdgeView } from '../EdgeView'
import { translateCXEdgeId } from '../../NetworkModel/impl/CyNetwork'
import * as cxUtil from '../../../utils/cx/cx2-util'
import { Node as CxNode } from '../../../utils/cx/Cx2/CoreAspects/Node'
import { Edge as CxEdge } from '../../../utils/cx/Cx2/CoreAspects/Edge'
import { VisualPropertyValueType } from '../../VisualStyleModel'
import { EdgeVisualPropertyName, NetworkVisualPropertyName, NodeVisualPropertyName } from '../../VisualStyleModel/VisualPropertyName'

export const createViewModelFromCX = (id: IdType, cx: Cx2): NetworkView => {
  const cxNodes: CxNode[] = cxUtil.getNodes(cx)
  const cxEdges: CxEdge[] = cxUtil.getEdges(cx)

  const nodeViews: Record<IdType, NodeView> = {}
  const edgeViews: Record<IdType, EdgeView> = {}
  cxNodes.forEach((node: CxNode) => {
    const nodeId: string = node.id.toString()
    const values = new Map<NodeVisualPropertyName, VisualPropertyValueType>()
    nodeViews[nodeId] = {
      id: nodeId,
      x: node.x ?? 0,
      y: node.y ?? 0,
      ...(node.z !== null && node.z !== undefined ? { z: node.z } : {}),
      values
    }
  })

  cxEdges.forEach((edge: CxEdge) => {
    const translatedId = translateCXEdgeId(edge.id.toString())
    edgeViews[translatedId] = {
      id: translatedId,
      values: new Map<EdgeVisualPropertyName, VisualPropertyValueType>()
    }
  })

  const networkView: NetworkView = {
    id,
    nodeViews,
    edgeViews,
    selectedNodes: [],
    selectedEdges: [],
    values: new Map<NetworkVisualPropertyName, VisualPropertyValueType>()
  }

  return networkView
}
