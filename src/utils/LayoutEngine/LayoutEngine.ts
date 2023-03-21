import { IdType } from '../../models/IdType'
import { Node, Edge } from '../../models/NetworkModel'

export interface LayoutEngine {
  name: string
  options: object
  apply: (
    nodes: Node[],
    edges: Edge[],

    // Callback function to be called after layout
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,
  ) => void
}
