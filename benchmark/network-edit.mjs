// Topology-editing sweep: NetworkFn over the headless cytoscape store, at
// BENCH_N scale.
//
//   node --import tsx benchmark/network-edit.mjs
//   BENCH_OP=round-trip node --import tsx benchmark/network-edit.mjs
//
// What would make these numbers move: `NetworkFn` mutates a private headless
// cytoscape Core in place, so adds track cytoscape's element-creation cost
// and deletes additionally pay for building an `#id, #id, …` selector string
// and parsing it (`deleteNodes`/`deleteEdges` — a real implementation choice
// this row would catch a fix to). The getter rows measure what every
// `putNetworkToDb` silently pays: `network.nodes` / `network.edges` are live
// getters that materialize the whole topology (`cy.nodes().map(...)`) on
// every read.
//
// Methodology: mutations are reversible round-trips (add + delete of the
// same batch) on dedicated instances, so the graph is in the same state at
// the start of every iteration — the v4 mutators convention. Construction
// rows build and discard whole instances inside the timed region, exactly
// what network load does. `control` builds the same defs array without
// touching cytoscape.

import './bench-env.mjs'
import { bench, group, summary, do_not_optimize } from 'mitata'
import { finishRun } from './bench-run.mjs'
import { N, E } from './fixture.mjs'

const NetworkFn = (await import('@/models/NetworkModel')).default

const OP = process.env.BENCH_OP
const has = (name) => OP == null || name.includes(OP)

console.log(`\n== network-edit sweep (N=${N} nodes, ${E} edges) ==`)

// operands resolved outside the timed region
const nodeIds = Array.from({ length: N }, (_, j) => String(j))
const nodes = nodeIds.map((id) => ({ id }))
const edges = Array.from({ length: E }, (_, j) => ({
  id: `e${j}`,
  s: String(j % N),
  t: String((j + 1) % N),
}))

const BATCH = Math.max(1, Math.floor(N / 10))
const batchNodeIds = Array.from({ length: BATCH }, (_, j) => `bn${j}`)
const batchEdges = Array.from({ length: BATCH }, (_, j) => ({
  id: `be${j}`,
  s: String(j % N),
  t: String((j + 3) % N),
}))

if (has('network-edit: construct')) {
  for (let w = 0; w < 8; w++) {
    do_not_optimize(NetworkFn.createNetworkFromLists(`warm-${w}`, nodes, edges))
  }

  let c = 0

  group('network-edit: construct', () => {
    summary(() => {
      bench('createNetworkFromLists (construct)', () => {
        return do_not_optimize(
          NetworkFn.createNetworkFromLists(`bench-${c++}`, nodes, edges),
        )
      })
      bench('control', () => {
        return do_not_optimize(
          nodes.map((n) => ({ group: 'nodes', data: { id: n.id } })),
        )
      })
    })
  })
}

// dedicated instances for the mutation rows — reversible round-trips keep
// them at N nodes / E edges at the start of every iteration
const nodeRoundTripNet = NetworkFn.createNetworkFromLists('rt-n', nodes, edges)
const edgeRoundTripNet = NetworkFn.createNetworkFromLists('rt-e', nodes, edges)

if (has('network-edit: round-trip')) {
  for (let w = 0; w < 8; w++) {
    NetworkFn.addNodes(nodeRoundTripNet, batchNodeIds)
    NetworkFn.deleteNodes(nodeRoundTripNet, batchNodeIds)
    NetworkFn.addEdges(edgeRoundTripNet, batchEdges)
    NetworkFn.deleteEdges(
      edgeRoundTripNet,
      batchEdges.map((e) => e.id),
    )
  }

  group(`network-edit: round-trip (batch of ${BATCH})`, () => {
    summary(() => {
      bench('addNodes + deleteNodes', () => {
        NetworkFn.addNodes(nodeRoundTripNet, batchNodeIds)
        NetworkFn.deleteNodes(nodeRoundTripNet, batchNodeIds)
      })
      bench('addEdges + deleteEdges', () => {
        NetworkFn.addEdges(edgeRoundTripNet, batchEdges)
        NetworkFn.deleteEdges(
          edgeRoundTripNet,
          batchEdges.map((e) => e.id),
        )
      })
      bench('control', () => {
        return do_not_optimize(batchNodeIds.map((id) => `#${id}`).join(', '))
      })
    })
  })
}

const readNet = NetworkFn.createNetworkFromLists('read', nodes, edges)

if (has('network-edit: getters')) {
  for (let w = 0; w < 8; w++) {
    do_not_optimize(readNet.nodes)
    do_not_optimize(readNet.edges)
  }

  group('network-edit: getters (what putNetworkToDb pays)', () => {
    summary(() => {
      bench('network.nodes (materialize)', () => {
        return do_not_optimize(readNet.nodes)
      })
      bench('network.edges (materialize)', () => {
        return do_not_optimize(readNet.edges)
      })
      bench('control', () => {
        return do_not_optimize(nodeIds.map((id) => ({ id })))
      })
    })
  })
}

await finishRun('network-edit')
