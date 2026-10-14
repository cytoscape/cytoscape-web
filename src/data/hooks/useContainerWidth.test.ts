import { act, renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useContainerWidth } from './useContainerWidth'

/**
 * Regression test for the Table Browser width bug: the grid was sized with
 * window.innerWidth, so opening or widening the right side panel left the
 * grid wider than its container and the last columns unreachable behind the
 * panel. The fix measures the actual container element with a ResizeObserver;
 * these tests pin the hook's contract: report the element's width on mount
 * and follow every observed resize (window size never involved).
 */

type ObserverCallback = (
  entries: Array<{ contentRect: { width: number } }>,
) => void

let observerCallback: ObserverCallback | null = null
let observedElements: Element[] = []
let disconnectCount = 0

class MockResizeObserver {
  private readonly callback: ObserverCallback

  constructor(callback: ObserverCallback) {
    this.callback = callback
    observerCallback = callback
  }

  observe(element: Element): void {
    observedElements.push(element)
  }

  disconnect(): void {
    disconnectCount += 1
  }
}

const renderWithElement = (
  element: HTMLElement | null,
): ReturnType<typeof renderHook<number, void>> =>
  renderHook(() => {
    const ref = useRef<HTMLElement | null>(element)
    return useContainerWidth(ref)
  })

const elementWithWidth = (width: number): HTMLElement => {
  const element = document.createElement('div')
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    width,
    height: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  return element
}

describe('useContainerWidth', () => {
  beforeEach(() => {
    observerCallback = null
    observedElements = []
    disconnectCount = 0
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reports the container width measured on mount, not the window width', () => {
    const element = elementWithWidth(800)
    const { result } = renderWithElement(element)

    expect(result.current).toBe(800)
    // jsdom's window.innerWidth is 1024 — the hook must not fall back to it
    expect(result.current).not.toBe(window.innerWidth)
  })

  it('observes the container element for size changes', () => {
    const element = elementWithWidth(800)
    renderWithElement(element)

    expect(observedElements).toEqual([element])
  })

  it('updates when the observed container is resized', () => {
    const element = elementWithWidth(800)
    const { result } = renderWithElement(element)

    act(() => {
      observerCallback?.([{ contentRect: { width: 500 } }])
    })

    expect(result.current).toBe(500)
  })

  it('uses the most recent entry when a batch reports several sizes', () => {
    const element = elementWithWidth(800)
    const { result } = renderWithElement(element)

    act(() => {
      observerCallback?.([
        { contentRect: { width: 700 } },
        { contentRect: { width: 640 } },
      ])
    })

    expect(result.current).toBe(640)
  })

  it('disconnects the observer on unmount', () => {
    const element = elementWithWidth(800)
    const { unmount } = renderWithElement(element)

    unmount()

    expect(disconnectCount).toBe(1)
  })

  it('returns 0 when the ref has no element yet', () => {
    const { result } = renderWithElement(null)

    expect(result.current).toBe(0)
    expect(observedElements).toEqual([])
  })

  it('still measures on mount when ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const element = elementWithWidth(800)
    const { result } = renderWithElement(element)

    expect(result.current).toBe(800)
  })
})
