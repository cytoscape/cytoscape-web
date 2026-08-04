import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PaletteForm } from './PaletteForm'

// Mounting a MUI Popover full of palette cards takes a few hundred
// milliseconds, more than the repo's 1s global timeout allows under
// full-suite load.
const RENDER_TIMEOUT_MS = 5000

describe('PaletteForm', () => {
  it(
    'clamps the palette popover to the viewport',
    () => {
      const anchor = document.createElement('button')
      document.body.appendChild(anchor)

      render(
        <PaletteForm
          colorScheme=""
          colors={[]}
          dataColumns={['a', 'b']}
          onUpdate={vi.fn()}
          hideGuidance
          anchorEl={anchor}
          open
        />,
      )

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
})
