import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  getPaletteGradientColors,
  getPalettesByCategory,
} from '@/models/VisualStyleModel/impl/colorPalettes'
import { ColorPalettePicker } from './ColorPalettePicker'

// Mounting a MUI Popover full of palette previews takes a few hundred
// milliseconds, and the DOM is torn down between tests, so each test pays it
// again — more than the repo's 1s global timeout allows under full-suite load.
const RENDER_TIMEOUT_MS = 5000

const openPicker = (
  onPaletteSelect = vi.fn(),
): { onPaletteSelect: ReturnType<typeof vi.fn> } => {
  render(
    <ColorPalettePicker
      currentPaletteName="None"
      onPaletteSelect={onPaletteSelect}
      recommendedCategory="diverging"
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /None/ }))
  return { onPaletteSelect }
}

describe('ColorPalettePicker', () => {
  it(
    'opens on the recommended category with its palettes in the strip',
    () => {
      openPicker()

      const strip = screen.getByTestId('palette-strip')
      expect(strip.querySelectorAll('button')).toHaveLength(
        getPalettesByCategory('diverging').length,
      )
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'reports the selected palette gradient on confirm',
    () => {
      const { onPaletteSelect } = openPicker()
      const expected = getPaletteGradientColors('rdbu')

      fireEvent.click(screen.getByRole('button', { name: 'Red-Blue' }))
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

      expect(onPaletteSelect).toHaveBeenCalledWith(
        expected?.min,
        expected?.middle,
        expected?.max,
        expected?.name,
      )
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'swaps the gradient ends when reverse colors is checked',
    () => {
      const { onPaletteSelect } = openPicker()
      const expected = getPaletteGradientColors('rdbu')

      fireEvent.click(screen.getByRole('button', { name: 'Red-Blue' }))
      fireEvent.click(screen.getByRole('checkbox', { name: /reverse colors/ }))
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

      expect(onPaletteSelect).toHaveBeenCalledWith(
        expected?.max,
        expected?.middle,
        expected?.min,
        expected?.name,
      )
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'reaches the viridis palettes it used to hide',
    () => {
      openPicker()

      fireEvent.click(screen.getByTestId('palette-category-tab-viridis'))

      const strip = screen.getByTestId('palette-strip')
      expect(strip.querySelectorAll('button')).toHaveLength(
        getPalettesByCategory('viridis').length,
      )
    },
    RENDER_TIMEOUT_MS,
  )
})
