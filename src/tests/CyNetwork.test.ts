import NetworkFn, { Network } from '../models/NetworkModel'

import 'isomorphic-fetch'
import { Cx2 } from '../utils/cx/Cx2'

import { db } from '../store/persist/db'
import * as cxUtil from '../utils/cx/cx2-util'

import * as cytoscape from 'cytoscape'
import { IndexableType } from 'dexie'

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
})

test('create CyNetwork from CX2', async () => {
  // Small network
  const NET1_ID = '7fc70ab6-9fb1-11ea-aaef-0ac135e8bacf'

  // Large Bioplex (largest for this round)
  // const NET1_ID = 'f7a218c0-2376-11ea-bb65-0ac135e8bacf'

  const NET_URL = `https://public.ndexbio.org/v3/networks/${NET1_ID}`

  let t0 = performance.now()
  const response = await fetch(NET_URL)

  if (!response.ok) {
    throw new Error(`Error! status: ${response.status}`)
  }
  const cx: Cx2 = await response.json()
  console.log(`Download in ${performance.now() - t0} ms`)

  const cxNodes = cxUtil.getNodes(cx)
  const cxNodeCount: number = cxNodes.length

  t0 = performance.now()
  const net1 = NetworkFn.createNetworkFromCx(cx, NET1_ID)
  console.log(`Converted in ${performance.now() - t0} ms`)

  expect(net1).toBeDefined()
  expect(net1.id).toBe(NET1_ID)

  const nodes = NetworkFn.nodes(net1)
  expect(nodes).toBeDefined()
  expect(nodes.length).toBe(cxNodeCount)

  let status = null
  try {
    // Add a CyJS graph
    // @ts-ignore
    const networkStore = net1.store as cytoscape.Core

    let t0 = performance.now()
    await db.cyNetworks.add({
      id: net1.id,
      // @ts-ignore
      nodes: networkStore.nodes().map((n) => ({
        id: n.id(),
      })),
      edges: networkStore.edges().map((e) => ({
        id: e.id(),
        s: e.source().id(),
        t: e.target().id(),
      })),
    })
    console.log(`Added network in ${performance.now() - t0} ms`)

    t0 = performance.now()
    const nodeTable = NetworkFn.nodeTable(net1)
    expect(nodeTable).toBeDefined()

    await db.cyTables.bulkAdd([...nodeTable.rows.values()])

    console.log(`Added table in ${performance.now() - t0} ms`)

    status = `Network and table ${net1.id} successfully added`
  } catch (error: any) {
    status = error
  }

  expect(status).toBeDefined()
  console.log(status)

  const networkFromDB: Network | undefined = await db.cyNetworks.get(net1.id)
  expect(networkFromDB).toBeDefined()
  console.log(`Recovered in ${performance.now() - t0} ms`)

  console.log(networkFromDB)
})
