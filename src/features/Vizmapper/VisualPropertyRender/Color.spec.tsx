import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ColorPicker } from './Color'

// react-color's swatch grids take a few hundred milliseconds to mount, and the
// DOM is torn down between tests, so each test pays it again — more than the
// repo's 1s global timeout allows under full-suite load.
const RENDER_TIMEOUT_MS = 5000

const renderPicker = (): void => {
  render(
    <ColorPicker
      currentValue="#ff0000"
      onValueChange={vi.fn()}
      closePopover={vi.fn()}
    />,
  )
}

describe('ColorPicker', () => {
  it(
    'keeps all five tabs reachable on a narrow popover',
    () => {
      renderPicker()

      // The popover Paper clips at overflow-x: hidden and the five long labels
      // are ~1000px wide, so standard (non-scrolling) tabs put 4 of 5 out of
      // reach below ~1000px of viewport width (#653).
      const tabs = screen.getByTestId('color-picker-tabs')
      expect(tabs.querySelectorAll('[role="tab"]')).toHaveLength(5)
      expect(tabs.querySelector('.MuiTabs-scroller')?.className).toContain(
        'MuiTabs-scrollableX',
      )
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'sizes the swatch grid against its container instead of a fixed 945px',
    () => {
      renderPicker()

      const swatches = document.querySelector('.swatches-picker') as HTMLElement
      // The grid is now `min(945px, 100%)`. jsdom's cssstyle drops min() from
      // the inline style, so the observable difference is the absence of the
      // old fixed width — 945px inside a 358px Paper is what got clipped
      // (#653). The responsive value itself is verified in a browser.
      expect(swatches.getAttribute('style') ?? '').not.toMatch(/width:\s*945px/)
    },
    RENDER_TIMEOUT_MS,
  )
})
