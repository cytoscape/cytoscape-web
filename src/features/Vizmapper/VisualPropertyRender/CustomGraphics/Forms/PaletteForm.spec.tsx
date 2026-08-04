import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PALETTES } from '@/models/VisualStyleModel/impl/colorPalettes'
import { pickEvenly } from '@/models/VisualStyleModel/impl/colorUtils'
import { PaletteForm } from './PaletteForm'

// Mounting a MUI Popover full of palette cards takes a few hundred
// milliseconds, more than the repo's 1s global timeout allows under
// full-suite load.
const RENDER_TIMEOUT_MS = 5000

const renderPopover = (
  props: Partial<React.ComponentProps<typeof PaletteForm>> = {},
): { onUpdate: ReturnType<typeof vi.fn> } => {
  const onUpdate = vi.fn()
  const anchor = document.createElement('button')
  document.body.appendChild(anchor)

  render(
    <PaletteForm
      colorScheme=""
      colors={[]}
      dataColumns={['a', 'b']}
      onUpdate={onUpdate}
      hideGuidance
      anchorEl={anchor}
      open
      {...props}
    />,
  )
  return { onUpdate }
}

describe('PaletteForm', () => {
  it(
    'clamps the palette popover to the viewport',
    () => {
      renderPopover()

      const paper = screen
        .getByText('Select Color Palette')
        .closest('.MuiPopover-paper') as HTMLElement
      const style = window.getComputedStyle(paper)

      // A flat 500x600 Paper overrides MUI's own calc(100% - 32px) clamp and
      // lands off-screen on a narrow viewport (#653).
      expect(style.width).toBe('500px')
      expect(style.maxWidth).toBe('calc(100% - 32px)')
      expect(style.height).toBe('600px')
      expect(style.maxHeight).toBe('calc(100% - 32px)')
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'reports the scheme and one color per data column',
    () => {
      const { onUpdate } = renderPopover()

      fireEvent.click(screen.getByTestId('palette-card-Sequential3'))

      expect(onUpdate).toHaveBeenCalledWith(
        'Sequential3',
        pickEvenly(PALETTES.Sequential3.colors, 2),
      )
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'offers "No palette" only when the caller allows it',
    () => {
      const { onUpdate } = renderPopover({ allowNoPalette: true })

      fireEvent.click(screen.getByTestId('palette-clear-button'))

      expect(onUpdate).toHaveBeenCalledWith('', [])
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'hides "No palette" by default',
    () => {
      renderPopover()

      expect(screen.queryByTestId('palette-clear-button')).toBeNull()
    },
    RENDER_TIMEOUT_MS,
  )
})
