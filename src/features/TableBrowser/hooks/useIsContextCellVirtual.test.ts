import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useIsContextCellVirtual } from './useIsContextCellVirtual'

describe('useIsContextCellVirtual', () => {
  it('returns false if contextMenu is null', () => {
    const { result } = renderHook(() => useIsContextCellVirtual(null, []))
    expect(result.current).toBe(false)
  })

  it('returns false if contextMenu cell column is out of bounds', () => {
    const contextMenu = { cell: [0, 0] as [number, number] }
    const { result } = renderHook(() =>
      useIsContextCellVirtual(contextMenu, []),
    )
    expect(result.current).toBe(false)
  })

  it('returns false if column is not virtual', () => {
    const contextMenu = { cell: [0, 0] as [number, number] }
    const allColumns = [{ isVirtual: false }]
    const { result } = renderHook(() =>
      useIsContextCellVirtual(contextMenu, allColumns),
    )
    expect(result.current).toBe(false)
  })

  it('returns true if column is virtual', () => {
    const contextMenu = { cell: [0, 0] as [number, number] }
    const allColumns = [{ isVirtual: true }]
    const { result } = renderHook(() =>
      useIsContextCellVirtual(contextMenu, allColumns),
    )
    expect(result.current).toBe(true)
  })
})
