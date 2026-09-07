import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addNode,
  addEdge,
  addColumn,
  renameColumn,
  sortRows,
  makeFixtures,
} from './editor.ts'

test('blank drafts never create nodes; a committed node updates only its network', () => {
  const networks = makeFixtures()
  assert.throws(() => addNode(networks.egfr, ''), /name/)
  const next = addNode(networks.egfr, 'NEW1')
  assert.equal(next.nodes.length, networks.egfr.nodes.length + 1)
  assert.equal(next.nodes.at(-1).name, 'NEW1')
  assert.equal(
    networks.egfr.nodes.some((n) => n.name === 'NEW1'),
    false,
  )
})

test('edge drafts require existing endpoints and keep stable IDs after rename', () => {
  const n = makeFixtures().egfr
  assert.throws(() => addEdge(n, n.nodes[0].id, ''), /source and target/)
  assert.throws(() => addEdge(n, 'missing', n.nodes[0].id), /source and target/)
  const next = addEdge(n, n.nodes[0].id, n.nodes[1].id)
  assert.equal(next.edges.length, n.edges.length + 1)
  assert.equal(next.edges.at(-1).source, n.nodes[0].id)
})

test('column names are unique, IDs remain stable when headings are renamed', () => {
  const n = makeFixtures().egfr
  assert.throws(() => addColumn(n, 'nodes', 'name'), /exists/)
  assert.throws(() => addColumn(n, 'nodes', '  '), /name/)
  const withColumn = addColumn(n, 'nodes', 'Evidence')
  const renamed = renameColumn(withColumn, 'nodes', 'name', 'Gene symbol')
  assert.equal(renamed.columns.nodes[0].key, 'name')
  assert.equal(renamed.columns.nodes[0].label, 'Gene symbol')
  assert.equal(renamed.nodes[0].name, n.nodes[0].name)
})

test('numeric sort is numeric and non-mutating', () => {
  const rows = [{ score: '10' }, { score: '2' }, { score: '-1' }]
  assert.deepEqual(
    sortRows(rows, 'score', 'asc').map((r) => r.score),
    ['-1', '2', '10'],
  )
  assert.equal(rows[0].score, '10')
})
