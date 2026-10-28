import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useActiveHeading } from './useActiveHeading'

// jsdom has no layout: give each heading a fixed top and pin the page at its
// bottom, the case where the scroll position cannot tell sections apart.
const tops: Record<string, number> = { a: -400, b: 30, c: 300 }

beforeEach(() => {
  for (const id of Object.keys(tops)) {
    const h = document.createElement('h2')
    h.id = id
    h.getBoundingClientRect = () => ({ top: tops[id] }) as DOMRect
    document.body.appendChild(h)
  }
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: window.innerHeight + window.scrollY,
  })
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useActiveHeading', () => {
  it('marks the last section when the page is scrolled to the bottom', () => {
    const { result } = renderHook(() =>
      useActiveHeading(['a', 'b', 'c'], 72, ''),
    )
    expect(result.current).toBe('c')
  })

  it('marks the section the reader jumped to, even at the bottom', () => {
    // A link to #b near the end of a page cannot scroll b to the top, so
    // the scroll position alone would mark c.
    const { result } = renderHook(() =>
      useActiveHeading(['a', 'b', 'c'], 72, '#b'),
    )
    expect(result.current).toBe('b')
  })

  it('follows the scroll position again once the reader scrolls', () => {
    const { result } = renderHook(() =>
      useActiveHeading(['a', 'b', 'c'], 72, '#b'),
    )
    act(() => {
      window.dispatchEvent(new WheelEvent('wheel'))
    })
    expect(result.current).toBe('c')
  })
})
