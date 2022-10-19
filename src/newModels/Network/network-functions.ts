import { Network } from '.'
import { IdType } from '../IdType'

// @ts-ignore
import * as cytoscape from 'cytoscape'
import { Node } from './Node'
import { Edge } from './Edge'
import { GraphStore } from './GraphStore'

export const createNetwork = (id: IdType): Network => {
  const network: Network & GraphStore<any> = {
    id,
    store: cytoscape({
      headless: true,
    }),
  }
  return network
}

export const addNode = (network: Network, node: Node): Network => {
  const graphImpl = network as Network & GraphStore<any>
  graphImpl.store.add({
    group: 'nodes',
    data: { id: node.id },
  })

  return network
}

export const nodes = (network: Network): Node[] => {
  const cyNetwork = network as Network & GraphStore<any>

  return cyNetwork.store
    .nodes()
    .map((node: any) => ({ id: node.data('id') } as Node))
}
