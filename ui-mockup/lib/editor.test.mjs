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

const { resolveMapping, assignCategory, fitDomain } =
  await import('./mappings.ts')

test('continuous mappings interpolate, clamp and fall back on missing data', () => {
  const m = {
    enabled: true,
    kind: 'continuous',
    attribute: 'score',
    domain: [0, 10],
    range: [1, 5],
    entries: [],
  }
  assert.equal(resolveMapping(m, { score: '5' }, 2), 3)
  assert.equal(resolveMapping(m, { score: '20' }, 2), 5)
  assert.equal(resolveMapping(m, { score: '' }, 2), 2)
  assert.equal(resolveMapping({ ...m, enabled: false }, { score: '5' }, 2), 2)
  assert.equal(resolveMapping({ ...m, domain: [2, 2] }, { score: '5' }, 2), 2)
  assert.equal(
    resolveMapping(
      { ...m, range: ['#000000', '#ffffff'] },
      { score: '5' },
      '#737373',
    ),
    '#808080',
  )
})

test('discrete assignments move categories between output rows without mutation', () => {
  const entries = [
    { id: 'a', value: 12, categories: ['kinase', 'adaptor'] },
    { id: 'b', value: 24, categories: [] },
  ]
  const next = assignCategory(entries, 'b', 'kinase', true)
  assert.deepEqual(next[0].categories, ['adaptor'])
  assert.deepEqual(next[1].categories, ['kinase'])
  assert.deepEqual(entries[0].categories, ['kinase', 'adaptor'])
  const m = {
    enabled: true,
    kind: 'discrete',
    attribute: 'type',
    entries: next,
    domain: [0, 1],
    range: [1, 5],
  }
  assert.equal(resolveMapping(m, { type: 'kinase' }, 8), 24)
  assert.equal(resolveMapping(m, { type: 'unknown' }, 8), 8)
})

test('domain fitting ignores blanks and invalid values, expanding constant data', () => {
  assert.deepEqual(
    fitDomain([{ x: '' }, { x: '-2' }, { x: '4' }, { x: 'bad' }], 'x'),
    [-2, 4],
  )
  assert.deepEqual(fitDomain([{ x: '3' }], 'x'), [3, 4])
  assert.deepEqual(fitDomain([], 'x'), [0, 1])
})

const { snapSpreadsheetHeight } = await import('./pane-layout.ts')
test('pane divider snaps near landmarks and reaches both extremes', () => {
  assert.equal(snapSpreadsheetHeight(3), 0)
  assert.equal(snapSpreadsheetHeight(97), 100)
  assert.equal(snapSpreadsheetHeight(48), 50)
  assert.equal(snapSpreadsheetHeight(32), 33)
  assert.equal(snapSpreadsheetHeight(58), 58)
  assert.equal(snapSpreadsheetHeight(-10), 0)
  assert.equal(snapSpreadsheetHeight(120), 100)
})

const { scrollToRevealRow } = await import('./pane-layout.ts')
test('revealing a row scrolls only as needed and accounts for sticky headings', () => {
  assert.equal(scrollToRevealRow(0, 200, 30, 600, 32), 432)
  assert.equal(scrollToRevealRow(400, 200, 30, 300, 32), 270)
  assert.equal(scrollToRevealRow(400, 200, 30, 480, 32), 400)
})
