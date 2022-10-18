import { Network } from '.'
import { IdType } from '../IdType'

import Cytoscape from 'cytoscape'
import { Node } from './Node'
import { Edge } from './Edge'

export const createNetwork = (id: IdType): Network => ({
  id,
  model: new Cytoscape({
    headless: true,
  }),
})

// export const createCyNetwork = (id: IdType): Network => {
//   const cy = cytoscape({
//     headless: true,
//   })

//   return {
//     id,
//     nodes: cy.nodes().map((node: any) => ({id: node.data('id')} as Node)),
//     edges: cy.edges().map((edge: any) => (
//       {
//         id: edge.data('id'),
//         s: edge.data('source'),
//         t: edge.data('target'),
//       } as Edge))
//   }
// }

export const nodes = (network: Network): Node[] => {
  return network.model
    .nodes()
    .map((node: any) => ({ id: node.data('id') } as Node))
}

// export const createNetworkFromCx(cx: []): Network => {
// }
