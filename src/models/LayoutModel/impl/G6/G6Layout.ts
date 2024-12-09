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

  algorithms: G6Algorithms,

  apply: (
    nodes: Node[],
    edges: Edge[],
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,
    algorithm: LayoutAlgorithm,
  ): void => {
    const graph = new G6.Graph({
      container: dummyContainer,
      width: 4000,
      height: 4000,
      layout: algorithm.parameters as LayoutConfig,
    })

    graph.data(transform(nodes, edges))
    graph.on('afterlayout', () => {
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
  // Check if nodes and edges are available, if not, return empty graph data
  if(!nodes || !edges) {
    alert('Please open a network first!')
    return { nodes: [], edges: [] };
  }

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
