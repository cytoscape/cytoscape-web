import { IdType } from '../../IdType'
import { Column } from '../Column'
import { Table } from '../Table'
import { ValueType } from '../ValueType'
import {
  addColumn,
  addRowWithDefaults,
  applyValueToElements,
  columns,
  columnValueSet,
  createColumn,
  createTable,
  deleteColumn,
  deleteRows,
  duplicateColumn,
  editRows,
  insertRow,
  insertRows,
  moveColumn,
  setColumnName,
  setTable,
  setValue,
  setValues,
  updateRow,
} from './inMemoryTable'

// to run these: npx jest src/models/TableModel/impl/inMemoryTable.test.ts

describe('InMemoryTable', () => {
  describe('createTable', () => {
    it('should create an empty table with just an id', () => {
      const table = createTable('test-table-1')

      expect(table.id).toBe('test-table-1')
      expect(table.columns).toEqual([])
      expect(table.rows.size).toBe(0)
    })

    it('should create a table with columns', () => {
      const cols: Column[] = [
        { name: 'name', type: 'string' },
        { name: 'score', type: 'double' },
      ]
      const table = createTable('test-table-2', cols)

      expect(table.id).toBe('test-table-2')
      expect(table.columns).toHaveLength(2)
      expect(table.columns[0].name).toBe('name')
      expect(table.columns[1].name).toBe('score')
    })

    it('should create a table with initial data', () => {
      const cols: Column[] = [{ name: 'name', type: 'string' }]
      const initialData = new Map([
        ['1', { name: 'Row1' }],
        ['2', { name: 'Row2' }],
      ])
      const table = createTable('test-table-3', cols, initialData)

      expect(table.rows.size).toBe(2)
      expect(table.rows.get('1')?.name).toBe('Row1')
      expect(table.rows.get('2')?.name).toBe('Row2')
    })

    it('should create a table with empty columns array if not provided', () => {
      const table = createTable('test-table-4')

      expect(table.columns).toEqual([])
    })

    it('should create a table with empty rows map if data not provided', () => {
      const table = createTable('test-table-5')

      expect(table.rows.size).toBe(0)
    })
  })

  describe('columns', () => {
    it('should return columns from a table', () => {
      const cols: Column[] = [
        { name: 'name', type: 'string' },
        { name: 'score', type: 'double' },
      ]
      const table = createTable('test-table', cols)

      const result = columns(table)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('name')
      expect(result[1].name).toBe('score')
    })

    it('should return empty array for table with no columns', () => {
      const table = createTable('test-table')

      const result = columns(table)

      expect(result).toEqual([])
    })
  })

  describe('addColumn', () => {
    it('should return the table unchanged', () => {
      const table = createTable('test-table')
      const newColumns: Column[] = [{ name: 'newCol', type: 'string' }]

      const result = addColumn(table, newColumns)

      expect(result).toBe(table)
      // Note: addColumn currently doesn't modify the table
      expect(result.columns).toEqual([])
    })
  })

  describe('columnValueSet', () => {
    it('should return set of unique values from a column', () => {
      const table = createTable('test-table', [
        { name: 'status', type: 'string' },
      ])
      table.rows.set('1', { status: 'active' })
      table.rows.set('2', { status: 'inactive' })
      table.rows.set('3', { status: 'active' })

      const result = columnValueSet(table, 'status')

      expect(result.size).toBe(2)
      expect(result.has('active')).toBe(true)
      expect(result.has('inactive')).toBe(true)
    })

    it('should exclude null and undefined values by default', () => {
      const table = createTable('test-table', [
        { name: 'value', type: 'string' },
      ])
      table.rows.set('1', { value: 'test' })
      table.rows.set('2', { value: null as any })
      table.rows.set('3', { value: undefined as any })

      const result = columnValueSet(table, 'value')

      expect(result.size).toBe(1)
      expect(result.has('test')).toBe(true)
      // Note: null and undefined are not included in the set by default
    })

    it('should include null and undefined values when flag is set', () => {
      const table = createTable('test-table', [
        { name: 'value', type: 'string' },
      ])
      table.rows.set('1', { value: 'test' })
      table.rows.set('2', { value: null as any })
      table.rows.set('3', { value: undefined as any })

      const result = columnValueSet(table, 'value', true)

      expect(result.size).toBe(3)
      expect(result.has('test')).toBe(true)
      // Note: When includeNullOrUndefined is true, null and undefined are included
    })

    it('should return empty set for column that does not exist', () => {
      const table = createTable('test-table')
      table.rows.set('1', { otherColumn: 'value' })

      const result = columnValueSet(table, 'nonexistent')

      expect(result.size).toBe(0)
    })

    it('should handle numeric values', () => {
      const table = createTable('test-table', [
        { name: 'score', type: 'double' },
      ])
      table.rows.set('1', { score: 10.5 })
      table.rows.set('2', { score: 20.0 })
      table.rows.set('3', { score: 10.5 })

      const result = columnValueSet(table, 'score')

      expect(result.size).toBe(2)
      expect(result.has(10.5)).toBe(true)
      expect(result.has(20.0)).toBe(true)
    })
  })

  describe('insertRow', () => {
    it('should insert a single row into the table', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
      ])

      const result = insertRow(table, ['1', { name: 'Row1' }])

      expect(result).not.toBe(table) // Immutability check
      expect(result.rows.size).toBe(1)
      expect(result.rows.get('1')?.name).toBe('Row1')
      expect(table.rows.size).toBe(0) // Original unchanged
    })

    it('should overwrite existing row with same id', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
      ])
      table.rows.set('1', { name: 'OldName' })

      const result = insertRow(table, ['1', { name: 'NewName' }])

      expect(result.rows.size).toBe(1)
      expect(result.rows.get('1')?.name).toBe('NewName')
      expect(result).not.toBe(table) // Immutability check
      expect(table.rows.get('1')?.name).toBe('OldName') // Original unchanged
    })

    it('should insert multiple rows with different ids', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
      ])

      let result = insertRow(table, ['1', { name: 'Row1' }])
      result = insertRow(result, ['2', { name: 'Row2' }])

      expect(result.rows.size).toBe(2)
      expect(result.rows.get('1')?.name).toBe('Row1')
      expect(result.rows.get('2')?.name).toBe('Row2')
      expect(table.rows.size).toBe(0) // Original unchanged
    })
  })

  describe('insertRows', () => {
    it('should insert multiple rows at once', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
      ])

      const result = insertRows(table, [
        ['1', { name: 'Row1' }],
        ['2', { name: 'Row2' }],
        ['3', { name: 'Row3' }],
      ])

      expect(result).not.toBe(table) // Immutability check
      expect(result.rows.size).toBe(3)
      expect(result.rows.get('1')?.name).toBe('Row1')
      expect(result.rows.get('2')?.name).toBe('Row2')
      expect(result.rows.get('3')?.name).toBe('Row3')
      expect(table.rows.size).toBe(0) // Original unchanged
    })

    it('should handle empty array', () => {
      const table = createTable('test-table')

      const result = insertRows(table, [])

      expect(result).not.toBe(table) // Immutability check
      expect(result.rows.size).toBe(0)
      expect(table.rows.size).toBe(0) // Original unchanged
    })

    it('should overwrite existing rows with same ids', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
      ])
      table.rows.set('1', { name: 'OldName1' })
      table.rows.set('2', { name: 'OldName2' })

      const result = insertRows(table, [
        ['1', { name: 'NewName1' }],
        ['2', { name: 'NewName2' }],
      ])

      expect(result.rows.size).toBe(2)
      expect(result.rows.get('1')?.name).toBe('NewName1')
      expect(result.rows.get('2')?.name).toBe('NewName2')
      expect(result).not.toBe(table) // Immutability check
      expect(table.rows.get('1')?.name).toBe('OldName1') // Original unchanged
    })
  })

  describe('updateRow', () => {
    it('should update an existing row', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
        { name: 'score', type: 'double' },
      ])
      table.rows.set('1', { name: 'OldName', score: 10 })

      const result = updateRow(table, ['1', { name: 'NewName', score: 20 }])

      expect(result).not.toBe(table) // Immutability check
      expect(result.rows.get('1')?.name).toBe('NewName')
      expect(result.rows.get('1')?.score).toBe(20)
      expect(table.rows.get('1')?.name).toBe('OldName') // Original unchanged
      expect(table.rows.get('1')?.score).toBe(10) // Original unchanged
    })

    it('should create a new row if id does not exist', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
      ])

      const result = updateRow(table, ['1', { name: 'NewRow' }])

      expect(result.rows.size).toBe(1)
      expect(result.rows.get('1')?.name).toBe('NewRow')
      expect(result).not.toBe(table) // Immutability check
      expect(table.rows.size).toBe(0) // Original unchanged
    })

    it('should replace entire row object', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
        { name: 'score', type: 'double' },
      ])
      table.rows.set('1', { name: 'OldName', score: 10 })

      const result = updateRow(table, ['1', { name: 'NewName' }])

      expect(result.rows.get('1')?.name).toBe('NewName')
      // Note: updateRow replaces the entire row object, so score is removed
      expect(result.rows.get('1')?.score).toBeUndefined()
      expect(result).not.toBe(table) // Immutability check
      expect(table.rows.get('1')?.name).toBe('OldName') // Original unchanged
      expect(table.rows.get('1')?.score).toBe(10) // Original unchanged
    })
  })

  describe('moveColumn', () => {
    it('should move a column to a new position', () => {
      const table = createTable('test-table', [
        { name: 'col1', type: 'string' },
        { name: 'col2', type: 'string' },
        { name: 'col3', type: 'string' },
      ])

      const result = moveColumn(table, 0, 2)

      expect(result.columns[2].name).toBe('col1')
      expect(result.columns[0].name).toBe('col2')
      expect(result.columns[1].name).toBe('col3')
      expect(result).not.toBe(table) // Immutability check
      expect(table.columns[0].name).toBe('col1') // Original unchanged
    })

    it('should handle moving to the beginning', () => {
      const table = createTable('test-table', [
        { name: 'col1', type: 'string' },
        { name: 'col2', type: 'string' },
      ])

      const result = moveColumn(table, 1, 0)

      expect(result.columns[0].name).toBe('col2')
      expect(result.columns[1].name).toBe('col1')
    })
  })

  describe('setColumnName', () => {
    it('should rename a column', () => {
      const table = createTable('test-table', [
        { name: 'oldName', type: 'string' },
      ])
      table.rows.set('n1', { oldName: 'value1' })

      const result = setColumnName(table, 'oldName', 'newName')

      expect(result.columns[0].name).toBe('newName')
      expect(result.rows.get('n1')?.newName).toBe('value1')
      expect(result.rows.get('n1')?.oldName).toBeUndefined()
      expect(result).not.toBe(table) // Immutability check
      expect(table.columns[0].name).toBe('oldName') // Original unchanged
    })

    it('should update all rows when renaming column', () => {
      const table = createTable('test-table', [
        { name: 'oldName', type: 'string' },
      ])
      table.rows.set('n1', { oldName: 'value1' })
      table.rows.set('n2', { oldName: 'value2' })

      const result = setColumnName(table, 'oldName', 'newName')

      expect(result.rows.get('n1')?.newName).toBe('value1')
      expect(result.rows.get('n2')?.newName).toBe('value2')
      expect(result.rows.get('n1')?.oldName).toBeUndefined()
    })

    it('should return unchanged if column does not exist', () => {
      const table = createTable('test-table', [
        { name: 'col1', type: 'string' },
      ])

      const result = setColumnName(table, 'non-existent', 'newName')

      expect(result).toBe(table) // Should return unchanged
    })
  })

  describe('applyValueToElements', () => {
    it('should apply value to specific elements', () => {
      const table = createTable('test-table', [
        { name: 'score', type: 'double' },
      ])
      table.rows.set('n1', { score: 10 })
      table.rows.set('n2', { score: 20 })

      const result = applyValueToElements(table, 'score', 100, ['n1'])

      expect(result.rows.get('n1')?.score).toBe(100)
      expect(result.rows.get('n2')?.score).toBe(20) // Unchanged
      expect(result).not.toBe(table) // Immutability check
    })

    it('should apply value to all elements when elementIds is undefined', () => {
      const table = createTable('test-table', [
        { name: 'score', type: 'double' },
      ])
      table.rows.set('n1', { score: 10 })
      table.rows.set('n2', { score: 20 })

      const result = applyValueToElements(table, 'score', 100, undefined)

      expect(result.rows.get('n1')?.score).toBe(100)
      expect(result.rows.get('n2')?.score).toBe(100)
    })
  })

  describe('deleteColumn', () => {
    it('should delete a column from the table', () => {
      const table = createTable('test-table', [
        { name: 'col1', type: 'string' },
        { name: 'col2', type: 'string' },
      ])
      table.rows.set('n1', { col1: 'value1', col2: 'value2' })

      const result = deleteColumn(table, 'col1')

      expect(result.columns.length).toBe(1)
      expect(result.columns[0].name).toBe('col2')
      expect(result.rows.get('n1')?.col1).toBeUndefined()
      expect(result.rows.get('n1')?.col2).toBe('value2')
      expect(result).not.toBe(table) // Immutability check
    })

    it('should delete column from all rows', () => {
      const table = createTable('test-table', [
        { name: 'col1', type: 'string' },
      ])
      table.rows.set('n1', { col1: 'value1' })
      table.rows.set('n2', { col1: 'value2' })

      const result = deleteColumn(table, 'col1')

      expect(result.rows.get('n1')?.col1).toBeUndefined()
      expect(result.rows.get('n2')?.col1).toBeUndefined()
    })

    it('should return unchanged if column does not exist', () => {
      const table = createTable('test-table', [
        { name: 'col1', type: 'string' },
      ])

      const result = deleteColumn(table, 'non-existent')

      expect(result).toBe(table) // Should return unchanged
    })
  })

  describe('createColumn', () => {
    it('should create a new column at the beginning', () => {
      const table = createTable('test-table', [
        { name: 'col1', type: 'string' },
      ])
      table.rows.set('n1', { col1: 'value1' })

      const result = createColumn(table, 'newCol', 'integer', 0)

      expect(result.columns.length).toBe(2)
      expect(result.columns[0].name).toBe('newCol')
      expect(result.columns[0].type).toBe('integer')
      expect(result.rows.get('n1')?.newCol).toBe(0)
      expect(result).not.toBe(table) // Immutability check
    })

    it('should add default value to all rows', () => {
      const table = createTable('test-table', [])
      table.rows.set('n1', {})
      table.rows.set('n2', {})

      const result = createColumn(table, 'newCol', 'string', 'default')

      expect(result.rows.get('n1')?.newCol).toBe('default')
      expect(result.rows.get('n2')?.newCol).toBe('default')
    })
  })

  describe('setValue', () => {
    it('should set a value for a specific cell', () => {
      const table = createTable('test-table', [
        { name: 'score', type: 'double' },
      ])
      table.rows.set('n1', { score: 10 })

      const result = setValue(table, 'n1', 'score', 100)

      expect(result.rows.get('n1')?.score).toBe(100)
      expect(result).not.toBe(table) // Immutability check
      expect(table.rows.get('n1')?.score).toBe(10) // Original unchanged
    })

    it('should return unchanged if row does not exist', () => {
      const table = createTable('test-table', [
        { name: 'score', type: 'double' },
      ])

      const result = setValue(table, 'non-existent', 'score', 100)

      expect(result).toBe(table) // Should return unchanged
    })
  })

  describe('setValues', () => {
    it('should set multiple cell values', () => {
      const table = createTable('test-table', [
        { name: 'score', type: 'double' },
      ])
      table.rows.set('n1', { score: 10 })
      table.rows.set('n2', { score: 20 })

      const result = setValues(table, [
        { row: 'n1', column: 'score', value: 100 },
        { row: 'n2', column: 'score', value: 200 },
      ])

      expect(result.rows.get('n1')?.score).toBe(100)
      expect(result.rows.get('n2')?.score).toBe(200)
      expect(result).not.toBe(table) // Immutability check
    })

    it('should handle non-existent rows gracefully', () => {
      const table = createTable('test-table', [
        { name: 'score', type: 'double' },
      ])
      table.rows.set('n1', { score: 10 })

      const result = setValues(table, [
        { row: 'n1', column: 'score', value: 100 },
        { row: 'non-existent', column: 'score', value: 200 },
      ])

      expect(result.rows.get('n1')?.score).toBe(100)
      expect(result.rows.get('non-existent')).toBeUndefined()
    })
  })

  describe('duplicateColumn', () => {
    it('should duplicate a column', () => {
      const table = createTable('test-table', [
        { name: 'col1', type: 'string' },
      ])
      table.rows.set('n1', { col1: 'value1' })

      const result = duplicateColumn(table, 'col1')

      expect(result.columns.length).toBe(2)
      expect(result.columns[0].name).toBe('col1')
      expect(result.columns[1].name).toContain('col1_copy_')
      expect(result.rows.get('n1')?.[result.columns[1].name]).toBe('value1')
      expect(result).not.toBe(table) // Immutability check
    })

    it('should place duplicated column after original', () => {
      const table = createTable('test-table', [
        { name: 'col1', type: 'string' },
        { name: 'col2', type: 'string' },
      ])

      const result = duplicateColumn(table, 'col1')

      expect(result.columns[0].name).toBe('col1')
      expect(result.columns[1].name).toContain('col1_copy_')
      expect(result.columns[2].name).toBe('col2')
    })

    it('should return unchanged if column does not exist', () => {
      const table = createTable('test-table', [
        { name: 'col1', type: 'string' },
      ])

      const result = duplicateColumn(table, 'non-existent')

      expect(result).toBe(table) // Should return unchanged
    })
  })

  describe('deleteRows', () => {
    it('should delete rows from the table', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
      ])
      table.rows.set('n1', { name: 'Node 1' })
      table.rows.set('n2', { name: 'Node 2' })

      const result = deleteRows(table, ['n1'])

      expect(result.rows.has('n1')).toBe(false)
      expect(result.rows.has('n2')).toBe(true)
      expect(result).not.toBe(table) // Immutability check
      expect(table.rows.has('n1')).toBe(true) // Original unchanged
    })

    it('should handle empty rowIds array', () => {
      const table = createTable('test-table', [])
      table.rows.set('n1', { name: 'Node 1' })

      const result = deleteRows(table, [])

      expect(result).toBe(table) // Should return unchanged
      expect(result.rows.has('n1')).toBe(true)
    })
  })

  describe('editRows', () => {
    it('should update multiple rows', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
      ])
      table.rows.set('n1', { name: 'Node 1' })
      table.rows.set('n2', { name: 'Node 2' })

      const rowsToEdit = new Map<IdType, Record<string, ValueType>>([
        ['n1', { name: 'Updated Node 1', score: 100 }],
        ['n2', { name: 'Updated Node 2' }],
      ])

      const result = editRows(table, rowsToEdit)

      expect(result.rows.get('n1')?.name).toBe('Updated Node 1')
      expect(result.rows.get('n1')?.score).toBe(100)
      expect(result.rows.get('n2')?.name).toBe('Updated Node 2')
      expect(result).not.toBe(table) // Immutability check
    })
  })

  describe('setTable', () => {
    it('should return the table unchanged', () => {
      const table = createTable('test-table', [
        { name: 'col1', type: 'string' },
      ])

      const result = setTable(table)

      expect(result).toBe(table) // Should return unchanged
    })
  })

  describe('immutability', () => {
    it('should not mutate the original table in any operation', () => {
      const original = createTable('test-table', [
        { name: 'col1', type: 'string' },
        { name: 'col2', type: 'string' },
      ])
      original.rows.set('n1', { col1: 'value1', col2: 'value2' })
      const originalColumns = original.columns
      const originalRows = original.rows

      // Perform various operations
      let table = moveColumn(original, 0, 1)
      table = setColumnName(table, 'col1', 'newCol1')
      table = deleteColumn(table, 'col2')
      table = createColumn(table, 'newCol', 'integer', 0)
      table = setValue(table, 'n1', 'newCol', 100)
      table = applyValueToElements(table, 'newCol', 200, ['n1'])
      table = duplicateColumn(table, 'newCol1')
      table = deleteRows(table, ['n1'])

      // Verify original is unchanged
      expect(original.columns).toBe(originalColumns)
      expect(original.rows).toBe(originalRows)
      expect(original.columns[0].name).toBe('col1')
      expect(original.rows.get('n1')?.col1).toBe('value1')
      expect(original.rows.has('n1')).toBe(true)
    })
  })

  describe('addRowWithDefaults', () => {
    it('should add a row with default values for all columns', () => {
      const cols: Column[] = [
        { name: 'name', type: 'string' },
        { name: 'score', type: 'double' },
        { name: 'active', type: 'boolean' },
      ]
      const table = createTable('test-table', cols)

      const updated = addRowWithDefaults(table, 'row1')

      expect(updated.rows.size).toBe(1)
      expect(updated.rows.get('row1')).toEqual({
        name: '',
        score: 0,
        active: false,
      })
    })

    it('should override default values with custom values', () => {
      const cols: Column[] = [
        { name: 'name', type: 'string' },
        { name: 'score', type: 'double' },
        { name: 'active', type: 'boolean' },
      ]
      const table = createTable('test-table', cols)

      const updated = addRowWithDefaults(table, 'row1', {
        name: 'Custom Name',
        score: 100,
      })

      expect(updated.rows.get('row1')).toEqual({
        name: 'Custom Name',
        score: 100,
        active: false, // default value for unspecified field
      })
    })

    it('should handle list type columns with empty array defaults', () => {
      const cols: Column[] = [
        { name: 'tags', type: 'list_of_string' },
        { name: 'scores', type: 'list_of_double' },
        { name: 'flags', type: 'list_of_boolean' },
      ]
      const table = createTable('test-table', cols)

      const updated = addRowWithDefaults(table, 'row1')

      expect(updated.rows.get('row1')).toEqual({
        tags: [],
        scores: [],
        flags: [],
      })
    })

    it('should work with empty column table', () => {
      const table = createTable('test-table', [])

      const updated = addRowWithDefaults(table, 'row1')

      expect(updated.rows.size).toBe(1)
      expect(updated.rows.get('row1')).toEqual({})
    })

    it('should add row to table with existing rows', () => {
      const cols: Column[] = [{ name: 'name', type: 'string' }]
      const initialData = new Map([['row1', { name: 'Existing' }]])
      const table = createTable('test-table', cols, initialData)

      const updated = addRowWithDefaults(table, 'row2', { name: 'New Row' })

      expect(updated.rows.size).toBe(2)
      expect(updated.rows.get('row1')).toEqual({ name: 'Existing' })
      expect(updated.rows.get('row2')).toEqual({ name: 'New Row' })
    })

    it('should not mutate original table', () => {
      const cols: Column[] = [{ name: 'name', type: 'string' }]
      const table = createTable('test-table', cols)
      const originalSize = table.rows.size

      const updated = addRowWithDefaults(table, 'row1', { name: 'Test' })

      expect(table.rows.size).toBe(originalSize)
      expect(updated.rows.size).toBe(originalSize + 1)
      expect(updated).not.toBe(table)
    })
  })
})
