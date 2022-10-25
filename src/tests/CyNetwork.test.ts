import NetworkFn, { Network, Node, Edge } from '../newModels/NetworkModel'

import 'isomorphic-fetch'

test('create CyNetwork objects', () => {
  const net1: Network = NetworkFn.createNetwork('test')
  expect(net1).toBeDefined()
  expect(net1.id).toBe('test')

  const nodeCont = 10
  for (let i = 0; i < nodeCont; i++) {
    NetworkFn.addNode(net1, `node${i}`)
  }
  const nodes = NetworkFn.nodes(net1)
  expect(nodes).toBeDefined()
  expect(nodes.length).toBe(nodeCont)

  // Create from CX JSON
  // const net2: Network = NetworkFn.createNetworkFromCx('test')

  // Create from Cytroscape.js

  // Create from SIF / Edge list
})
