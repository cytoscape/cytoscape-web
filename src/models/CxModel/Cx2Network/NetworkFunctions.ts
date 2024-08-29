import { Node } from '../Cx2/CoreAspects/Node'
import { Edge } from '../Cx2/CoreAspects/Edge'
import { NetworkAttributeValue } from '../Cx2/CoreAspects/NetworkAttributes'
import { CxValue } from '../Cx2/CxValue'

export type GraphObject = Node | Edge
export type getObject<ID, T> = (id: ID) => T
export type getObjects<T> = (key: string, value: string) => T[]
export type getAttribute<T extends GraphObject> = (
  obj: T,
  attributeName: string,
) => CxValue

export interface NetworkFunctions {
  getNetworkAttribute: (attributeName: string) => NetworkAttributeValue

  getNodeAttribute: getAttribute<Node>
  getEdgeAttribute: getAttribute<Edge>

  getNode: getObject<number, Node>
  getNodes: getObjects<Node>

  getEdge: getObject<number, Edge>
  getEdges: getObjects<Edge>
}
