// @vitest-environment node
import { GridColumn } from '@glideapps/glide-data-grid'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { handleColumnMove, handleColumnResize } from './columnHandlers'

describe('columnHandlers', () => {
  const mockMoveColumn = vi.fn()
  const mockSetColumnWidth = vi.fn()
  const mockCreateUpdatedTableDisplayConfiguration = vi.fn()
  const mockSetTableDisplayConfiguration = vi.fn()
  const mockSetNetworkModified = vi.fn()

  const mockNodeTable = { id: 'nodeTable', rows: new Map(), columns: [] }
  const networkId = 'test-network-1'

  const baseArgs = {
    networkId,
    currentTable: mockNodeTable as any,
    nodeTable: mockNodeTable as any,
    edgeTable: undefined,
    tableDisplayConfiguration: {
      nodeTable: { columnConfiguration: [], sortColumn: undefined, sortDirection: undefined },
      edgeTable: { columnConfiguration: [], sortColumn: undefined, sortDirection: undefined },
    } as any,
    createUpdatedTableDisplayConfiguration: mockCreateUpdatedTableDisplayConfiguration,
    setTableDisplayConfiguration: mockSetTableDisplayConfiguration,
    setNetworkModified: mockSetNetworkModified,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateUpdatedTableDisplayConfiguration.mockReturnValue('new-config')
  })

  describe('handleColumnMove', () => {
    it('moves a column and updates configuration', () => {
      const allColumns = [
        { id: 'col1', title: 'Col 1' },
        { id: 'col2', title: 'Col 2' },
        { id: 'col3', title: 'Col 3' },
      ]

      handleColumnMove({
        ...baseArgs,
        startIndex: 0,
        endIndex: 2,
        allColumns,
        tableDisplayConfiguration: {
          nodeTable: {
            columnConfiguration: [
              { attributeName: 'col1', visible: true, columnWidth: 100 },
              { attributeName: 'col2', visible: true, columnWidth: 100 },
              { attributeName: 'col3', visible: true, columnWidth: 100 },
            ],
            sortColumn: undefined,
            sortDirection: undefined,
          },
        } as any,
        moveColumn: mockMoveColumn,
      })

      // The moveColumn store action should be called
      expect(mockMoveColumn).toHaveBeenCalledWith(networkId, 'node', 0, 2)
      
      // Configuration should be updated with new order
      expect(mockCreateUpdatedTableDisplayConfiguration).toHaveBeenCalledWith({
        columnConfiguration: [
          { attributeName: 'col2', visible: true, columnWidth: 100 },
          { attributeName: 'col3', visible: true, columnWidth: 100 },
          { attributeName: 'col1', visible: true, columnWidth: 100 },
        ],
      })
      expect(mockSetTableDisplayConfiguration).toHaveBeenCalledWith(networkId, 'new-config')
      expect(mockSetNetworkModified).toHaveBeenCalledWith(networkId, true)
    })

    it('prevents moving virtual columns', () => {
      const allColumns = [
        { id: '__id', isVirtual: true },
        { id: 'col1' },
      ]

      handleColumnMove({
        ...baseArgs,
        startIndex: 0,
        endIndex: 1,
        allColumns,
        moveColumn: mockMoveColumn,
      })

      expect(mockMoveColumn).not.toHaveBeenCalled()
      expect(mockSetTableDisplayConfiguration).not.toHaveBeenCalled()
    })
  })

  describe('handleColumnResize', () => {
    it('resizes a column and updates configuration', () => {
      const allColumns = [
        { id: 'col1' },
        { id: 'col2' },
      ]

      handleColumnResize({
        ...baseArgs,
        column: { id: 'col1' } as GridColumn,
        newSize: 200,
        colIndex: 0,
        allColumns,
        tableDisplayConfiguration: {
          nodeTable: {
            columnConfiguration: [
              { attributeName: 'col1', visible: true, columnWidth: 100 },
              { attributeName: 'col2', visible: true, columnWidth: 100 },
            ],
            sortColumn: undefined,
            sortDirection: undefined,
          },
        } as any,
        setColumnWidth: mockSetColumnWidth,
      })

      expect(mockSetColumnWidth).toHaveBeenCalledWith(networkId, 'node', 'col1', 200)

      expect(mockCreateUpdatedTableDisplayConfiguration).toHaveBeenCalledWith({
        columnConfiguration: [
          { attributeName: 'col1', visible: true, columnWidth: 200 },
          { attributeName: 'col2', visible: true, columnWidth: 100 },
        ],
      })
      expect(mockSetTableDisplayConfiguration).toHaveBeenCalledWith(networkId, 'new-config')
    })

    it('prevents resizing virtual columns', () => {
      const allColumns = [
        { id: '__id', isVirtual: true },
      ]

      handleColumnResize({
        ...baseArgs,
        column: { id: '__id' } as GridColumn,
        newSize: 200,
        colIndex: 0,
        allColumns,
        setColumnWidth: mockSetColumnWidth,
      })

      expect(mockSetColumnWidth).not.toHaveBeenCalled()
      expect(mockSetTableDisplayConfiguration).not.toHaveBeenCalled()
    })
  })
})
