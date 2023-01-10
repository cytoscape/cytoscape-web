import { IdType } from '../IdType'
import { EdgeView } from './EdgeView'
import { NodeView } from './NodeView'

export interface NetworkView {
  id: IdType // ID of the associated network
  nodeViews: Record<IdType, NodeView>
  edgeViews: Record<IdType, EdgeView>
  hoveredElement: IdType | null // keep the current hovered element id as state, only one element can be hovered at a time
}
