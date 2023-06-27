
import { editColumnName, deleteTableColumn } from '../../src/models/TableModel/impl/InMemoryTable'
import { Column, Table } from '../../src/models/TableModel'
describe('editColumnName', () => {
  it('should edit a column name and update all rows', () => {
    const oldColumns = new Map()
      .set('oldName', { name: 'oldName', type: 'string' } as Column)
      .set('otherName', { name: 'otherName', type: 'integer' } as Column)

    const newColumns = new Map()
      .set('newName', { name: 'newName', type: 'string' } as Column)
      .set('otherName', { name: 'otherName', type: 'integer' } as Column)

    const table: Table = {
      id: 'old',
      columns: oldColumns,
      rows: new Map([
        [
          '1',
          {
            oldName: 'value1',
            otherName: 123,
          },
        ],
        [
          '2',
          {
            oldName: 'value2',
            otherName: 456,
          },
        ],
      ]),
    }

    const expectedTable: Table = {
      id: 'new',
      columns: newColumns,
      rows: new Map([
        [
          '1',
          {
            newName: 'value1',
            otherName: 123,
          },
        ],
        [
          '2',
          {
            newName: 'value2',
            otherName: 456,
          },
        ],
      ]),
    }

    const result = editColumnName(table, 'oldName', 'newName')
    expect(result).toEqual(expectedTable)
  })

  it('should not edit a column name if the old name does not exist', () => {
    const columns = new Map()
      .set('name1', { name: 'oldName', type: 'string' } as Column)
      .set('name2', { name: 'otherName', type: 'integer' } as Column)


    const table: Table = {
      id: 'test',
      columns,
      rows: new Map([
        [
          '1',
          {
            name1: 'value1',
            name2: 123,
          },
        ],
        [
          '2',
          {
            name1: 'value2',
            name2: 456,
          },
        ],
      ]),
    }

    const result = editColumnName(table, 'oldName', 'newName')
    expect(result).toEqual(table)
  })
})

describe('deleteTableColumn', () => {
  it('should delete a column and its values from the rows', () => {
    const oldColumns = new Map()
      .set('name1', { name: 'name1', type: 'string' } as Column)
      .set('name2', { name: 'name2', type: 'integer' } as Column)

    const newColumns = new Map()
      .set('name2', { name: 'name2', type: 'integer' } as Column)
    const table: Table = {
      id: 'test',
      columns: oldColumns,
      rows: new Map([
        [
          '1',
          {
            name1: 'value1',
            name2: 123,
          },
        ],
        [
          '2',
          {
            name1: 'value2',
            name2: 456,
          },
        ],
      ]),
    }

    const expectedTable: Table = {
      id: 'test',
      columns: newColumns,
      rows: new Map([
        [
          '1',
          {
            name2: 123,
          },
        ],
        [
          '2',
          {
            name2: 456,
          },
        ],
      ]),
    }

    const result = deleteTableColumn(table, 'name1')
    expect(result).toEqual(expectedTable)
  })

  it('should not delete a column if the column name does not exist', () => {
    const table: Table = {
      id: 'test',
      columns: new Map([
        ['name1', { name: 'name1', type: 'string' } as Column],
        ['name2', { name: 'name2', type: 'integer' } as Column],
      ]),
      rows: new Map([
        [
          '1',
          {
            name1: 'value1',
            name2: 123,
          },
        ],
        [
          '2',
          {
            name1: 'value2',
            name2: 456,
          },
        ],
      ]),
    }

    const result = deleteTableColumn(table, 'name3')
    expect(result).toEqual(table)
  })

})