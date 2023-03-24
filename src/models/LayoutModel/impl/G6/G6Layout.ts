import G6, { GraphData, NodeConfig, EdgeConfig, LayoutConfig } from '@antv/g6'
import { IdType } from '../../../IdType'
import { Node, Edge } from '../../../NetworkModel'
import { LayoutAlgorithm } from '../../LayoutAlgorithm'
import { LayoutEngine } from '../../LayoutEngine'
import { G6Algorithms } from './Algorithms/G6Algorithms'

const DEFAULT_ALGORITHM: LayoutAlgorithm = G6Algorithms.gForce

const dummyContainer: HTMLElement = document.createElement('div')
dummyContainer.style.display = 'none'

export const G6Layout: LayoutEngine = {
  // G6 Layout
  name: 'G6',

  description: 'G6 Graph Visualization Engine by AntV.',

  defaultAlgorithmName: DEFAULT_ALGORITHM.name,

  algorithmNames: Object.keys(G6Algorithms),

  getAlgorithm: (name: string): LayoutAlgorithm => {
    return G6Algorithms[name] ?? DEFAULT_ALGORITHM
  },

  apply: (
    nodes: Node[],
    edges: Edge[],
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,
    algorithmName?: string,
  ): void => {
    const graph = new G6.Graph({
      container: dummyContainer,
      width: 1000,
      height: 1000,
      layout:
        algorithmName !== undefined
          ? (G6Algorithms[algorithmName].parameters as LayoutConfig)
          : (DEFAULT_ALGORITHM.parameters as LayoutConfig),
    })

    graph.data(transform(nodes, edges))
    graph.on('afterlayout', () => {
      console.log('afterlayout----------------->', graph)
      const positions = new Map<IdType, [number, number]>()
      const g6Nodes = graph.getNodes()
      g6Nodes.forEach((g6Node) => {
        const id = g6Node.getModel().id as string
        const { x, y } = g6Node.getModel()

        positions.set(id, [x as number, y as number])
      })
      afterLayout(positions)
      graph.destroy()
    })
    graph.render()
  },
}

const transform = (nodes: Node[], edges: Edge[]): GraphData => {
  const nodeConfigs: NodeConfig[] = nodes.map((node: Node) => ({ id: node.id }))
  const edgeConfigs: EdgeConfig[] = edges.map((edge: Edge) => ({
    source: edge.s,
    target: edge.t,
  }))
  return {
    nodes: nodeConfigs,
    edges: edgeConfigs,
  }
}
