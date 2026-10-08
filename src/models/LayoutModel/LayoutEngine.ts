import { IdType } from '../IdType'
import { Edge, Node } from '../NetworkModel'
import { LayoutAlgorithm } from './LayoutAlgorithm'

export interface LayoutEngine {
  // Name of this layout engine
  readonly name: string

  // Detailed description of this layout engine itself
  readonly description?: string

  // Set on the synthetic engine the host builds for an app's registered
  // 'layout-algorithm' resources (one engine per app, named after the app
  // id). Undefined for the built-in engines. The Layout menu uses it to
  // render app algorithms in their own block.
  readonly appId?: string

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

    // The network being laid out. Built-in engines ignore it; app engines
    // need it to read the current positions and selection, so every host
    // call site passes it.
    networkId?: IdType,
  ) => void | Promise<void>
}
