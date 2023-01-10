import { Node } from '../Cx2/CoreAspects/Node'
import { Edge } from '../Cx2/CoreAspects/Edge'
import { NetworkAttributeValue } from '../Cx2/CoreAspects/NetworkAttributes'

export interface Cx2Core {
  networkAttributes: NetworkAttributeValue

  nodes: {
    [id: number]: Node
    x?: number
    y?: number
    z?: number
  }

  edges: {
    [id: number]: Edge
  }

  // opaqueAspects: Map<string, object[]>
}

export type Cx2Network = Cx2Core & { [key: string]: object[] | object }
