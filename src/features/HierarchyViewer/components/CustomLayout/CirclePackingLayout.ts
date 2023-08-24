import { Core } from 'cytoscape'
import { IdType } from '../../../../models/IdType'
import NetworkFn, { Edge, Network } from '../../../../models/NetworkModel'

export const createTree = (rootNodeId: IdType, dag: Network): void => {
  const children = getPredecessors(dag, rootNodeId)
  console.log('children', children)
}

/**
 * Return the branch of the network rooted at the given node
 *
 * @param network
 * @param nodeId
 * @returns Edge list of the children of the node
 */
export const getPredecessors = (network: Network, nodeId: IdType): Edge[] => {
  // Get the internal data store. In this case, it is a cytoscape instance
  const cyNet: Core = NetworkFn.getInternalNetworkDataStore(network) as Core

  // Get the selected node
  const node = cyNet.getElementById(nodeId)

  // Find root
  const roots = cyNet.nodes().roots()
  if (roots.size() !== 1) {
    throw new Error('There should be only one root node')
  }

  const root = roots[0]
  const rootNodeId: IdType = root.id()

  console.log('##The RTel', root.data(), rootNodeId)

  const edges: Edge[] = []

  const successors = node.successors()
  const predecessors = node.predecessors()
  console.log('##Roots, s, p', roots.size(), successors, predecessors)
  successors.forEach((element) => {
    if (element.isEdge()) {
      edges.push({
        id: element.id(),
        s: element.source().id(),
        t: element.target().id(),
      })
    }
  })
  // const parents = node.predecessors().map((element) => ({ id: element.id() }))

  return edges
}
