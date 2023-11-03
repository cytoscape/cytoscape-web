import { IdType } from '../IdType'
import { EdgeView } from './EdgeView'
import { NodeView } from './NodeView'
import { View } from './View'

/**
 * The Network View object containing all the
 * information needed to render the network
 *
 * It can also store the dynamic view state like selection, hover, etc.
 */
export interface NetworkView extends View {
  nodeViews: Record<IdType, NodeView>
  edgeViews: Record<IdType, EdgeView>

  // Keep the selected objects in the view
  selectedNodes: IdType[]
  selectedEdges: IdType[]
}
