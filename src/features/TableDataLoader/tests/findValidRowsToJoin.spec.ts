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

  // TODO feed case insensitive matching param to the function
  //   it('handles case-insensitive matching for string column values', () => {
  //     const table = {
  //       columns: [{ name: 'name', type: ValueTypeName.String }],
  //       id: 'test',
  //       rows: new Map([
  //         ['1', { name: 'John' }],
  //         ['2', { name: 'Jane' }],
  //         ['3', { name: 'bob' }],
  //       ]),
  //     };
  //     const rows = [{ name: 'john' }, { name: 'JANE' }, { name: 'BoB' }];
  //     const column: ColumnAppendState = {
  //       name: 'name',
  //       meaning: ColumnAppendType.Key,
  //       dataType: ValueTypeName.String,
  //       invalidValues: [],
  //       rowsToJoin: [],
  //       delimiter: '',
  //     };
  //     const result = findValidRowsToJoin(table, rows, column, table.columns[0]);
  //     expect(result).toEqual([0, 1, 2]);
  //   });

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
