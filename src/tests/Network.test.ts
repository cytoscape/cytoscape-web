import * as NetworkFn from '../newModels/Network/network-functions'
import { Network } from '../newModels/Network'
import { Node } from '../newModels/Network/Node'

import 'isomorphic-fetch'
import { Cx2 } from '../utils/cx/Cx2'
import * as cxUtil from '../utils/cx/cx2-util'
import { MetaDataValue } from '../utils/cx/Cx2/MetaData'
import { GraphStore } from '../newModels/Network/GraphStore'
import { Core } from 'cytoscape'
import { Table } from '../newModels/Table'
import { Edge } from '../newModels/Network/Edge'


test('create an empty network', () => {
  const net1: Network = NetworkFn.createNetwork('test')
  expect(net1).toBeDefined()
  expect(net1.id).toBe('test')

  const nodeCont = 10
  for (let i = 0; i < nodeCont; i++) {
    const newNode = { id: `node${i}` }
    NetworkFn.addNode(net1, newNode)
  }
  const nodes = NetworkFn.nodes(net1)
  expect(nodes).toBeDefined()
  expect(nodes.length).toBe(nodeCont)
})

test('load a network from remote', async () => {
  const MUSIC_URL =
    'https://public.ndexbio.org/v3/networks/7fc70ab6-9fb1-11ea-aaef-0ac135e8bacf'

  const response = await fetch(MUSIC_URL)

  if (!response.ok) {
    throw new Error(`Error! status: ${response.status}`)
  }

  const cx: Cx2 = await response.json()
  expect(cx).toBeDefined()
  expect(Array.isArray(cx)).toBe(true)
  expect(cx.length).toBe(13)
  
  const networkAttributes = cxUtil.getNetworkAttributes(cx)
  console.log(JSON.stringify(networkAttributes))
  const metaData: MetaDataValue[] = cxUtil.getMetaData(cx)
  console.log(metaData)

  const nodeCountEntry: MetaDataValue[] = metaData.filter((m) => m.name === 'nodes')
  expect(nodeCountEntry.length).toBe(1)
  const nodeCount: number = nodeCountEntry[0].elementCount as number
  
  const edgeCountEntry: MetaDataValue[] = metaData.filter((m) => m.name === 'edges')
  expect(edgeCountEntry.length).toBe(1)
  const edgeCount: number = edgeCountEntry[0].elementCount as number


  const netAndTable: [Network, Table] = NetworkFn.createNetworkFromCx(cx, 'music')
  expect(netAndTable).toBeDefined()
  expect(netAndTable.length).toBe(2)
  const net2: Network = netAndTable[0]
  const table: Table = netAndTable[1]
  expect(net2).toBeDefined()
  expect(net2.id).toBe('music')

  const nodes: Node[] = NetworkFn.nodes(net2)
  expect(nodes.length).toBe(nodeCount)
  
  const edges: Edge[] = NetworkFn.edges(net2)
  expect(edges.length).toBe(edgeCount)

})