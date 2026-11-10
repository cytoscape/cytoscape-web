import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useContainerSize } from './useContainerSize'

// jsdom has no ResizeObserver
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  disconnected = false

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this)
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {
    this.disconnected = true
  }

  trigger(): void {
    this.callback([], this as unknown as ResizeObserver)
  }
}

describe('useContainerSize', () => {
  let box = { width: 0, height: 0 }
  const element = {
    getBoundingClientRect: () => box,
  } as unknown as HTMLElement

  const resizeTo = (width: number, height: number): void => {
    box = { width, height }
    act(() => {
      FakeResizeObserver.instances.at(-1)?.trigger()
    })
  }

  beforeEach(() => {
    box = { width: 0, height: 0 }
    FakeResizeObserver.instances = []
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports the size at mount', () => {
    box = { width: 400, height: 300 }

    const ref = { current: element }
    const { result } = renderHook(() => useContainerSize(ref))

    expect(result.current).toEqual({ w: 400, h: 300 })
  })

  it('reports the size of an element that was 0 x 0 at mount', () => {
    const ref = { current: element }
    const { result } = renderHook(() => useContainerSize(ref))
    expect(result.current).toEqual({ w: 0, h: 0 })

    resizeTo(422, 699)

    expect(result.current).toEqual({ w: 422, h: 699 })
  })

  it('follows later changes', () => {
    const ref = { current: element }
    const { result } = renderHook(() => useContainerSize(ref))

    resizeTo(30, 658)
    resizeTo(422, 699)

    expect(result.current).toEqual({ w: 422, h: 699 })
  })

  it.each([
    [0, 0],
    [0, 300],
    [400, 0],
  ])('keeps the last real size at %i x %i', (width, height) => {
    const ref = { current: element }
    const { result } = renderHook(() => useContainerSize(ref))
    resizeTo(422, 699)

    resizeTo(width, height)

    expect(result.current).toEqual({ w: 422, h: 699 })
  })

  it('keeps the same object when the size is unchanged', () => {
    const ref = { current: element }
    const { result } = renderHook(() => useContainerSize(ref))
    resizeTo(422, 699)
    const before = result.current

    resizeTo(422, 699)

    expect(result.current).toBe(before)
  })

  it('stops observing on unmount', () => {
    const ref = { current: element }
    const { unmount } = renderHook(() => useContainerSize(ref))

    unmount()

    expect(FakeResizeObserver.instances.at(-1)?.disconnected).toBe(true)
  })

  it('stays at 0 x 0 without an element', () => {
    const ref = { current: null }
    const { result } = renderHook(() => useContainerSize(ref))

    expect(result.current).toEqual({ w: 0, h: 0 })
    expect(FakeResizeObserver.instances).toHaveLength(0)
  })

  it('still measures once where ResizeObserver does not exist', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    box = { width: 400, height: 300 }
    const ref = { current: element }

    const { result } = renderHook(() => useContainerSize(ref))

    expect(result.current).toEqual({ w: 400, h: 300 })
  })
})
