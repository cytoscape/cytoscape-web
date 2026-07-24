import { act, renderHook } from '@testing-library/react'
import { CompactSelection } from '@glideapps/glide-data-grid'
import { describe, expect, it } from 'vitest'

import { useTableSelection } from './useTableSelection'

describe('useTableSelection', () => {
  it('initializes with empty selections for nodes and edges', () => {
    const { result } = renderHook(() => useTableSelection({ currentTabIndex: 0 }))
    expect(result.current.nodeSelection.rows.length).toBe(0)
    expect(result.current.edgeSelection.rows.length).toBe(0)
    expect(result.current.selection).toBe(result.current.nodeSelection)
  })

  it('updates node selection when currentTabIndex is 0', () => {
    const { result } = renderHook(() => useTableSelection({ currentTabIndex: 0 }))
    
    act(() => {
      result.current.onGridSelectionChange({
        columns: CompactSelection.empty(),
        rows: CompactSelection.fromSingleSelection(5),
      })
    })

    expect(result.current.nodeSelection.rows.toArray()).toEqual([5])
    expect(result.current.edgeSelection.rows.length).toBe(0)
    expect(result.current.selection.rows.toArray()).toEqual([5])
  })

  it('updates edge selection when currentTabIndex is 1', () => {
    const { result } = renderHook(() => useTableSelection({ currentTabIndex: 1 }))
    
    act(() => {
      result.current.onGridSelectionChange({
        columns: CompactSelection.empty(),
        rows: CompactSelection.fromSingleSelection(10),
      })
    })

    expect(result.current.edgeSelection.rows.toArray()).toEqual([10])
    expect(result.current.nodeSelection.rows.length).toBe(0)
    expect(result.current.selection.rows.toArray()).toEqual([10])
  })
})
