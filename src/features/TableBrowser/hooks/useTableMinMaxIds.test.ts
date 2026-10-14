import { renderHook } from '@testing-library/react'
import { expect, test, describe } from 'vitest'
import { useTableMinMaxIds } from './useTableMinMaxIds'
import { Table } from '../../../models/TableModel'

describe('useTableMinMaxIds', () => {
  test('returns undefined for empty tables', () => {
    const { result } = renderHook(() => useTableMinMaxIds(undefined, undefined))
    expect(result.current.minNodeId).toBeUndefined()
    expect(result.current.maxNodeId).toBeUndefined()
    expect(result.current.minEdgeId).toBeUndefined()
    expect(result.current.maxEdgeId).toBeUndefined()
  })

  test('calculates correct min/max for node table', () => {
    const nodeTable: Table = {
      id: 'nodes',
      columns: [],
      rows: new Map([
        ['5', {}],
        ['2', {}],
        ['10', {}],
      ]),
    }
    const { result } = renderHook(() => useTableMinMaxIds(nodeTable, undefined))
    expect(result.current.minNodeId).toBe(2)
    expect(result.current.maxNodeId).toBe(10)
    expect(result.current.minEdgeId).toBeUndefined()
    expect(result.current.maxEdgeId).toBeUndefined()
  })

  test('calculates correct min/max for edge table', () => {
    const edgeTable: Table = {
      id: 'edges',
      columns: [],
      rows: new Map([
        ['e100', {}],
        ['e50', {}],
        ['e200', {}],
      ]),
    }
    const { result } = renderHook(() => useTableMinMaxIds(undefined, edgeTable))
    expect(result.current.minNodeId).toBeUndefined()
    expect(result.current.maxNodeId).toBeUndefined()
    expect(result.current.minEdgeId).toBe(50)
    expect(result.current.maxEdgeId).toBe(200)
  })
})
