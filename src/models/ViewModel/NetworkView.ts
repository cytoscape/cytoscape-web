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

  /**
   * Visualization type (e.g., node-link diagram, circle packing, etc.)
   * nodeLink is the default and will be assigned if not given
   */
  type?: string

  /**
   * ID of the view. Syntax: <networkId>-<type>-<index>
   * e.g., 12345-nodeLink-1
   *
   * This will be generated in the store if not given
   * This will be used to manage the multiple views of the same network
   */
  viewId?: IdType
}
