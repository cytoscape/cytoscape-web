import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useTableScrollToTop } from './useTableScrollToTop'

describe('useTableScrollToTop', () => {
  it('calls scrollTo on refs when selectedElements changes', () => {
    const nodeScrollTo = vi.fn()
    const edgeScrollTo = vi.fn()
    const nodeRef = { current: { scrollTo: nodeScrollTo } } as any
    const edgeRef = { current: { scrollTo: edgeScrollTo } } as any

    const emptyArray: string[] = []

    const { rerender } = renderHook(
      ({ selected }) => useTableScrollToTop(nodeRef, edgeRef, selected),
      { initialProps: { selected: emptyArray } }
    )

    // Initially called on mount
    expect(nodeScrollTo).toHaveBeenCalledTimes(1)
    expect(edgeScrollTo).toHaveBeenCalledTimes(1)

    // Re-rendering with same props should not trigger again
    rerender({ selected: emptyArray })
    expect(nodeScrollTo).toHaveBeenCalledTimes(1)

    // Re-rendering with new selection should trigger
    rerender({ selected: ['node1'] })
    expect(nodeScrollTo).toHaveBeenCalledTimes(2)
    expect(edgeScrollTo).toHaveBeenCalledTimes(2)
  })
})
