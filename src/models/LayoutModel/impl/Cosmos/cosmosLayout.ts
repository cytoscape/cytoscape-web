import { IdType } from '../../../IdType'
import { Edge, Node } from '../../../NetworkModel'
import { LayoutEngine } from '../../LayoutEngine'
import { CosmosAlgorithms } from './Algorithms/cosmosAlgorithms'

const dummyContainer: HTMLCanvasElement = document.createElement('canvas')
dummyContainer.style.display = 'none'
dummyContainer.id = 'cosmosContainer'

export const CosmosLayout: LayoutEngine = {
  // Cosmos Layout
  name: 'Cosmos',
  description: 'Cosmos Graph Visualization Engine.',
  defaultAlgorithmName: 'Cosmos',
  algorithms: CosmosAlgorithms,

  apply: (
    nodes: Node[],
    edges: Edge[],
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,
  ): Promise<void> => {
    return import('@cosmograph/cosmos').then(({ Graph }) => {
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

      return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          try {
            graph.pause()
            const posMap = graph.getNodePositionsMap()

            const scaledPosMap = new Map<IdType, [number, number]>()
            posMap.forEach((value, key) => {
              scaledPosMap.set(key, [value[0] * 10, value[1] * 10])
            })
            afterLayout(scaledPosMap)
            resolve()
          } catch (err) {
            reject(err)
          }
        }, 2400)
      }).finally(() => {
        graph.destroy()
      })
    })
  },
}
