import { DataTableValue } from 'primereact/datatable'
import { ColumnAppendState } from '../model/ColumnAppendState'
import { ColumnAppendType } from '../model/ColumnAppendType'
import { joinRowsToTable } from '../model/impl/JoinTableToNetwork'
import { Table, Column } from '../../../models/TableModel'

describe('joinRowsToTable', () => {
  it('appends columns correctly', () => {
    const table: Table = {
      id: 'test',
      columns: [{ name: 'id', type: 'string' }],
      rows: new Map([['1', { id: '1' }]]),
    }
    const rows: DataTableValue[] = [
      { xId: '1', f: 1 },
      { xId: '3', f: 2 },
    ]
    const columns: ColumnAppendState[] = [
      {
        name: 'xId',
        dataType: 'integer',
        meaning: ColumnAppendType.Key,
        rowsToJoin: [],
        invalidValues: [],
      },
      {
        name: 'f',
        dataType: 'integer',
        meaning: ColumnAppendType.Attribute,
        rowsToJoin: [],
        invalidValues: [],
      },
    ]
    const networkKeyColumn: Column = { name: 'id', type: 'string' }

    const result = joinRowsToTable(table, rows, columns, networkKeyColumn)

    expect(result.columns).toEqual([
      { name: 'id', type: 'string' },
      { name: 'f', type: 'integer' },
    ])

    // expect(result.rows).toEqual(new Map([['1', { id: '1', name: '1', age: 1 }]]));
  })

  it('appends rows correctly', () => {
    const table: Table = {
      id: 'test',
      columns: [{ name: 'id', type: 'string' }],
      rows: new Map([['1', { id: '1' }]]),
    }
    const rows: DataTableValue[] = [
      { xId: '1', f: 1 },
      { xId: '3', f: 2 },
    ]
    const columns: ColumnAppendState[] = [
      {
        name: 'xId',
        dataType: 'string',
        meaning: ColumnAppendType.Key,
        rowsToJoin: [],
        invalidValues: [],
      },
      {
        name: 'f',
        dataType: 'integer',
        meaning: ColumnAppendType.Attribute,
        rowsToJoin: [],
        invalidValues: [],
      },
    ]
    const networkKeyColumn: Column = { name: 'id', type: 'string' }

    const result = joinRowsToTable(table, rows, columns, networkKeyColumn)

    expect(result.columns).toEqual([
      { name: 'id', type: 'string' },
      { name: 'f', type: 'integer' },
    ])

    expect(result.rows).toEqual(new Map([['1', { id: '1', f: 1 }]]))
  })

  //   it('does not append rows if key column is missing', () => {
  //     const table: Table = {
  //       columns: [{ name: 'id', type: 'string' }],
  //       rows: new Map([[0, { id: '1' }]]),
  //     };
  //     const rows: DataTableValue[] = [{ id: '2' }, { id: '3' }];
  //     const columns: ColumnAppendState[] = [
  //       { name: 'name', dataType: 'string', meaning: ColumnAppendType.Attribute },
  //       { name: 'age', dataType: 'integer', meaning: ColumnAppendType.Attribute },
  //     ];
  //     const networkKeyColumn: Column = { name: 'key', type: 'string' };

  //     const result = joinRowsToTable(table, rows, columns, networkKeyColumn);

  //     expect(result).toEqual(table);
  //   });
})
