import { IdType } from '../IdType'
import { Node, Edge } from '../NetworkModel'
import { LayoutAlgorithm } from './LayoutAlgorithm'

export interface LayoutEngine {
  // Name of this layout engine
  readonly name: string

  // Detailed description of this layout engine itself
  readonly description?: string

  // Algorithm name to use by default
  defaultAlgorithmName: string

  // List of available algorithm names
  algorithms: Record<string, LayoutAlgorithm>

  apply: (
    // Graph topology
    nodes: Node[],
    edges: Edge[],

    // Callback function to be called after layout
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,

    algorithm: LayoutAlgorithm,
  ) => void
}
