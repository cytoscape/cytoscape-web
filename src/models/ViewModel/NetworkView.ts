import { IdType } from '../IdType'
import { EdgeView, CyJsEdgeView } from './EdgeView'
import { NodeView, CyJsNodeView } from './NodeView'

export interface NetworkView {
  id: IdType // ID of the associated network
  nodeViews: Record<IdType, NodeView>
  edgeViews: Record<IdType, EdgeView>
}

export interface CyJsNetworkView {
  id: IdType // ID of the associated network
  nodeViews: CyJsNodeView[]
  edgeViews: CyJsEdgeView[]
}
