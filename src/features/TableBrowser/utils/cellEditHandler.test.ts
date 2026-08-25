// @vitest-environment node
import { Item } from '@glideapps/glide-data-grid'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { ValueTypeName } from '../../../models/TableModel'
import { handleCellEdit } from './cellEditHandler'

describe('handleCellEdit', () => {
  const mockPostEdit = vi.fn()
  const mockSetCellValue = vi.fn()
  const mockSetNetworkModified = vi.fn()
  const mockNodeTable = { id: 'nodeTable', rows: new Map(), columns: [] }

  const baseArgs = {
    currentTable: mockNodeTable,
    nodeTable: mockNodeTable,
    currentNetworkId: 'test-network-1',
    postEdit: mockPostEdit,
    setCellValue: mockSetCellValue,
    setNetworkModified: mockSetNetworkModified,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates cell value for standard string column', () => {
    const rows = [{ id: 'node-1', name: 'Node 1' }]
    const allColumns = [{ id: 'name', type: ValueTypeName.String }]

    handleCellEdit({
      ...baseArgs,
      cell: [0, 0] as Item,
      newValue: { data: 'Updated Node 1' } as any,
      rows,
      allColumns,
    })

    expect(mockPostEdit).toHaveBeenCalledWith(
      UndoCommandType.SET_CELL_VALUE,
      'Set cell value',
      ['test-network-1', 'node', 'node-1', 'name', 'Node 1'],
      ['test-network-1', 'node', 'node-1', 'name', 'Updated Node 1'],
    )
    expect(mockSetCellValue).toHaveBeenCalledWith(
      'test-network-1',
      'node',
      'node-1',
      'name',
      'Updated Node 1',
    )
    expect(mockSetNetworkModified).toHaveBeenCalledWith('test-network-1', true)
  })

  it('correctly associates column index with the right column using allColumns, ignoring shifted indexes', () => {
    // This specifically tests the fix for #626 where allColumns has virtual columns at the start
    const rows = [{ id: 'node-1', selected: false, name: 'Node 1' }]
    const allColumns = [
      { id: '__id', type: ValueTypeName.String, isVirtual: true },
      { id: 'selected', type: ValueTypeName.Boolean },
      { id: 'name', type: ValueTypeName.String },
    ]

    // User edits the 'selected' column which is index 1 in allColumns
    handleCellEdit({
      ...baseArgs,
      cell: [1, 0] as Item,
      newValue: { data: true } as any,
      rows,
      allColumns,
    })

    expect(mockSetCellValue).toHaveBeenCalledWith(
      'test-network-1',
      'node',
      'node-1',
      'selected', // the correct column key was used, not 'name'
      true,
    )
  })

  it('blocks updating integer column with float value', () => {
    const rows = [{ id: 'node-1', score: 10 }]
    const allColumns = [{ id: 'score', type: ValueTypeName.Integer }]

    handleCellEdit({
      ...baseArgs,
      cell: [0, 0] as Item,
      newValue: { data: 15.5 } as any,
      rows,
      allColumns,
    })

    // It should ignore the value completely
    expect(mockPostEdit).not.toHaveBeenCalled()
    expect(mockSetCellValue).not.toHaveBeenCalled()
  })

  it('deserializes list types before setting value', () => {
    const rows = [{ id: 'node-1', aliases: [] }]
    const allColumns = [{ id: 'aliases', type: ValueTypeName.ListString }]

    handleCellEdit({
      ...baseArgs,
      cell: [0, 0] as Item,
      newValue: { data: 'alias1, alias2' } as any,
      rows,
      allColumns,
    })

    expect(mockSetCellValue).toHaveBeenCalledWith(
      'test-network-1',
      'node',
      'node-1',
      'aliases',
      ['alias1', 'alias2'], // Parsed array
    )
  })
})
