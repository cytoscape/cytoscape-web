import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PALETTES } from '@/models/VisualStyleModel/impl/colorPalettes'
import { ColorPalettePicker } from './ColorPalettePicker'

const divergingCount = Object.values(PALETTES).filter(
  (palette) => palette.metadata.category === 'diverging',
).length

// Mounting a MUI Popover full of palette previews takes a few hundred
// milliseconds, and the DOM is torn down between tests, so each test pays it
// again. That does not fit the repo's 1s global timeout under full-suite load.
const RENDER_TIMEOUT_MS = 5000

const openPicker = (): HTMLElement => {
  render(
    <ColorPalettePicker
      currentPaletteName="None"
      onPaletteSelect={vi.fn()}
      recommendedCategory="diverging"
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /None/ }))
  return screen.getByTestId('palette-strip')
}

/** jsdom has no layout, so scroll metrics have to be stubbed. */
const stubScrollMetrics = (scrollWidth: number, clientWidth: number): void => {
  for (const [prop, value] of [
    ['scrollWidth', scrollWidth],
    ['clientWidth', clientWidth],
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get: () => value,
    })
  }
}

const restoreScrollMetrics = (): void => {
  for (const prop of ['scrollWidth', 'clientWidth']) {
    delete (HTMLElement.prototype as any)[prop]
  }
}

describe('ColorPalettePicker', () => {
  afterEach(restoreScrollMetrics)

  it(
    'puts the palette strip in a horizontal scroll container',
    () => {
      const style = window.getComputedStyle(openPicker())

      // The Popover Paper is overflow-x: hidden, so the strip itself must
      // scroll or palettes past the viewport edge are unreachable (#653).
      expect(style.overflowX).toBe('auto')
      expect(style.maxWidth).toBe('100%')
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'renders every palette of the selected category',
    () => {
      expect(openPicker().querySelectorAll('button')).toHaveLength(
        divergingCount,
      )
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'keeps palette buttons at their natural width instead of squeezing them',
    () => {
      for (const button of openPicker().querySelectorAll('button')) {
        expect(window.getComputedStyle(button).flexShrink).toBe('0')
      }
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'leaves the scroll arrows out when the strip fits',
    () => {
      openPicker() // jsdom reports 0 for both metrics: nothing to scroll.

      expect(screen.queryByTestId('palette-scroll-left')).toBeNull()
      expect(screen.queryByTestId('palette-scroll-right')).toBeNull()
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'shows scroll arrows, disabled at the end the strip is resting on',
    () => {
      stubScrollMetrics(600, 300)
      openPicker()

      // Overlay scrollbars (macOS, iOS) stay invisible until a gesture starts,
      // so the arrows are the only cue that palettes continue off the edge.
      const left = screen.getByTestId(
        'palette-scroll-left',
      ) as HTMLButtonElement
      const right = screen.getByTestId(
        'palette-scroll-right',
      ) as HTMLButtonElement
      expect(left.disabled).toBe(true)
      expect(right.disabled).toBe(false)
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'scrolls the strip forward when the right arrow is clicked',
    () => {
      stubScrollMetrics(600, 300)
      const strip = openPicker()
      const scrollBy = vi.fn()
      strip.scrollBy = scrollBy

      fireEvent.click(screen.getByTestId('palette-scroll-right'))

      expect(scrollBy).toHaveBeenCalledTimes(1)
      expect(scrollBy.mock.calls[0][0].left).toBeGreaterThan(0)
    },
    RENDER_TIMEOUT_MS,
  )
})
