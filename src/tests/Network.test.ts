import * as NetworkFn from '../newModels/Network/network-functions'
import { Network } from '../newModels/Network'

test('create an empty network', () => {
  const net1: Network = NetworkFn.createNetwork('test')
  expect(net1).toBeDefined()
  expect(net1.id).toBe('test')

  const nodeCont = 10
  for(let i=0; i<nodeCont; i++) {
    const newNode = { id: `node${i}` }
    NetworkFn.addNode(net1, newNode)
  }
  const nodes = NetworkFn.nodes(net1)
  expect(nodes).toBeDefined()
  expect(nodes.length).toBe(nodeCont)
  console.log(nodes)
});