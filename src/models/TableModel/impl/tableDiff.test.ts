import { describe, expect, it } from 'vitest'

import { IdType } from '../../IdType'
import { Table } from '../Table'
import { ValueType } from '../ValueType'
import { detectChangedRowIds, detectRowDelta } from './tableDiff'

/**
 * Minimal Table stand-in. Only `rows` participates in row diffing, so the
 * column metadata is left empty on purpose — building real tables here would
 * couple these tests to InMemoryTable's construction rules for no benefit.
 */
const tableOf = (rows: Array<[IdType, Record<string, ValueType>]>): Table =>
  ({
    id: 'test-table',
    columns: [],
    rows: new Map(rows),
  }) as unknown as Table

describe('detectRowDelta', () => {
  it('reports nothing when both snapshots share every row object', () => {
    const shared = { name: 'a' }
    const prev = tableOf([['n1', shared]])
    const curr = tableOf([['n1', shared]])

    expect(detectRowDelta(curr, prev)).toEqual({ changed: [], removed: [] })
  })

  it('reports a mutated row as changed, not removed', () => {
    const prev = tableOf([['n1', { score: 1.2 }]])
    const curr = tableOf([['n1', { score: 3.4 }]])

    expect(detectRowDelta(curr, prev)).toEqual({
      changed: ['n1'],
      removed: [],
    })
  })

  it('reports an added row as changed', () => {
    const shared = { score: 1 }
    const prev = tableOf([['n1', shared]])
    const curr = tableOf([
      ['n1', shared],
      ['n2', { score: 2 }],
    ])

    expect(detectRowDelta(curr, prev)).toEqual({
      changed: ['n2'],
      removed: [],
    })
  })

  it('separates a removed row from mutated ones', () => {
    const untouched = { score: 1 }
    const prev = tableOf([
      ['n1', untouched],
      ['n2', { score: 2 }],
      ['n3', { score: 3 }],
    ])
    const curr = tableOf([
      ['n1', untouched],
      ['n2', { score: 99 }],
    ])

    expect(detectRowDelta(curr, prev)).toEqual({
      changed: ['n2'],
      removed: ['n3'],
    })
  })

  it('treats an equal-by-value but distinct row object as changed', () => {
    // This is the whole reason column operations fan out to every row:
    // InMemoryTable clones each row, so identity changes even when values do not.
    const prev = tableOf([['n1', { score: 1 }]])
    const curr = tableOf([['n1', { score: 1 }]])

    expect(detectRowDelta(curr, prev).changed).toEqual(['n1'])
  })

  it('reports every row as changed when all row objects are rebuilt', () => {
    const prev = tableOf([
      ['n1', { score: 1 }],
      ['n2', { score: 2 }],
      ['n3', { score: 3 }],
    ])
    const curr = tableOf([
      ['n1', { score: 1, extra: '' }],
      ['n2', { score: 2, extra: '' }],
      ['n3', { score: 3, extra: '' }],
    ])

    expect(detectRowDelta(curr, prev)).toEqual({
      changed: ['n1', 'n2', 'n3'],
      removed: [],
    })
  })

  it('handles an emptied table', () => {
    const prev = tableOf([
      ['n1', { score: 1 }],
      ['n2', { score: 2 }],
    ])

    expect(detectRowDelta(tableOf([]), prev)).toEqual({
      changed: [],
      removed: ['n1', 'n2'],
    })
  })

  it('handles a table populated from empty', () => {
    const curr = tableOf([['n1', { score: 1 }]])

    expect(detectRowDelta(curr, tableOf([]))).toEqual({
      changed: ['n1'],
      removed: [],
    })
  })
})

describe('detectChangedRowIds', () => {
  it('concatenates changed then removed, preserving the legacy order', () => {
    const untouched = { score: 1 }
    const prev = tableOf([
      ['n1', untouched],
      ['n2', { score: 2 }],
      ['n3', { score: 3 }],
    ])
    const curr = tableOf([
      ['n1', untouched],
      ['n2', { score: 99 }],
    ])

    expect(detectChangedRowIds(curr, prev)).toEqual(['n2', 'n3'])
  })

  it('returns an empty array for a schema-only change', () => {
    const shared = { score: 1 }
    const prev = tableOf([['n1', shared]])
    const curr = tableOf([['n1', shared]])

    expect(detectChangedRowIds(curr, prev)).toEqual([])
  })
})
