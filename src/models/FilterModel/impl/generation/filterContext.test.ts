// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type { IdType } from '../../../IdType'
import type { Network } from '../../../NetworkModel/Network'
import type { Table } from '../../../TableModel/Table'
import type { ValueType } from '../../../TableModel/ValueType'
import type { ValueTypeName } from '../../../TableModel/ValueTypeName'
import {
  buildFilterContext,
  CUT_MARK,
  MAX_COLUMN_NAME_LENGTH,
  MAX_CONTEXT_COLUMNS,
  MAX_CONTEXT_LENGTH,
  MAX_SAMPLE_LENGTH,
  MAX_SAMPLES,
} from './filterContext'

const network = (
  nodeIds: IdType[],
  edges: [IdType, IdType, IdType][] = [],
): Network => ({
  id: 'net',
  nodes: nodeIds.map((id) => ({ id })),
  edges: edges.map(([id, s, t]) => ({ id, s, t })),
})

const table = (
  columns: Record<string, ValueTypeName>,
  rows: Record<IdType, Record<string, ValueType>> = {},
): Table => ({
  id: 'table',
  columns: Object.entries(columns).map(([name, type]) => ({ name, type })),
  rows: new Map(Object.entries(rows)),
})

const EMPTY = table({})

describe('buildFilterContext', () => {
  it('reports the size and the degree ranges of the network', () => {
    const context = buildFilterContext(
      network(
        ['a', 'b', 'c'],
        [
          ['e1', 'a', 'b'],
          ['e2', 'a', 'c'],
        ],
      ),
      EMPTY,
      EMPTY,
    )
    expect(context.nodeCount).toBe(3)
    expect(context.edgeCount).toBe(2)
    expect(context.degree).toEqual({
      ANY: [1, 2],
      INCOMING: [0, 1],
      OUTGOING: [0, 2],
    })
  })

  it('describes each column kind', () => {
    const nodes = table(
      {
        name: 'string',
        score: 'double',
        hub: 'boolean',
        go: 'list_of_string',
        weights: 'list_of_integer',
        empty: 'double',
      },
      {
        a: {
          name: 'TP53',
          score: 0.5,
          hub: true,
          go: ['x', 'y'],
          weights: [3, 9],
        },
        b: { name: 'EGFR', score: 2, hub: false, go: ['x'], weights: [-1] },
      },
    )
    const context = buildFilterContext(network(['a', 'b']), nodes, EMPTY)
    expect(context.nodeColumns).toEqual([
      { name: 'name', type: 'string', distinct: 2, samples: ['EGFR', 'TP53'] },
      { name: 'score', type: 'double', range: [0.5, 2] },
      { name: 'hub', type: 'boolean' },
      { name: 'go', type: 'list_of_string', distinct: 2, samples: ['x', 'y'] },
      { name: 'weights', type: 'list_of_integer', range: [-1, 9] },
      { name: 'empty', type: 'double' },
    ])
    expect(context.edgeColumns).toEqual([])
  })

  it('lists the most frequent text values first, ties by value', () => {
    const rows: Record<IdType, Record<string, ValueType>> = {}
    const values = ['c', 'a', 'b', 'b', 'c', 'c', '', 'd']
    values.forEach((value, i) => {
      rows[`n${i}`] = { kind: value }
    })
    const context = buildFilterContext(
      network(Object.keys(rows)),
      table({ kind: 'string' }, rows),
      EMPTY,
    )
    // Empty strings are not values
    expect(context.nodeColumns[0]).toEqual({
      name: 'kind',
      type: 'string',
      distinct: 4,
      samples: ['c', 'b', 'a', 'd'],
    })
  })

  it(`keeps at most ${MAX_SAMPLES} samples and cuts long ones`, () => {
    const rows: Record<IdType, Record<string, ValueType>> = {}
    for (let i = 0; i < 20; i++) rows[`n${i}`] = { label: `value ${i}` }
    rows.long = { label: 'x'.repeat(MAX_SAMPLE_LENGTH + 10) }
    rows.long2 = { label: 'x'.repeat(MAX_SAMPLE_LENGTH + 10) }
    const [column] = buildFilterContext(
      network(Object.keys(rows)),
      table({ label: 'string' }, rows),
      EMPTY,
    ).nodeColumns
    expect(column.distinct).toBe(21)
    expect(column.samples).toHaveLength(MAX_SAMPLES)
    // The long value is the most frequent one
    expect(column.samples?.[0]).toBe(
      `${'x'.repeat(MAX_SAMPLE_LENGTH)}${CUT_MARK}`,
    )
  })

  it('removes control characters from samples', () => {
    const [column] = buildFilterContext(
      network(['a']),
      table({ label: 'string' }, { a: { label: 'a\u0000b\nc\u007fd' } }),
      EMPTY,
    ).nodeColumns
    expect(column.samples).toEqual(['abcd'])
  })

  it('reads own row keys only', () => {
    const [column] = buildFilterContext(
      network(['a']),
      table({ toString: 'string' as ValueTypeName }, { a: {} }),
      EMPTY,
    ).nodeColumns
    expect(column).toEqual({ name: 'toString', type: 'string', distinct: 0 })
  })

  it('leaves out columns with names too long to name', () => {
    const long = 'c'.repeat(MAX_COLUMN_NAME_LENGTH + 1)
    const context = buildFilterContext(
      network([]),
      table({ [long]: 'string', short: 'string' }),
      EMPTY,
    )
    expect(context.nodeColumns.map((column) => column.name)).toEqual(['short'])
    expect(context.nodeColumnsTruncated).toBeUndefined()
  })

  it(`lists at most ${MAX_CONTEXT_COLUMNS} columns per table`, () => {
    const columns: Record<string, ValueTypeName> = {}
    for (let i = 0; i < MAX_CONTEXT_COLUMNS + 5; i++)
      columns[`c${i}`] = 'boolean'
    const context = buildFilterContext(network([]), EMPTY, table(columns))
    expect(context.edgeColumns).toHaveLength(MAX_CONTEXT_COLUMNS)
    expect(context.edgeColumns[0].name).toBe('c0')
    expect(context.edgeColumnsTruncated).toBe(true)
    expect(context.nodeColumnsTruncated).toBeUndefined()
  })

  it(`stays within ${MAX_CONTEXT_LENGTH} characters, dropping samples first`, () => {
    const columns: Record<string, ValueTypeName> = {}
    const row: Record<string, ValueType> = {}
    // 120 text columns of 8 long samples each: far over the limit
    for (let c = 0; c < 120; c++) columns[`text${c}`] = 'list_of_string'
    for (let c = 0; c < 120; c++) {
      row[`text${c}`] = Array.from(
        { length: 8 + (c % 3) },
        (_, i) => `${'v'.repeat(30)}${c}-${i}`,
      )
    }
    const context = buildFilterContext(
      network(['a']),
      table(columns, { a: row }),
      EMPTY,
    )
    expect(JSON.stringify(context).length).toBeLessThanOrEqual(
      MAX_CONTEXT_LENGTH,
    )
    // Every column is still listed; only samples went
    expect(context.nodeColumns).toHaveLength(120)
    expect(context.nodeColumnsTruncated).toBeUndefined()
    const sampled = context.nodeColumns.filter((c) => c.samples !== undefined)
    expect(sampled.length).toBeGreaterThan(0)
    expect(sampled.length).toBeLessThan(120)
    // The columns with the most distinct values lost theirs first
    const kept = Math.min(...sampled.map((c) => c.distinct ?? 0))
    const dropped = context.nodeColumns.filter((c) => c.samples === undefined)
    expect(
      Math.max(...dropped.map((c) => c.distinct ?? 0)),
    ).toBeGreaterThanOrEqual(kept)
  })

  it('drops columns when samples are not enough', () => {
    const columns: Record<string, ValueTypeName> = {}
    for (let i = 0; i < MAX_CONTEXT_COLUMNS; i++) {
      columns[`${'n'.repeat(MAX_COLUMN_NAME_LENGTH - 4)}${i}`] = 'boolean'
    }
    const context = buildFilterContext(
      network([]),
      table(columns),
      table(columns),
    )
    expect(JSON.stringify(context).length).toBeLessThanOrEqual(
      MAX_CONTEXT_LENGTH,
    )
    expect(
      context.nodeColumns.length + context.edgeColumns.length,
    ).toBeLessThan(2 * MAX_CONTEXT_COLUMNS)
    expect(context.nodeColumnsTruncated ?? context.edgeColumnsTruncated).toBe(
      true,
    )
  })
})
