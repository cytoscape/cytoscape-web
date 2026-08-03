import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { PALETTES } from '@/models/VisualStyleModel/impl/colorPalettes'
import { ColorPalettePicker } from './ColorPalettePicker'

const divergingCount = Object.values(PALETTES).filter(
  (palette) => palette.metadata.category === 'diverging',
).length

// Mounting a MUI Popover full of palette previews costs a few hundred
// milliseconds, which crowds the repo's 1s per-test timeout under full-suite
// load. Render once in a hook (10s budget) and let the tests only read.
describe('ColorPalettePicker', () => {
  let strip: HTMLElement

  beforeAll(() => {
    render(
      <ColorPalettePicker
        currentPaletteName="None"
        onPaletteSelect={vi.fn()}
        recommendedCategory="diverging"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /None/ }))
    strip = screen.getByTestId('palette-strip')
  })

  it('puts the palette strip in a horizontal scroll container', () => {
    const style = window.getComputedStyle(strip)

    // The Popover Paper is overflow-x: hidden, so the strip itself must scroll
    // or palettes past the viewport edge are unreachable (#653).
    expect(style.overflowX).toBe('auto')
    expect(style.maxWidth).toBe('100%')
  })

  it('renders every palette of the selected category', () => {
    expect(strip.querySelectorAll('button')).toHaveLength(divergingCount)
  })

  it('keeps palette buttons at their natural width instead of squeezing them', () => {
    for (const button of strip.querySelectorAll('button')) {
      expect(window.getComputedStyle(button).flexShrink).toBe('0')
    }
  })
})
