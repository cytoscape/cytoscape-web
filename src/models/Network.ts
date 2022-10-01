import { Row } from './Table'

export interface GraphObject {
  readonly id: BigInt

  // Returns all attribute values associated with this node/edge
  getAttributes: () => Row
}

export interface Edge extends GraphObject {
  s: BigInt // Source node ID
  t: BigInt // Target node ID
  type: string // Edge type ("interaction" in Cytoscape desktop)
}

export interface Node extends GraphObject {
  // Utility function to get human-readable name
  getName?: () => string
}

export interface NetworkModel {
  id: BigInt
  attributes: Row // Or special object??
  nodes: Node[]
  edges: Edge[]
}

export abstract class Network {
  private _model: NetworkModel

  constructor(model: NetworkModel) {
    this._model = model
  }

  getNodes = (): Node[] => this._model.nodes
  getEdges = (): Edge[] => this._model.edges

  addNodes = (nodes: Node[]): void => {}
  deleteNodes = (nodes: Node[]): void => {}

  addEdges = (edges: Edge[]): void => {}
  deleteEdges = (edges: Edge[]): void => {}

  // Utility functions
}

export class CyjsNetwork extends Network {
  private _cyjs: any // This is the Cytoscape.js instance

  constructor(model: NetworkModel) {
    super(model)
  }

  // Add more functions here...
}

export class NetworkFactory {
  /**
   * Create an empty Cytoscape.js network
   *
   * @param id
   * @returns
   */
  static createNetwork(id: BigInt): Network {
    const attr: Row = {
      key: id,
      data: {},
    }
    const model: NetworkModel = {
      id,
      attributes: attr,
      nodes: [],
      edges: [],
    }

    return new CyjsNetwork(model)
  }

  // Add more useful factory methods here. e.g. createNetworkFromCyjsJson()

  // Need CX2 type definition
  static createNetworkFromCx(cx: []): Network {
    // TODO: cx->model

    // UUID to BigInt
    const id = BigInt(0)
    const attr: Row = {
      key: id,
      data: {},
    }
    const model: NetworkModel = {
      id,
      attributes: attr,
      nodes: [],
      edges: [],
    }

    return new CyjsNetwork(model)
  }
}
