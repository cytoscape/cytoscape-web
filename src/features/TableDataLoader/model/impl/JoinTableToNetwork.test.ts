// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { Table, ValueTypeName } from '../../../../models/TableModel'
import { ColumnTypeConflictError } from '../../../../models/TableModel/impl/columnNames'
import { ColumnAppendState } from '../ColumnAppendState'
import { ColumnAppendType } from '../ColumnAppendType'
import { joinRowsToTable } from './JoinTableToNetwork'

const append = (
  name: string,
  dataType: ValueTypeName = ValueTypeName.String,
): ColumnAppendState => ({
  name,
  dataType,
  meaning: ColumnAppendType.Attribute,
  invalidValues: [],
  rowsToJoin: [],
})

const key: ColumnAppendState = {
  name: 'key',
  dataType: ValueTypeName.String,
  meaning: ColumnAppendType.Key,
  invalidValues: [],
  rowsToJoin: [],
}

const makeTable = (): Table => ({
  id: 'nodes',
  columns: [
    { name: 'key', type: ValueTypeName.String },
    { name: 'label', type: ValueTypeName.String },
    { name: 'count', type: ValueTypeName.Long },
  ],
  rows: new Map([
    ['1', { key: 'a', label: 'old', count: 3 }],
    ['2', { key: 'b', label: 'keep', count: 4 }],
  ]),
})

const networkKey = { name: 'key', type: ValueTypeName.String }

describe('joinRowsToTable duplicate columns (#951)', () => {
  it('writes a case variant to the existing column', () => {
    const joined = joinRowsToTable(
      makeTable(),
      [{ key: 'a', Label: 'new' }],
      [key, append('Label')],
      networkKey,
    )

    expect(joined.columns.map((c) => c.name)).toEqual(['key', 'label', 'count'])
    expect(joined.rows.get('1')).toEqual({
      key: 'a',
      label: 'new',
      count: 3,
    })
  })

  it('writes an exact name to the existing column without adding one', () => {
    const joined = joinRowsToTable(
      makeTable(),
      [{ key: 'a', label: 'new' }],
      [key, append('label')],
      networkKey,
    )

    expect(joined.columns).toHaveLength(3)
    expect(joined.rows.get('1')?.label).toBe('new')
  })

  it('leaves the rows that have no matching key alone', () => {
    const joined = joinRowsToTable(
      makeTable(),
      [{ key: 'a', Label: 'new' }],
      [key, append('Label')],
      networkKey,
    )

    expect(joined.rows.get('2')?.label).toBe('keep')
  })

  it('merges new columns: first spelling, last value in file order', () => {
    const joined = joinRowsToTable(
      makeTable(),
      [{ key: 'a', note: 'x', NOTE: 'y' }],
      [key, append('note'), append('NOTE')],
      networkKey,
    )

    expect(joined.columns.map((c) => c.name)).toEqual([
      'key',
      'label',
      'count',
      'note',
    ])
    expect(joined.rows.get('1')?.note).toBe('y')
  })

  it('does not let an empty cell erase a value', () => {
    const joined = joinRowsToTable(
      makeTable(),
      [{ key: 'a', Label: '' }],
      [key, append('Label')],
      networkKey,
    )

    expect(joined.rows.get('1')?.label).toBe('old')
  })

  it('fails when a value would be written to the other type', () => {
    expect(() =>
      joinRowsToTable(
        makeTable(),
        [{ key: 'a', Count: 'many' }],
        [key, append('Count')],
        networkKey,
      ),
    ).toThrow(ColumnTypeConflictError)
  })

  it('does not fail when no row would write the value', () => {
    expect(() =>
      joinRowsToTable(
        makeTable(),
        [{ key: 'missing', Count: 'many' }],
        [key, append('Count')],
        networkKey,
      ),
    ).not.toThrow()
  })

  it('does not fail for a differently typed column with no values', () => {
    const joined = joinRowsToTable(
      makeTable(),
      [{ key: 'a', Count: '' }],
      [key, append('Count')],
      networkKey,
    )

    expect(joined.rows.get('1')?.count).toBe(3)
  })

  it('leaves the original table untouched when it fails', () => {
    const table = makeTable()

    expect(() =>
      joinRowsToTable(
        table,
        [{ key: 'a', Count: 'many' }],
        [key, append('Count')],
        networkKey,
      ),
    ).toThrow()

    expect(table.columns).toHaveLength(3)
    expect(table.rows.get('1')?.count).toBe(3)
  })

  it('still appends a genuinely new column', () => {
    const joined = joinRowsToTable(
      makeTable(),
      [{ key: 'a', extra: 'v' }],
      [key, append('extra')],
      networkKey,
    )

    expect(joined.columns.map((c) => c.name)).toContain('extra')
    expect(joined.rows.get('1')?.extra).toBe('v')
  })

  it('keeps both columns of a table saved with duplicates', () => {
    const table = makeTable()
    table.columns.push({ name: 'LABEL', type: ValueTypeName.String })

    const joined = joinRowsToTable(
      table,
      [{ key: 'a', extra: 'v' }],
      [key, append('extra')],
      networkKey,
    )

    expect(joined.columns.map((c) => c.name)).toEqual([
      'key',
      'label',
      'count',
      'LABEL',
      'extra',
    ])
  })
})
