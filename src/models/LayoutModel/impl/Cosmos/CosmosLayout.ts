import { Graph } from '@cosmograph/cosmos'
import { IdType } from '../../../IdType'
import { Node, Edge } from '../../../NetworkModel'
import { LayoutAlgorithm } from '../../LayoutAlgorithm'
import { LayoutEngine } from '../../LayoutEngine'
import { CosmosAlgorithms } from './Algorithms/CosmosAlgorithms'

const dummyContainer: HTMLCanvasElement = document.createElement('canvas')
dummyContainer.style.display = 'none'
// dummyContainer.style.width = '80vw'
// dummyContainer.style.height = '80vh'
dummyContainer.id = 'cosmosContainer'

export const CosmosLayout: LayoutEngine = {
  // Cosmos Layout
  name: 'Cosmos',
  description: 'Cosmos Graph Visualization Engine.',
  defaultAlgorithmName: 'Cosmos',
  algorithmNames: Object.keys(CosmosAlgorithms),
  getAlgorithm: (name: string): LayoutAlgorithm => {
    // There is only one algorithm for Cosmos.
    return CosmosAlgorithms.Cosmos
  },

  apply: (
    nodes: Node[],
    edges: Edge[],
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,
    algorithmName?: string,
  ): void => {
    const config = CosmosAlgorithms.cosmos.parameters
    const graph = new Graph(dummyContainer, config)

    const cNodes = nodes.map((node) => {
      return {
        id: node.id,
      }
    })

    const links = edges.map((edge) => {
      return {
        source: edge.s,
        target: edge.t,
      }
    })
    graph.setData(cNodes, links)

    setTimeout(() => {
      graph.pause()
      const posMap = graph.getNodePositionsMap()

      const scaledPosMap = new Map<IdType, [number, number]>()
      posMap.forEach((value, key) => {
        scaledPosMap.set(key, [value[0] * 10, value[1] * 10])
      })
      afterLayout(scaledPosMap)
      console.log('COSMOS.stop() called)))))))))))))))', scaledPosMap, graph)
      graph.destroy()
    }, 4000)
  },
}
