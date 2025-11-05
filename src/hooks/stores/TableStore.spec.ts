import { act, renderHook } from '@testing-library/react'

import { IdType } from '../../models/IdType'
import { TableType } from '../../models/StoreModel/TableStoreModel'
import { AttributeName, Column, Table, ValueType, ValueTypeName } from '../../models/TableModel'
import { createTable } from '../../models/TableModel/impl/inMemoryTable'
import { VisualPropertyGroup } from '../../models/VisualStyleModel/VisualPropertyGroup'
import { useTableStore } from './TableStore'

// Mock the database operations to avoid IndexedDB issues in tests
jest.mock('../../db', () => ({
  ...jest.requireActual('../../db'),
  putTablesToDb: jest.fn().mockResolvedValue(undefined),
  deleteTablesFromDb: jest.fn().mockResolvedValue(undefined),
  clearTablesFromDb: jest.fn().mockResolvedValue(undefined),
}))

// Mock the workspace store to provide a current network ID
jest.mock('./WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({
      workspace: {
        currentNetworkId: 'test-network-1',
      },
    })),
  },
}))

describe('useTableStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { result } = renderHook(() => useTableStore())
    act(() => {
      result.current.deleteAll()
    })
  })

  const createTestTable = (id: IdType, columns: Column[] = []): Table => {
    return createTable(id, columns)
  }

  const createTestTableRecord = (
    networkId: IdType,
    nodeColumns: Column[] = [],
    edgeColumns: Column[] = [],
  ) => {
    const nodeTable = createTestTable(`node-${networkId}`, nodeColumns)
    const edgeTable = createTestTable(`edge-${networkId}`, edgeColumns)

    // Add some test rows
    nodeTable.rows.set('n1', { name: 'Node 1', score: 10 })
    nodeTable.rows.set('n2', { name: 'Node 2', score: 20 })
    edgeTable.rows.set('e1', { weight: 1.5 })

    return { nodeTable, edgeTable }
  }

  describe('add', () => {
    it('should add tables for a network', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const { nodeTable, edgeTable } = createTestTableRecord(networkId)

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
      })

      expect(result.current.tables[networkId]).toBeDefined()
      expect(result.current.tables[networkId].nodeTable).toEqual(nodeTable)
      expect(result.current.tables[networkId].edgeTable).toEqual(edgeTable)
    })

    it('should handle multiple networks independently', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const { nodeTable: nodeTable1, edgeTable: edgeTable1 } =
        createTestTableRecord(networkId1)
      const { nodeTable: nodeTable2, edgeTable: edgeTable2 } =
        createTestTableRecord(networkId2)

      act(() => {
        result.current.add(networkId1, nodeTable1, edgeTable1)
        result.current.add(networkId2, nodeTable2, edgeTable2)
      })

      expect(result.current.tables[networkId1]).toBeDefined()
      expect(result.current.tables[networkId2]).toBeDefined()
      expect(result.current.tables[networkId1].nodeTable.id).toBe(
        `node-${networkId1}`,
      )
      expect(result.current.tables[networkId2].nodeTable.id).toBe(
        `node-${networkId2}`,
      )
    })
  })

  describe('moveColumn', () => {
    it('should move a column to a new position', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const columns: Column[] = [
        { name: 'col1', type: ValueTypeName.String },
        { name: 'col2', type: ValueTypeName.String },
        { name: 'col3', type: ValueTypeName.String },
      ]
      const { nodeTable, edgeTable } = createTestTableRecord(
        networkId,
        columns,
        [],
      )

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.moveColumn(networkId, 'node', 0, 2)
      })

      expect(result.current.tables[networkId].nodeTable.columns[2].name).toBe(
        'col1',
      )
      expect(result.current.tables[networkId].nodeTable.columns[0].name).toBe(
        'col2',
      )
    })

    it('should move column in edge table', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const columns: Column[] = [
        { name: 'col1', type: ValueTypeName.String },
        { name: 'col2', type: ValueTypeName.String },
      ]
      const { nodeTable, edgeTable } = createTestTableRecord(
        networkId,
        [],
        columns,
      )

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.moveColumn(networkId, 'edge', 0, 1)
      })

      expect(result.current.tables[networkId].edgeTable.columns[1].name).toBe(
        'col1',
      )
    })
  })

  describe('setColumnName', () => {
    it('should rename a column', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const columns: Column[] = [
        { name: 'oldName', type: ValueTypeName.String },
      ]
      const { nodeTable, edgeTable } = createTestTableRecord(
        networkId,
        columns,
        [],
      )
      nodeTable.rows.set('n1', { oldName: 'value1' })

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.setColumnName(networkId, 'node', 'oldName', 'newName')
      })

      const updatedTable = result.current.tables[networkId].nodeTable
      expect(updatedTable.columns[0].name).toBe('newName')
      expect(updatedTable.rows.get('n1')?.newName).toBe('value1')
      expect(updatedTable.rows.get('n1')?.oldName).toBeUndefined()
    })

    it('should update all rows when renaming column', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const columns: Column[] = [
        { name: 'oldName', type: ValueTypeName.String },
      ]
      const { nodeTable, edgeTable } = createTestTableRecord(
        networkId,
        columns,
        [],
      )
      nodeTable.rows.set('n1', { oldName: 'value1' })
      nodeTable.rows.set('n2', { oldName: 'value2' })

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.setColumnName(networkId, 'node', 'oldName', 'newName')
      })

      const updatedTable = result.current.tables[networkId].nodeTable
      expect(updatedTable.rows.get('n1')?.newName).toBe('value1')
      expect(updatedTable.rows.get('n2')?.newName).toBe('value2')
    })
  })

  describe('applyValueToElements', () => {
    it('should apply value to specific elements', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const columns: Column[] = [
        { name: 'score', type: ValueTypeName.Double },
      ]
      const { nodeTable, edgeTable } = createTestTableRecord(
        networkId,
        columns,
        [],
      )
      nodeTable.rows.set('n1', { score: 10 })
      nodeTable.rows.set('n2', { score: 20 })

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.applyValueToElements(
          networkId,
          'node',
          'score',
          100,
          ['n1'],
        )
      })

      const updatedTable = result.current.tables[networkId].nodeTable
      expect(updatedTable.rows.get('n1')?.score).toBe(100)
      expect(updatedTable.rows.get('n2')?.score).toBe(20) // Unchanged
    })

    it('should apply value to all elements when elementIds is undefined', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const columns: Column[] = [
        { name: 'score', type: ValueTypeName.Double },
      ]
      const { nodeTable, edgeTable } = createTestTableRecord(
        networkId,
        columns,
        [],
      )
      nodeTable.rows.set('n1', { score: 10 })
      nodeTable.rows.set('n2', { score: 20 })

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.applyValueToElements(
          networkId,
          'node',
          'score',
          100,
          undefined,
        )
      })

      const updatedTable = result.current.tables[networkId].nodeTable
      expect(updatedTable.rows.get('n1')?.score).toBe(100)
      expect(updatedTable.rows.get('n2')?.score).toBe(100)
    })
  })

  describe('deleteColumn', () => {
    it('should delete a column from the table', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const columns: Column[] = [
        { name: 'col1', type: ValueTypeName.String },
        { name: 'col2', type: ValueTypeName.String },
      ]
      const { nodeTable, edgeTable } = createTestTableRecord(
        networkId,
        columns,
        [],
      )
      nodeTable.rows.set('n1', { col1: 'value1', col2: 'value2' })

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.deleteColumn(networkId, 'node', 'col1')
      })

      const updatedTable = result.current.tables[networkId].nodeTable
      expect(updatedTable.columns.length).toBe(1)
      expect(updatedTable.columns[0].name).toBe('col2')
      expect(updatedTable.rows.get('n1')?.col1).toBeUndefined()
      expect(updatedTable.rows.get('n1')?.col2).toBe('value2')
    })

    it('should delete column from all rows', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const columns: Column[] = [
        { name: 'col1', type: ValueTypeName.String },
      ]
      const { nodeTable, edgeTable } = createTestTableRecord(
        networkId,
        columns,
        [],
      )
      nodeTable.rows.set('n1', { col1: 'value1' })
      nodeTable.rows.set('n2', { col1: 'value2' })

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.deleteColumn(networkId, 'node', 'col1')
      })

      const updatedTable = result.current.tables[networkId].nodeTable
      expect(updatedTable.rows.get('n1')?.col1).toBeUndefined()
      expect(updatedTable.rows.get('n2')?.col1).toBeUndefined()
    })
  })

  describe('createColumn', () => {
    it('should create a new column at the beginning', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const columns: Column[] = [
        { name: 'col1', type: ValueTypeName.String },
      ]
      const { nodeTable, edgeTable } = createTestTableRecord(
        networkId,
        columns,
        [],
      )
      nodeTable.rows.set('n1', { col1: 'value1' })

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.createColumn(
          networkId,
          'node',
          'newCol',
          ValueTypeName.Integer,
          0,
        )
      })

      const updatedTable = result.current.tables[networkId].nodeTable
      expect(updatedTable.columns.length).toBe(2)
      expect(updatedTable.columns[0].name).toBe('newCol')
      expect(updatedTable.rows.get('n1')?.newCol).toBe(0)
    })

    it('should add default value to all rows', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const { nodeTable, edgeTable } = createTestTableRecord(networkId)

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.createColumn(
          networkId,
          'node',
          'newCol',
          ValueTypeName.String,
          'default',
        )
      })

      const updatedTable = result.current.tables[networkId].nodeTable
      expect(updatedTable.rows.get('n1')?.newCol).toBe('default')
      expect(updatedTable.rows.get('n2')?.newCol).toBe('default')
    })
  })

  describe('setValue', () => {
    it('should set a value for a specific cell', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const columns: Column[] = [
        { name: 'score', type: ValueTypeName.Double },
      ]
      const { nodeTable, edgeTable } = createTestTableRecord(
        networkId,
        columns,
        [],
      )
      nodeTable.rows.set('n1', { score: 10 })

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.setValue(networkId, TableType.NODE, 'n1', 'score', 100)
      })

      const updatedTable = result.current.tables[networkId].nodeTable
      expect(updatedTable.rows.get('n1')?.score).toBe(100)
    })

    it('should handle non-existent row gracefully', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const { nodeTable, edgeTable } = createTestTableRecord(networkId)

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.setValue(
          networkId,
          TableType.NODE,
          'non-existent',
          'score',
          100,
        )
      })

      // Should not throw
      expect(result.current.tables[networkId]).toBeDefined()
    })
  })

  describe('setValues', () => {
    it('should set multiple cell values', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const columns: Column[] = [
        { name: 'score', type: ValueTypeName.Double },
      ]
      const { nodeTable, edgeTable } = createTestTableRecord(
        networkId,
        columns,
        [],
      )
      nodeTable.rows.set('n1', { score: 10 })
      nodeTable.rows.set('n2', { score: 20 })

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.setValues(networkId, TableType.NODE, [
          { row: 'n1', column: 'score', value: 100 },
          { row: 'n2', column: 'score', value: 200 },
        ])
      })

      const updatedTable = result.current.tables[networkId].nodeTable
      expect(updatedTable.rows.get('n1')?.score).toBe(100)
      expect(updatedTable.rows.get('n2')?.score).toBe(200)
    })
  })

  describe('columnValues', () => {
    it('should return all unique values in a column', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const columns: Column[] = [
        { name: 'score', type: ValueTypeName.Double },
      ]
      const { nodeTable, edgeTable } = createTestTableRecord(
        networkId,
        columns,
        [],
      )
      nodeTable.rows.set('n1', { score: 10 })
      nodeTable.rows.set('n2', { score: 20 })
      nodeTable.rows.set('n3', { score: 10 }) // Duplicate

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
      })

      const values = result.current.columnValues(
        networkId,
        TableType.NODE,
        'score',
      )

      expect(values.size).toBe(2)
      expect(values.has(10)).toBe(true)
      expect(values.has(20)).toBe(true)
    })
  })

  describe('duplicateColumn', () => {
    it('should duplicate a column', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const columns: Column[] = [
        { name: 'col1', type: ValueTypeName.String },
      ]
      const { nodeTable, edgeTable } = createTestTableRecord(
        networkId,
        columns,
        [],
      )
      nodeTable.rows.set('n1', { col1: 'value1' })

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.duplicateColumn(networkId, TableType.NODE, 'col1')
      })

      const updatedTable = result.current.tables[networkId].nodeTable
      expect(updatedTable.columns.length).toBe(2)
      expect(updatedTable.columns[0].name).toBe('col1')
      expect(updatedTable.columns[1].name).toContain('col1_copy_')
      expect(updatedTable.rows.get('n1')?.[updatedTable.columns[1].name]).toBe(
        'value1',
      )
    })

    it('should place duplicated column after original', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const columns: Column[] = [
        { name: 'col1', type: ValueTypeName.String },
        { name: 'col2', type: ValueTypeName.String },
      ]
      const { nodeTable, edgeTable } = createTestTableRecord(
        networkId,
        columns,
        [],
      )

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.duplicateColumn(networkId, TableType.NODE, 'col1')
      })

      const updatedTable = result.current.tables[networkId].nodeTable
      expect(updatedTable.columns[0].name).toBe('col1')
      expect(updatedTable.columns[1].name).toContain('col1_copy_')
      expect(updatedTable.columns[2].name).toBe('col2')
    })
  })

  describe('setTable', () => {
    it('should set the entire table', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const { nodeTable, edgeTable } = createTestTableRecord(networkId)
      const newTable = createTestTable('new-node-table', [
        { name: 'newCol', type: ValueTypeName.String },
      ])

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.setTable(networkId, TableType.NODE, newTable)
      })

      expect(result.current.tables[networkId].nodeTable).toEqual(newTable)
      expect(result.current.tables[networkId].edgeTable).toEqual(edgeTable)
    })
  })

  describe('deleteRows', () => {
    it('should delete rows from both tables', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const { nodeTable, edgeTable } = createTestTableRecord(networkId)
      nodeTable.rows.set('n1', { name: 'Node 1' })
      nodeTable.rows.set('n2', { name: 'Node 2' })
      edgeTable.rows.set('e1', { weight: 1.5 })

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.deleteRows(networkId, ['n1', 'e1'])
      })

      const updatedNodeTable = result.current.tables[networkId].nodeTable
      const updatedEdgeTable = result.current.tables[networkId].edgeTable
      expect(updatedNodeTable.rows.has('n1')).toBe(false)
      expect(updatedNodeTable.rows.has('n2')).toBe(true)
      expect(updatedEdgeTable.rows.has('e1')).toBe(false)
    })

    it('should handle empty rowIds array', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const { nodeTable, edgeTable } = createTestTableRecord(networkId)

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.deleteRows(networkId, [])
      })

      // Should not throw and should not change anything
      expect(result.current.tables[networkId]).toBeDefined()
    })
  })

  describe('addRows', () => {
    it('should handle empty rowIds array', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const { nodeTable, edgeTable } = createTestTableRecord(networkId)

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.addRows(networkId, [])
      })

      // Should not throw - currently this is a no-op
      expect(result.current.tables[networkId]).toBeDefined()
    })
  })

  describe('editRows', () => {
    it('should update multiple rows', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const { nodeTable, edgeTable } = createTestTableRecord(networkId)
      nodeTable.rows.set('n1', { name: 'Node 1' })
      nodeTable.rows.set('n2', { name: 'Node 2' })

      const rowsToEdit = new Map<IdType, Record<string, ValueType>>([
        ['n1', { name: 'Updated Node 1', score: 100 }],
        ['n2', { name: 'Updated Node 2' }],
      ])

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.editRows(networkId, TableType.NODE, rowsToEdit)
      })

      const updatedTable = result.current.tables[networkId].nodeTable
      expect(updatedTable.rows.get('n1')?.name).toBe('Updated Node 1')
      expect(updatedTable.rows.get('n1')?.score).toBe(100)
      expect(updatedTable.rows.get('n2')?.name).toBe('Updated Node 2')
    })
  })

  describe('delete', () => {
    it('should delete tables for a network', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const { nodeTable, edgeTable } = createTestTableRecord(networkId)

      act(() => {
        result.current.add(networkId, nodeTable, edgeTable)
        result.current.delete(networkId)
      })

      expect(result.current.tables[networkId]).toBeUndefined()
    })

    it('should not affect other networks', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const { nodeTable: nodeTable1, edgeTable: edgeTable1 } =
        createTestTableRecord(networkId1)
      const { nodeTable: nodeTable2, edgeTable: edgeTable2 } =
        createTestTableRecord(networkId2)

      act(() => {
        result.current.add(networkId1, nodeTable1, edgeTable1)
        result.current.add(networkId2, nodeTable2, edgeTable2)
        result.current.delete(networkId1)
      })

      expect(result.current.tables[networkId1]).toBeUndefined()
      expect(result.current.tables[networkId2]).toBeDefined()
    })
  })

  describe('deleteAll', () => {
    it('should delete all tables', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const { nodeTable: nodeTable1, edgeTable: edgeTable1 } =
        createTestTableRecord(networkId1)
      const { nodeTable: nodeTable2, edgeTable: edgeTable2 } =
        createTestTableRecord(networkId2)

      act(() => {
        result.current.add(networkId1, nodeTable1, edgeTable1)
        result.current.add(networkId2, nodeTable2, edgeTable2)
        result.current.deleteAll()
      })

      expect(result.current.tables).toEqual({})
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete workflow: add, modify columns, set values, delete', () => {
      const { result } = renderHook(() => useTableStore())
      const networkId: IdType = 'network-1'
      const { nodeTable, edgeTable } = createTestTableRecord(networkId)

      act(() => {
        // Add tables
        result.current.add(networkId, nodeTable, edgeTable)
      })
      expect(result.current.tables[networkId]).toBeDefined()

      act(() => {
        // Create column
        result.current.createColumn(
          networkId,
          'node',
          'newCol',
          ValueTypeName.Integer,
          0,
        )
      })

      act(() => {
        // Set value
        result.current.setValue(networkId, TableType.NODE, 'n1', 'newCol', 100)
      })

      act(() => {
        // Apply value to elements
        result.current.applyValueToElements(
          networkId,
          'node',
          'newCol',
          200,
          ['n2'],
        )
      })

      act(() => {
        // Move column
        result.current.moveColumn(networkId, 'node', 0, 1)
      })

      act(() => {
        // Delete rows
        result.current.deleteRows(networkId, ['n1'])
      })

      const updatedTable = result.current.tables[networkId].nodeTable
      expect(updatedTable.rows.has('n1')).toBe(false)
      expect(updatedTable.rows.get('n2')?.newCol).toBe(200)
    })
  })
})

