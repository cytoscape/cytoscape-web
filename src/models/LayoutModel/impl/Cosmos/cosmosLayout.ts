import { IdType } from '../../../IdType'
import { Edge, Node } from '../../../NetworkModel'
import { LayoutEngine } from '../../LayoutEngine'
import { CosmosAlgorithms } from './Algorithms/cosmosAlgorithms'

// The simulation runs off-screen: the container is never attached to the DOM.
const dummyContainer: HTMLDivElement = document.createElement('div')
dummyContainer.style.display = 'none'
dummyContainer.id = 'cosmosContainer'

// Matches @cosmograph/cosmos 1.x, which this engine used before #913, so
// layouts keep their scale: a 4096 x 4096 space (2.x defaults to 8192), with
// every point seeded within 0.5% of its center for repulsion to spread out.
const SPACE_SIZE = 4096
const SEED_MIN = 0.495
const SEED_SPREAD = 0.01

export interface CosmosInput {
  pointPositions: Float32Array
  links: Float32Array
}

/**
 * Converts nodes and edges to the index-based arrays @cosmos.gl/graph takes.
 * Point i is nodes[i]; an edge whose source or target is not among the nodes
 * is dropped rather than passed on as an undefined index.
 */
export const toCosmosInput = (
  nodes: Node[],
  edges: Edge[],
  random: () => number = Math.random,
): CosmosInput => {
  const indexById = new Map<IdType, number>()
  const pointPositions = new Float32Array(nodes.length * 2)
  nodes.forEach((node, i) => {
    indexById.set(node.id, i)
    pointPositions[i * 2] = SPACE_SIZE * (SEED_MIN + random() * SEED_SPREAD)
    pointPositions[i * 2 + 1] = SPACE_SIZE * (SEED_MIN + random() * SEED_SPREAD)
  })

  const links: number[] = []
  edges.forEach((edge) => {
    const source = indexById.get(edge.s)
    const target = indexById.get(edge.t)
    if (source !== undefined && target !== undefined) {
      links.push(source, target)
    }
  })

  return { pointPositions, links: new Float32Array(links) }
}

/**
 * Maps the positions @cosmos.gl/graph reports ([x0, y0, x1, y1, ...]) back to
 * node ids, scaled up 10x for the network view.
 */
export const fromCosmosPositions = (
  nodes: Node[],
  positions: ArrayLike<number>,
): Map<IdType, [number, number]> => {
  const positionMap = new Map<IdType, [number, number]>()
  nodes.forEach((node, i) => {
    positionMap.set(node.id, [positions[i * 2] * 10, positions[i * 2 + 1] * 10])
  })
  return positionMap
}

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
    return import('@cosmos.gl/graph').then(({ Graph }) => {
      const { simulation } = CosmosAlgorithms.cosmos.parameters
      const graph = new Graph(dummyContainer, {
        spaceSize: SPACE_SIZE,
        rescalePositions: false,
        fitViewOnInit: false,
        simulationLinkSpring: simulation.linkSpring,
        simulationLinkDistance: simulation.linkDistance,
        simulationRepulsion: simulation.repulsion,
        simulationGravity: simulation.gravity,
      })

      const { pointPositions, links } = toCosmosInput(nodes, edges)
      graph.setPointPositions(pointPositions)
      graph.setLinks(links)
      graph.render()

      return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          try {
            graph.pause()
            afterLayout(fromCosmosPositions(nodes, graph.getPointPositions()))
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
