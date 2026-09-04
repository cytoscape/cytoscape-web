// @vitest-environment node
import { CompactSelection } from '@glideapps/glide-data-grid'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { ValueTypeName } from '../../../models/TableModel'
import {
  handleApplyToEntireColumn,
  handleApplyToSelected,
  handleSelectFromSelection,
} from './contextMenuActions'

// The `networkModified` flag is no longer asserted here: as of #680 it is set
// by `postEdit` (see `src/app-api/core/undo.test.ts`), not by these handlers.
describe('contextMenuActions', () => {
  const mockPostEdit = vi.fn()
  const mockApplyValueToElements = vi.fn()
  const mockHandleContextMenuClose = vi.fn()
  const mockExclusiveSelect = vi.fn()
  const mockSetSelection = vi.fn()

  const mockNodeTableRows = new Map()
  mockNodeTableRows.set('node-1', { id: 'node-1', name: 'Node 1', score: 10 })
  mockNodeTableRows.set('node-2', { id: 'node-2', name: 'Node 2', score: 20 })

  const mockNodeTable = {
    id: 'nodeTable',
    rows: mockNodeTableRows,
    columns: [],
  }
  const networkId = 'test-network-1'

  const allColumns = [
    { id: 'name', type: ValueTypeName.String },
    { id: 'score', type: ValueTypeName.Integer },
  ]

  const rows = Array.from(mockNodeTableRows.values())

  const baseArgs = {
    rows,
    allColumns,
    currentTable: mockNodeTable as any,
    nodeTable: mockNodeTable as any,
    currentNetworkId: networkId,
    postEdit: mockPostEdit,
    applyValueToElements: mockApplyValueToElements,
    handleContextMenuClose: mockHandleContextMenuClose,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleApplyToEntireColumn', () => {
    it('applies the cell value to the entire column', () => {
      handleApplyToEntireColumn({
        ...baseArgs,
        contextMenuCell: [0, 0], // 'name' column, first row ('Node 1')
      })

      const expectedEdits = [
        { row: 'node-1', column: 'name', value: 'Node 1' },
        { row: 'node-2', column: 'name', value: 'Node 1' }, // Overwritten with 'Node 1'
      ]

      expect(mockPostEdit).toHaveBeenCalledWith(
        UndoCommandType.APPLY_VALUE_TO_COLUMN,
        'Apply value to column',
        expect.any(Array),
        [networkId, 'node', expectedEdits],
      )

      expect(mockApplyValueToElements).toHaveBeenCalledWith(
        networkId,
        'node',
        'name',
        'Node 1',
        undefined, // Undefined means all elements
      )

      expect(mockHandleContextMenuClose).toHaveBeenCalled()
    })
  })

  describe('handleApplyToSelected', () => {
    it('applies the cell value only to selected rows', () => {
      // The context menu only gets passed the subset of rows that are selected or visible
      const selectedRowsSubset = [{ id: 'node-2', name: 'Node 2', score: 20 }]

      handleApplyToSelected({
        ...baseArgs,
        rows: selectedRowsSubset,
        contextMenuCell: [1, 0], // 'score' column, first selected row ('node-2', score 20)
      })

      const expectedEdits = [{ row: 'node-2', column: 'score', value: 20 }]

      expect(mockPostEdit).toHaveBeenCalledWith(
        UndoCommandType.APPLY_VALUE_TO_SELECTED,
        'Apply value to selected elements',
        expect.any(Array),
        [networkId, 'node', expectedEdits],
      )

      expect(mockApplyValueToElements).toHaveBeenCalledWith(
        networkId,
        'node',
        'score',
        20,
        ['node-2'], // Only applied to these IDs
      )

      expect(mockHandleContextMenuClose).toHaveBeenCalled()
    })
  })

  describe('handleSelectFromSelection', () => {
    it('selects the elements in the workspace and clears the grid selection', () => {
      const mockSelection = {
        rows: CompactSelection.fromSingleSelection(1),
        columns: CompactSelection.empty(),
        current: undefined, // no current cell selection
      } as any

      handleSelectFromSelection({
        selection: mockSelection,
        rows,
        currentTable: mockNodeTable as any,
        nodeTable: mockNodeTable as any,
        currentNetworkId: networkId,
        exclusiveSelect: mockExclusiveSelect,
        setSelection: mockSetSelection,
        handleContextMenuClose: mockHandleContextMenuClose,
      })

      // Select node-2 which is at index 1
      expect(mockExclusiveSelect).toHaveBeenCalledWith(
        networkId,
        ['node-2'],
        [],
      )

      expect(mockSetSelection).toHaveBeenCalledWith({
        rows: expect.any(Object),
        columns: mockSelection.columns,
        current: undefined,
      })

      expect(mockHandleContextMenuClose).toHaveBeenCalled()
    })
  })
})
