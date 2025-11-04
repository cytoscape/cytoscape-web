/**
 * Network Model Converter from CX2
 *
 * Converts CX2 format data to NetworkModel.
 */
import { IdType } from '../../../IdType'
import { Network, Node, Edge } from '../../../NetworkModel'
import NetworkFn from '../../../NetworkModel'
import { addNodes, addEdges } from '../../../NetworkModel/impl/NetworkImpl'
import { Cx2 } from '../../Cx2'
import { Node as CxNode } from '../../Cx2/CoreAspects/Node'
import { Edge as CxEdge } from '../../Cx2/CoreAspects/Edge'
import * as cxUtil from '../../extractor'

// cy.js does not allow nodes and edges to have the same ids
// when converting cx ids to cy ids, we add a prefix to edges
export const translateCXEdgeId = (id: IdType): IdType => `e${id}`

/**
 * Create a network from a CX2 object
 *
 * @param id - Network ID
 * @param cx - CX2 data object
 * @returns Network instance
 */
export const createNetworkFromCx = (id: IdType, cx: Cx2): Network => {
  // Create an empty network
  let network: Network = NetworkFn.createNetwork(id)

  // Extract nodes and edges from CX2 object
  const cxNodes: CxNode[] = cxUtil.getNodes(cx)
  const cxEdges: CxEdge[] = cxUtil.getEdges(cx)

  // Convert CX nodes to internal nodes
  const nodes: Node[] = cxNodes.map((node: CxNode) => {
    const n: any = node
    return {
      id: node.id !== undefined ? node.id.toString() : n['@id'].toString(),
    }
  })

  // Convert CX edges to internal edges
  const edges: Edge[] = cxEdges.map((edge: CxEdge) => {
    const eBlob: any = edge
    return {
      id: translateCXEdgeId(
        edge.id !== undefined ? edge.id.toString() : eBlob['@id'].toString(),
      ),
      s: edge.s.toString(),
      t: edge.t.toString(),
    }
  })

  // Add nodes and edges to the network
  network = addNodes(
    network,
    nodes.map((n) => n.id),
  )
  network = addEdges(network, edges)

  return network
}
