import { GridMouseEventArgs } from '@glideapps/glide-data-grid'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HEADER_TOOLTIP_DELAY_MS, useHeaderTooltip } from './useHeaderTooltip'

const bounds = { x: 10, y: 20, width: 120, height: 32 }

const headerHover = (columnIndex: number): GridMouseEventArgs =>
  ({
    kind: 'header',
    location: [columnIndex, -1],
    bounds,
  }) as unknown as GridMouseEventArgs

const cellHover = (): GridMouseEventArgs =>
  ({
    kind: 'cell',
    location: [1, 4],
    bounds,
  }) as unknown as GridMouseEventArgs

const outOfBoundsHover = (): GridMouseEventArgs =>
  ({
    kind: 'out-of-bounds',
    location: [1, -1],
  }) as unknown as GridMouseEventArgs

describe('useHeaderTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('has no target until the pointer rests on a header', () => {
    const { result } = renderHook(() => useHeaderTooltip())

    act(() => {
      result.current.onItemHovered(headerHover(2))
    })
    expect(result.current.target).toBeNull()

    act(() => {
      vi.advanceTimersByTime(HEADER_TOOLTIP_DELAY_MS)
    })
    expect(result.current.target).toEqual({ columnIndex: 2, bounds })
  })

  it('does not restart the delay while the pointer stays on the same header', () => {
    const { result } = renderHook(() => useHeaderTooltip(200))

    act(() => {
      result.current.onItemHovered(headerHover(3))
      vi.advanceTimersByTime(150)
      result.current.onItemHovered(headerHover(3))
      vi.advanceTimersByTime(60)
    })

    expect(result.current.target).toEqual({ columnIndex: 3, bounds })
  })

  it('switches to the next header without showing the previous one', () => {
    const { result } = renderHook(() => useHeaderTooltip(200))

    act(() => {
      result.current.onItemHovered(headerHover(0))
      vi.advanceTimersByTime(200)
    })
    expect(result.current.target?.columnIndex).toBe(0)

    act(() => {
      result.current.onItemHovered(headerHover(1))
    })
    expect(result.current.target).toBeNull()

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.target?.columnIndex).toBe(1)
  })

  it.each([
    ['cell', cellHover],
    ['out-of-bounds', outOfBoundsHover],
  ])('dismisses the tooltip on a %s hover', (_kind, makeArgs) => {
    const { result } = renderHook(() => useHeaderTooltip(200))

    act(() => {
      result.current.onItemHovered(headerHover(1))
      vi.advanceTimersByTime(200)
    })
    expect(result.current.target).not.toBeNull()

    act(() => {
      result.current.onItemHovered(makeArgs())
      vi.advanceTimersByTime(200)
    })
    expect(result.current.target).toBeNull()
  })

  it('cancels a pending tooltip when cleared', () => {
    const { result } = renderHook(() => useHeaderTooltip(200))

    act(() => {
      result.current.onItemHovered(headerHover(1))
      result.current.clearTooltip()
      vi.advanceTimersByTime(200)
    })

    expect(result.current.target).toBeNull()
  })

  it('shows the tooltip again after re-entering the same header', () => {
    const { result } = renderHook(() => useHeaderTooltip(200))

    act(() => {
      result.current.onItemHovered(headerHover(1))
      vi.advanceTimersByTime(200)
      result.current.clearTooltip()
      result.current.onItemHovered(headerHover(1))
      vi.advanceTimersByTime(200)
    })

    expect(result.current.target?.columnIndex).toBe(1)
  })
})
