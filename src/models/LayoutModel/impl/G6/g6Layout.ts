import { IdType } from '@/models/IdType'
import { Edge, Node } from '@/models/NetworkModel'
import { LayoutAlgorithm } from '@/models/LayoutModel/LayoutAlgorithm'
import { LayoutEngine } from '@/models/LayoutModel/LayoutEngine'
import { G6Algorithms } from './Algorithms/g6Algorithms'

const DEFAULT_ALGORITHM: LayoutAlgorithm = G6Algorithms.gForce

// The engine keeps its historical name 'G6' because LayoutStore persists
// engine/algorithm selections by name, but it now runs the algorithms
// through @antv/layout directly. The full @antv/g6 package bundled its
// entire rendering stack (~380 KB gzip) only to execute a layout into a
// hidden container and read the positions back.
export const G6Layout: LayoutEngine = {
  name: 'G6',

  description: 'Layout algorithms from AntV (@antv/layout).',

  defaultAlgorithmName: DEFAULT_ALGORITHM.name,

  algorithms: G6Algorithms,

  apply: (
    nodes: Node[],
    edges: Edge[],
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,
    algorithm: LayoutAlgorithm,
  ): Promise<void> => {
    // Dynamic so the layout implementation stays out of the eager graph;
    // this boundary is what keeps @antv/layout in its own chunk.
    return import('./runAntvLayout').then(({ runAntvLayout }) => {
      runAntvLayout(nodes, edges, afterLayout, algorithm)
    })
  },
}
