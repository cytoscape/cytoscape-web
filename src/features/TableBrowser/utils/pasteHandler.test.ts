// @vitest-environment node
import { Item } from '@glideapps/glide-data-grid'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { ValueTypeName } from '../../../models/TableModel'
import { handlePaste } from './pasteHandler'

describe('pasteHandler', () => {
  const mockPostEdit = vi.fn()
  const mockSetValues = vi.fn()
  const mockSetNetworkModified = vi.fn()

  const mockNodeTable = { id: 'nodeTable', rows: new Map(), columns: [] }

  const baseArgs = {
    currentTable: mockNodeTable,
    nodeTable: mockNodeTable,
    currentNetworkId: 'test-network-1',
    postEdit: mockPostEdit,
    setValues: mockSetValues,
    setNetworkModified: mockSetNetworkModified,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pastes values across multiple rows and columns', () => {
    const rows = [
      { id: 'node-1', name: 'Node 1', score: 1 },
      { id: 'node-2', name: 'Node 2', score: 2 },
    ]
    const allColumns = [
      { id: 'name', type: ValueTypeName.String },
      { id: 'score', type: ValueTypeName.Integer },
    ]

    handlePaste({
      ...baseArgs,
      target: [0, 0] as Item,
      values: [
        ['Pasted Name 1', '10'],
        ['Pasted Name 2', '20'],
      ],
      rows,
      allColumns,
    })

    const expectedCellEdits = [
      { row: 'node-1', column: 'name', value: 'Pasted Name 1' },
      { row: 'node-1', column: 'score', value: 10 },
      { row: 'node-2', column: 'name', value: 'Pasted Name 2' },
      { row: 'node-2', column: 'score', value: 20 },
    ]

    expect(mockSetValues).toHaveBeenCalledWith(
      'test-network-1',
      'node',
      expectedCellEdits,
    )
    expect(mockPostEdit).toHaveBeenCalledWith(
      UndoCommandType.APPLY_VALUE_TO_SELECTED,
      'Paste cell values',
      expect.any(Array),
      ['test-network-1', 'node', expectedCellEdits],
    )
    expect(mockSetNetworkModified).toHaveBeenCalledWith('test-network-1', true)
  })

  it('skips virtual columns when pasting', () => {
    const rows = [{ id: 'node-1', name: 'Node 1' }]
    const allColumns = [
      { id: '__id', type: ValueTypeName.String, isVirtual: true },
      { id: 'name', type: ValueTypeName.String },
    ]

    handlePaste({
      ...baseArgs,
      target: [0, 0] as Item, // Attempt to paste starting at the virtual column
      values: [['ignored virtual paste', 'Valid Name']],
      rows,
      allColumns,
    })

    // Only the second column ('name') should be updated
    const expectedCellEdits = [
      { row: 'node-1', column: 'name', value: 'Valid Name' },
    ]

    expect(mockSetValues).toHaveBeenCalledWith(
      'test-network-1',
      'node',
      expectedCellEdits,
    )
  })

  it('skips invalid data types during paste without failing completely', () => {
    const rows = [{ id: 'node-1', score: 10, name: 'Node 1' }]
    const allColumns = [
      { id: 'score', type: ValueTypeName.Integer },
      { id: 'name', type: ValueTypeName.String },
    ]

    handlePaste({
      ...baseArgs,
      target: [0, 0] as Item,
      values: [['invalid-score-string', 'Valid Name']],
      rows,
      allColumns,
    })

    // Only the valid string paste should succeed
    const expectedCellEdits = [
      { row: 'node-1', column: 'name', value: 'Valid Name' },
    ]

    expect(mockSetValues).toHaveBeenCalledWith(
      'test-network-1',
      'node',
      expectedCellEdits,
    )
  })
})
