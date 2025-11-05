import { Column } from '../Column'
import { Table } from '../Table'
import {
  addColumn,
  columns,
  columnValueSet,
  createTable,
  insertRow,
  insertRows,
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

      expect(result).toBe(table)
      expect(table.rows.size).toBe(1)
      expect(table.rows.get('1')?.name).toBe('Row1')
    })

    it('should overwrite existing row with same id', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
      ])
      table.rows.set('1', { name: 'OldName' })

      insertRow(table, ['1', { name: 'NewName' }])

      expect(table.rows.size).toBe(1)
      expect(table.rows.get('1')?.name).toBe('NewName')
    })

    it('should insert multiple rows with different ids', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
      ])

      insertRow(table, ['1', { name: 'Row1' }])
      insertRow(table, ['2', { name: 'Row2' }])

      expect(table.rows.size).toBe(2)
      expect(table.rows.get('1')?.name).toBe('Row1')
      expect(table.rows.get('2')?.name).toBe('Row2')
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

      expect(result).toBe(table)
      expect(table.rows.size).toBe(3)
      expect(table.rows.get('1')?.name).toBe('Row1')
      expect(table.rows.get('2')?.name).toBe('Row2')
      expect(table.rows.get('3')?.name).toBe('Row3')
    })

    it('should handle empty array', () => {
      const table = createTable('test-table')

      const result = insertRows(table, [])

      expect(result).toBe(table)
      expect(table.rows.size).toBe(0)
    })

    it('should overwrite existing rows with same ids', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
      ])
      table.rows.set('1', { name: 'OldName1' })
      table.rows.set('2', { name: 'OldName2' })

      insertRows(table, [
        ['1', { name: 'NewName1' }],
        ['2', { name: 'NewName2' }],
      ])

      expect(table.rows.size).toBe(2)
      expect(table.rows.get('1')?.name).toBe('NewName1')
      expect(table.rows.get('2')?.name).toBe('NewName2')
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

      expect(result).toBe(table)
      expect(table.rows.get('1')?.name).toBe('NewName')
      expect(table.rows.get('1')?.score).toBe(20)
    })

    it('should create a new row if id does not exist', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
      ])

      updateRow(table, ['1', { name: 'NewRow' }])

      expect(table.rows.size).toBe(1)
      expect(table.rows.get('1')?.name).toBe('NewRow')
    })

    it('should replace entire row object', () => {
      const table = createTable('test-table', [
        { name: 'name', type: 'string' },
        { name: 'score', type: 'double' },
      ])
      table.rows.set('1', { name: 'OldName', score: 10 })

      updateRow(table, ['1', { name: 'NewName' }])

      expect(table.rows.get('1')?.name).toBe('NewName')
      // Note: updateRow replaces the entire row object, so score is removed
      expect(table.rows.get('1')?.score).toBeUndefined()
    })
  })
})

