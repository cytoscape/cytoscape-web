import { describe, expect, it } from 'vitest'

import { ValueTypeName } from '../../../models/TableModel'
import { ColumnAppendState } from '../model/ColumnAppendState'
import { ColumnAppendType } from '../model/ColumnAppendType'
import { findValidRowsToJoin } from '../model/impl/JoinTableToNetwork'

describe('findValidRowsToJoin', () => {
  it('returns an empty array when no rows match the column value', () => {
    const table = {
      columns: [{ name: 'name', type: ValueTypeName.String }],
      id: 'test',
      rows: new Map([
        ['1', { name: 'John' }],
        ['2', { name: 'Jane' }],
        ['3', { name: 'bob' }],
      ]),
    }
    const rows = [{ name: 'Alice' }, { name: 'Eve' }]
    const column: ColumnAppendState = {
      name: 'age',
      meaning: ColumnAppendType.Key,
      dataType: ValueTypeName.String,
      invalidValues: [],
      rowsToJoin: [],
      delimiter: '',
    }
    const result = findValidRowsToJoin(table, rows, column, table.columns[0])
    expect(result).toEqual([])
  })

  it('returns an array of row indices that match the column value', () => {
    const table = {
      columns: [{ name: 'name', type: ValueTypeName.String }],
      id: 'test',
      rows: new Map([
        ['1', { name: 'John' }],
        ['2', { name: 'Jane' }],
        ['3', { name: 'Bob' }],
      ]),
    }
    const rows = [{ name: 'John' }, { name: 'Jane' }, { name: 'Bob' }]
    const column: ColumnAppendState = {
      name: 'name',
      meaning: ColumnAppendType.Key,
      dataType: ValueTypeName.String,
      invalidValues: [],
      rowsToJoin: [],
      delimiter: '',
    }
    const result = findValidRowsToJoin(table, rows, column, table.columns[0])
    expect(result).toEqual([0, 1, 2])
  })

  const nameColumn: ColumnAppendState = {
    name: 'name',
    meaning: ColumnAppendType.Key,
    dataType: ValueTypeName.String,
    invalidValues: [],
    rowsToJoin: [],
    delimiter: '',
  }

  const mixedCaseTable = {
    columns: [{ name: 'name', type: ValueTypeName.String }],
    id: 'test',
    rows: new Map([
      ['1', { name: 'John' }],
      ['2', { name: 'Jane' }],
      ['3', { name: 'bob' }],
    ]),
  }

  it('matches case-insensitively when caseSensitive is false', () => {
    const rows = [{ name: 'john' }, { name: 'JANE' }, { name: 'BoB' }]

    const result = findValidRowsToJoin(
      mixedCaseTable,
      rows,
      nameColumn,
      mixedCaseTable.columns[0],
      false,
    )
    expect(result.sort()).toEqual([0, 1, 2])
  })

  it('matches nothing on a case difference when caseSensitive is true', () => {
    const rows = [{ name: 'john' }, { name: 'JANE' }, { name: 'BoB' }]

    const result = findValidRowsToJoin(
      mixedCaseTable,
      rows,
      nameColumn,
      mixedCaseTable.columns[0],
      true,
    )
    expect(result).toEqual([])
  })

  it('returns an empty array when the table has no rows', () => {
    const table = {
      rows: new Map(),
      columns: [],
      id: 'test',
    }
    const rows = [{ name: 'John' }, { name: 'Jane' }, { name: 'Bob' }]
    const column: ColumnAppendState = {
      name: 'name',
      meaning: ColumnAppendType.Key,
      dataType: ValueTypeName.String,
      invalidValues: [],
      rowsToJoin: [],
      delimiter: '',
    }

    const result = findValidRowsToJoin(table, rows, column, {
      name: 'name',
      type: ValueTypeName.String,
    })
    expect(result).toEqual([])
  })
})
