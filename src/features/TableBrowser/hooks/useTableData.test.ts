import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ValueTypeName } from '../../../models/TableModel'
import { useTableData } from './useTableData'
import { ID_COLUMN_ID } from '../idColumn'
import { TableBrowserTab } from '../components/TableBrowserTabs'

describe('useTableData', () => {
  const mockNodeTable = {
    id: 'nodes',
    rows: new Map([
      ['node1', { name: 'Node 1', score: 10 }],
      ['node2', { name: 'Node 2', score: 20 }],
    ]),
    columns: [
      { name: 'name', type: ValueTypeName.String },
      { name: 'score', type: ValueTypeName.Double },
    ],
  }

  const mockEdgeTable = {
    id: 'edges',
    rows: new Map([
      ['edge1', { interaction: 'pp' }],
    ]),
    columns: [
      { name: 'interaction', type: ValueTypeName.String },
    ],
  }

  it('initializes with node table columns and rows when currentTabIndex is 0', () => {
    const { result } = renderHook(() => useTableData({
      currentTabIndex: TableBrowserTab.NODES,
      nodeTable: mockNodeTable as any,
      edgeTable: mockEdgeTable as any,
      network: undefined,
      tableDisplayConfiguration: undefined,
      selectedNodes: [],
      selectedEdges: [],
    }))

    expect(result.current.currentTable).toBe(mockNodeTable)
    expect(result.current.allColumns.length).toBeGreaterThan(0)
    expect(result.current.allColumns[0].id).toBe(ID_COLUMN_ID)
    
    // Rows should be the full node table
    expect(result.current.rows.length).toBe(2)
  })

  it('filters rows based on selectedElements', () => {
    const { result } = renderHook(() => useTableData({
      currentTabIndex: TableBrowserTab.NODES,
      nodeTable: mockNodeTable as any,
      edgeTable: mockEdgeTable as any,
      network: undefined,
      tableDisplayConfiguration: undefined,
      selectedNodes: ['node1'],
      selectedEdges: [],
    }))

    // Should only return the selected node
    expect(result.current.rows.length).toBe(1)
    expect(result.current.rows[0].id).toBe('node1')
  })

  it('initializes sort state from tableDisplayConfiguration', () => {
    const mockDisplayConfig = {
      nodeTable: {
        sortColumn: 'score',
        sortDirection: 'descending' as const,
        columnConfiguration: [],
      },
      edgeTable: undefined,
    }

    const { result } = renderHook(() => useTableData({
      currentTabIndex: TableBrowserTab.NODES,
      nodeTable: mockNodeTable as any,
      edgeTable: mockEdgeTable as any,
      network: undefined,
      tableDisplayConfiguration: mockDisplayConfig as any,
      selectedNodes: [],
      selectedEdges: [],
    }))

    expect(result.current.sort.column).toBe('score')
    expect(result.current.sort.direction).toBe('desc')
    
    expect(result.current.rows[0].id).toBe('node2')
    expect(result.current.rows[1].id).toBe('node1')
  })

  it('does not include edge virtual columns when both tables are undefined and currentTabIndex is 0', () => {
    const { result } = renderHook(() => useTableData({
      currentTabIndex: 0,
      nodeTable: undefined,
      edgeTable: undefined,
      network: undefined,
      tableDisplayConfiguration: undefined,
      selectedNodes: [],
      selectedEdges: [],
    }))

    const columnIds = result.current.allColumns.map(c => c.id)
    expect(columnIds).not.toContain('__sourceNodeName')
    expect(columnIds).not.toContain('__targetNodeName')
  })
})
