import G6, { GraphData, NodeConfig, EdgeConfig } from '@antv/g6'
import { IdType } from '../../../models/IdType'
import { Node, Edge } from '../../../models/NetworkModel'
import { LayoutEngine } from '../LayoutEngine'

// const dagre = {
//   type: 'dagre',
//   rankdir: 'LR', // The center of the graph by default
//   align: 'DL',
//   nodesep: 5,
//   ranksep: 15,
//   controlPoints: true,
// }
const gForce = {
  type: 'gForce',
  maxIteration: 1000,
  // center: [200, 200], // The center of the graph by default
  linkDistance: 1,
  nodeStrength: 1000,
  edgeStrength: 200,
  nodeSize: 30,
  onTick: () => {
    console.log('ticking')
  },
  onLayoutEnd: () => {
    console.log('force layout done')
  },
  workerEnabled: true, // Whether to activate web-worker
  gpuEnabled: true,
}

// const radial = {
//   type: 'radial',
//   center: [200, 200], // The center of the graph by default
//   linkDistance: 50, // The edge length
//   maxIteration: 1000,
//   focusNode: 'node11',
//   unitRadius: 100,
//   preventOverlap: true, // nodeSize or size in data is required for preventOverlap: true
//   nodeSize: 30,
//   strictRadial: false,
//   workerEnabled: true, // Whether to activate web-worker
// }

export const G6Layout: LayoutEngine = {
  // G6 Layout
  name: 'G6',
  options: {},

  apply: (
    nodes: Node[],
    edges: Edge[],
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,
  ): void => {
    const graph = new G6.Graph({
      container: 'layout-dummy',
      width: 500,
      height: 500,
      layout: gForce,
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
