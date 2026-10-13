import type { IdType } from '../../IdType'
import type { Edge } from '../../NetworkModel/Edge'
import type { Network } from '../../NetworkModel/Network'
import { DegreeEdgeType } from '../FilterTree'

/**
 * The edges at one node, by direction
 */
export interface NodeEdges {
  // Edges whose target is the node
  readonly incoming: Edge[]
  // Edges whose source is the node
  readonly outgoing: Edge[]
  // Every edge at the node, a self-loop once
  readonly any: Edge[]
}

/**
 * Index the edges of a network by node, for degree and topology conditions.
 *
 * CW edges carry no directed flag, so every edge counts as directed from its
 * source to its target. A self-loop is both incoming and outgoing, and is
 * listed once among `any`, as Cytoscape Desktop counts it.
 */
export const buildAdjacency = (network: Network): Map<IdType, NodeEdges> => {
  const adjacency = new Map<IdType, NodeEdges>()
  const edgesOf = (nodeId: IdType): NodeEdges => {
    let entry = adjacency.get(nodeId)
    if (entry === undefined) {
      entry = { incoming: [], outgoing: [], any: [] }
      adjacency.set(nodeId, entry)
    }
    return entry
  }
  network.nodes.forEach((node) => edgesOf(node.id))
  network.edges.forEach((edge) => {
    const source = edgesOf(edge.s)
    const target = edgesOf(edge.t)
    source.outgoing.push(edge)
    target.incoming.push(edge)
    source.any.push(edge)
    if (edge.t !== edge.s) {
      target.any.push(edge)
    }
  })
  return adjacency
}

/**
 * The number of edges of a node of the given direction
 */
export const degreeOf = (
  adjacency: Map<IdType, NodeEdges>,
  nodeId: IdType,
  edgeType: DegreeEdgeType,
): number => {
  const entry = adjacency.get(nodeId)
  if (entry === undefined) return 0
  switch (edgeType) {
    case DegreeEdgeType.INCOMING:
      return entry.incoming.length
    case DegreeEdgeType.OUTGOING:
      return entry.outgoing.length
    default:
      return entry.any.length
  }
}
