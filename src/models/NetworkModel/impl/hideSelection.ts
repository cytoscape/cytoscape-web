import { IdType } from '../../IdType'
import { Edge } from '../Edge'

/**
 * The nodes and edges that "Hide Selected Nodes and Edges" hides
 */
export interface ElementsToHide {
  readonly nodeIds: IdType[]
  readonly edgeIds: IdType[]
}

/**
 * What Cytoscape Desktop's "Hide Selected Nodes and Edges" hides: the
 * selected nodes, every edge connected to one of them (selected or not), and
 * the selected edges. Each id appears once, in the order given.
 *
 * @param edges Every edge of the network
 * @param selectedNodes The selected node ids
 * @param selectedEdges The selected edge ids
 */
export const getElementsToHide = (
  edges: readonly Edge[],
  selectedNodes: readonly IdType[],
  selectedEdges: readonly IdType[],
): ElementsToHide => {
  const nodeIds = [...new Set(selectedNodes)]
  const nodeSet = new Set(nodeIds)
  const edgeSet = new Set(selectedEdges)
  if (nodeSet.size > 0) {
    edges.forEach((edge) => {
      if (nodeSet.has(edge.s) || nodeSet.has(edge.t)) edgeSet.add(edge.id)
    })
  }
  return { nodeIds, edgeIds: [...edgeSet] }
}
