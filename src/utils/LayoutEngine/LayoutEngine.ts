import { IdType } from '../../models/IdType'
import { Node, Edge } from '../../models/NetworkModel'
import { LayoutAlgorithm } from './LayoutAlgorithm'

export interface LayoutEngine {
  // Name of this layout engine
  name: string

  // Algorithm name to use by default
  defaultAlgorithmName?: string

  // List of available algorithm names
  algorithmNames: string[]

  // Get details of the algorithm by name
  getAlgorithm: (name: string) => LayoutAlgorithm

  apply: (
    nodes: Node[],
    edges: Edge[],

    // Callback function to be called after layout
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,

    // (Optional) Name of the algorithm to be used in apply function.
    layoutName?: string,
  ) => void
}
