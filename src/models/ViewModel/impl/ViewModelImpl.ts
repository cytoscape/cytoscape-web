import { Cx2 } from '../../../utils/cx/Cx2'
import { IdType } from '../../IdType'
import { NetworkView } from '../NetworkView'
import { NodeView } from '../NodeView'
import { EdgeView } from '../EdgeView'
import { translateCXEdgeId } from '../../NetworkModel/impl/CyNetwork'
import * as cxUtil from '../../../utils/cx/cx2-util'
import { Node as CxNode } from '../../../utils/cx/Cx2/CoreAspects/Node'
import { Edge as CxEdge } from '../../../utils/cx/Cx2/CoreAspects/Edge'

export const createViewModelFromCX = (id: IdType, cx: Cx2): NetworkView => {
  const cxNodes: CxNode[] = cxUtil.getNodes(cx)
  const cxEdges: CxEdge[] = cxUtil.getEdges(cx)

  const nodeViews: Record<IdType, NodeView> = {}
  const edgeViews: Record<IdType, EdgeView> = {}
  cxNodes.forEach((node: CxNode) => {
    nodeViews[node.id.toString()] = {
      id: node.id.toString(),
      ...(node.x != null ? { x: node.x } : {}),
      ...(node.y != null ? { y: node.y } : {}),
      ...(node.z != null ? { z: node.z } : {}),
    }
  })

  cxEdges.forEach((edge: CxEdge) => {
    const translatedId = translateCXEdgeId(edge.id.toString())
    edgeViews[translatedId] = {
      id: translatedId,
    }
  })

  return {
    id,
    nodeViews,
    edgeViews,
  }
}
