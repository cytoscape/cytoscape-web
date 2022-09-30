import { NetworkView } from '.'
import { Node } from '../Network/Node'
import { Network } from '../Network'
import { VisualStyle } from '../VisualMapping/VisualStyle'
import { View } from './View'
import { Position } from './Position'
import { Edge } from '../Network/Edge'

export class NetworkViewFactory {
  public static createNetworkView(
    network: Network,
    style?: VisualStyle,
  ): NetworkView {

    const nodeViews: View[] = network.getNodes().map((node: Node) => createNodeView(node))
    const edgeViews: View[] = network.getEdges().map((edge: Edge) => createEdgeView(edge))

    const view: NetworkView = {
      nodeViews,
      edgeViews,
    }
    return view
  }
}

/**
 * Create an empty view for the given node
 * 
 * @param node 
 * @returns 
 */
const createNodeView = (node: Node): View => {
  const position: Position = {
    x: 0,
    y: 0
  }

  return {
    key: node.id,
    visualProperties: [
      {
        name: 'position',
        value: position
      }
    ],
  }
}

const createEdgeView = (edge: Edge): View => {
  return {
    key: edge.id,
    visualProperties: []
  }
}