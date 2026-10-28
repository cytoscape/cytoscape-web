// @vitest-environment node
import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { readCx2ElementCounts } from './cx2ElementCounts'

const FIXTURE = path.resolve(
  __dirname,
  '../../../../test/fixtures/cx2/valid/small-network.valid.cx2',
)

const cx2Head = (metaData: unknown): string =>
  JSON.stringify([
    { CXVersion: '2.0', hasFragments: false },
    { metaData },
    { nodes: [{ id: 1 }] },
  ])

describe('readCx2ElementCounts', () => {
  it('reads the node and edge counts of a real CX2 file', () => {
    // Pretty-printed, as Cytoscape Desktop writes it.
    expect(readCx2ElementCounts(readFileSync(FIXTURE, 'utf8'))).toEqual({
      nodeCount: 20,
      edgeCount: 30,
    })
  })

  it('needs only the start of the file', () => {
    const text = readFileSync(FIXTURE, 'utf8')
    // The aspect's key, not the metaData entry that names it
    const end = text.search(/"attributeDeclarations"\s*:/)
    expect(end).toBeGreaterThan(0)
    expect(readCx2ElementCounts(text.slice(0, end))).toEqual({
      nodeCount: 20,
      edgeCount: 30,
    })
  })

  it('reads compact JSON', () => {
    const head = cx2Head([
      { name: 'nodes', elementCount: 7 },
      { name: 'edges', elementCount: 9 },
    ])
    expect(readCx2ElementCounts(head)).toEqual({ nodeCount: 7, edgeCount: 9 })
  })

  it('reports nothing when the metaData aspect is cut off', () => {
    const head = cx2Head([
      { name: 'nodes', elementCount: 7 },
      { name: 'edges', elementCount: 9 },
    ])
    const cut = head.slice(0, head.indexOf('"edges"'))
    expect(readCx2ElementCounts(cut)).toEqual({})
  })

  it.each([
    [
      'no metaData aspect',
      JSON.stringify([{ CXVersion: '2.0' }, { nodes: [] }]),
    ],
    ['not JSON', 'id,name\n1,a\n'],
    ['an empty file', ''],
  ])('reports nothing for %s', (_case, head) => {
    expect(readCx2ElementCounts(head)).toEqual({})
  })

  it('leaves out a count the metaData does not give', () => {
    const head = cx2Head([
      { name: 'nodes', elementCount: 7 },
      { name: 'edges' },
    ])
    expect(readCx2ElementCounts(head)).toEqual({ nodeCount: 7 })
  })

  it.each([
    ['negative', -1],
    ['fractional', 2.5],
    ['a string', '12'],
  ])('ignores a count that is %s', (_case, elementCount) => {
    const head = cx2Head([
      { name: 'nodes', elementCount },
      { name: 'edges', elementCount: 9 },
    ])
    expect(readCx2ElementCounts(head)).toEqual({ edgeCount: 9 })
  })

  it('is not fooled by brackets or the key inside strings', () => {
    const head = JSON.stringify([
      { CXVersion: '2.0', note: 'see {"metaData":[{"name":"nodes"}]}' },
      {
        metaData: [
          { name: 'nodes', elementCount: 3, properties: [{ a: 'x]}]' }] },
          { name: 'edges', elementCount: 4 },
        ],
      },
    ])
    expect(readCx2ElementCounts(head)).toEqual({ nodeCount: 3, edgeCount: 4 })
  })
})
