import { Node, Edge } from '../../../../models/NetworkModel'
import { IdType } from '../../../../models/IdType'
import { LayoutEngine } from '../../LayoutEngine'
import { CyjsAlgorithms } from './CyjsAlgorithms'
import { LayoutAlgorithm } from '../../LayoutAlgorithm'

export const CyjsLayout: LayoutEngine = {
  // Cytoscape.js Layout
  name: 'Cytoscape.js',
  algorithmNames: Object.keys(CyjsAlgorithms),
  getAlgorithm: (name: string): LayoutAlgorithm => {
    return CyjsAlgorithms[name] ?? CyjsAlgorithms.preset
  },
  apply: (
    nodes: Node[],
    edges: Edge[],
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,
  ): void => {},
}
