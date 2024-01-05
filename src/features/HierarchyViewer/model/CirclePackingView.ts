import { NetworkView } from '../../../models/ViewModel'
import { HierarchyNode } from 'd3-hierarchy'

export interface CirclePackingView extends NetworkView {
  /*
  nodeViews: Record<IdType, NodeView>
  edgeViews: Record<IdType, EdgeView>

  // Keep the selected objects in the view
  selectedNodes: IdType[]
  selectedEdges: IdType[]

  // Visualization type (e.g., node-link diagram, circle packing, etc.)
  type?: string
  viewId?: string
  */

  // Data storage for the D3 hierarchy model
  hierarchy: HierarchyNode<any>
}
