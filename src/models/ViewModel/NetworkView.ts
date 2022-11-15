import { IdType } from '../IdType'
import { EdgeView } from './EdgeView'
import { NodeView } from './NodeView'

export interface NetworkView {
  id: IdType // ID of the associated network
  nodeViews: NodeView[]
  edgeViews: EdgeView[]
}
