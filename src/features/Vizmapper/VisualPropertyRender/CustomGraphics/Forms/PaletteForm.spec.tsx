import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { PaletteForm } from './PaletteForm'

// Mounting a MUI Popover full of palette cards costs a few hundred
// milliseconds, which crowds the repo's 1s per-test timeout under full-suite
// load. Render once in a hook (10s budget) and let the tests only read.
describe('PaletteForm', () => {
  let paper: HTMLElement

  beforeAll(() => {
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

    paper = screen
      .getByText('Select Color Palette')
      .closest('.MuiPopover-paper') as HTMLElement
  })

  it('clamps the palette popover to the viewport', () => {
    const style = window.getComputedStyle(paper)

    // A flat 500x600 Paper overrides MUI's own calc(100% - 32px) clamp and
    // lands off-screen on a narrow viewport (#653).
    expect(style.width).toBe('500px')
    expect(style.maxWidth).toBe('calc(100% - 32px)')
    expect(style.height).toBe('600px')
    expect(style.maxHeight).toBe('calc(100% - 32px)')
  })
})
