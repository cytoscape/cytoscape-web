import { Network } from '.'
import { Row } from '../Table/Row'
import { CyjsNetwork } from './CyjsNetwork'
import { NetworkModel } from './NetworkModel'

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
