import { GridCellKind, Item } from '@glideapps/glide-data-grid'
import { describe, expect, it } from 'vitest'

import { ValueTypeName } from '../../../models/TableModel'
import { getCellKind, handleGetCellContent } from './cellContentHandler'

describe('cellContentHandler', () => {
  describe('getCellKind', () => {
    it('maps value types to correct grid cell kinds', () => {
      expect(getCellKind(ValueTypeName.String)).toBe(GridCellKind.Text)
      expect(getCellKind(ValueTypeName.Boolean)).toBe(GridCellKind.Boolean)
      expect(getCellKind(ValueTypeName.Integer)).toBe(GridCellKind.Number)
      expect(getCellKind(ValueTypeName.Double)).toBe(GridCellKind.Number)
      expect(getCellKind(ValueTypeName.ListString)).toBe(GridCellKind.Text)
      expect(getCellKind('unknown_type' as ValueTypeName)).toBe(
        GridCellKind.Text,
      )
    })
  })

  describe('handleGetCellContent', () => {
    const mockRows = [
      { id: 'node-1', name: 'Node 1', score: 10.5, active: true },
    ]

    it('returns empty text cell if column or row is undefined', () => {
      const result = handleGetCellContent({
        cell: [0, 1] as Item, // Row index 1 does not exist
        rows: mockRows,
        allColumns: [{ id: 'name', type: ValueTypeName.String }],
      })
      expect(result.kind).toBe(GridCellKind.Text)
      expect((result as any).displayData).toBe('')
    })

    it('handles virtual columns correctly', () => {
      const mockVirtualColumn = {
        id: '__id',
        isVirtual: true,
        getValue: (row: any) => row.id,
      }
      
      const result = handleGetCellContent({
        cell: [0, 0] as Item,
        rows: mockRows,
        allColumns: [mockVirtualColumn],
      })
      
      expect(result.kind).toBe(GridCellKind.Text)
      expect((result as any).displayData).toBe('node-1')
      expect((result as any).readonly).toBe(true)
      expect((result as any).allowOverlay).toBe(false)
    })

    it('formats numbers correctly', () => {
      const result = handleGetCellContent({
        cell: [0, 0] as Item,
        rows: mockRows,
        allColumns: [{ id: 'score', type: ValueTypeName.Double }],
      })
      
      expect(result.kind).toBe(GridCellKind.Number)
      expect((result as any).displayData).toBe('10.5')
      expect((result as any).data).toBe(10.5)
      expect((result as any).readonly).toBe(false)
    })

    it('formats booleans correctly without displayData', () => {
      const result = handleGetCellContent({
        cell: [0, 0] as Item,
        rows: mockRows,
        allColumns: [{ id: 'active', type: ValueTypeName.Boolean }],
      })
      
      expect(result.kind).toBe(GridCellKind.Boolean)
      expect((result as any).data).toBe(true)
      expect((result as any).readonly).toBe(false)
    })

    it('detects URIs and returns Uri kind', () => {
      const mockUriRow = [{ id: 'node-2', link: 'https://cytoscape.org' }]
      const result = handleGetCellContent({
        cell: [0, 0] as Item,
        rows: mockUriRow,
        allColumns: [{ id: 'link', type: ValueTypeName.String }],
      })
      
      expect(result.kind).toBe(GridCellKind.Uri)
      expect((result as any).data).toBe('https://cytoscape.org')
    })
  })
})
