import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getPalettesByCategory,
  PALETTE_CATEGORY_ORDER,
} from '@/models/VisualStyleModel/impl/colorPalettes'
import { PaletteSelector } from './PaletteSelector'

// Rendering a category's palettes takes a few hundred milliseconds, and the DOM
// is torn down between tests, so each test pays it again — more than the repo's
// 1s global timeout allows under full-suite load.
const RENDER_TIMEOUT_MS = 5000

const counts = {
  sequential: getPalettesByCategory('sequential').length,
  diverging: getPalettesByCategory('diverging').length,
  viridis: getPalettesByCategory('viridis').length,
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

describe('PaletteSelector', () => {
  afterEach(restoreScrollMetrics)

  it(
    'offers a tab per palette category in the table',
    () => {
      render(<PaletteSelector value="" onChange={vi.fn()} />)

      for (const category of PALETTE_CATEGORY_ORDER) {
        expect(
          screen.getByTestId(`palette-category-tab-${category}`),
        ).toBeTruthy()
      }
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'lists every palette of the active category',
    () => {
      render(
        <PaletteSelector
          value=""
          onChange={vi.fn()}
          defaultCategory="diverging"
        />,
      )

      const list = screen.getByTestId('palette-list')
      expect(
        list.querySelectorAll('[data-testid^="palette-card-"]'),
      ).toHaveLength(counts.diverging)
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'reaches the viridis palettes, which id-prefix grouping used to hide',
    () => {
      // The continuous-mapping picker typed its category as
      // 'sequential' | 'diverging', so these four were unreachable there.
      render(<PaletteSelector value="" onChange={vi.fn()} />)

      fireEvent.click(screen.getByTestId('palette-category-tab-viridis'))

      const list = screen.getByTestId('palette-list')
      expect(
        list.querySelectorAll('[data-testid^="palette-card-"]'),
      ).toHaveLength(counts.viridis)
      expect(counts.viridis).toBeGreaterThan(0)
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'reports the palette id that was clicked',
    () => {
      const onChange = vi.fn()
      render(
        <PaletteSelector
          value=""
          onChange={onChange}
          defaultCategory="viridis"
        />,
      )

      fireEvent.click(screen.getByTestId('palette-card-Viridis1'))

      expect(onChange).toHaveBeenCalledWith('Viridis1')
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'lets the keyboard reach and activate a list palette',
    () => {
      const onChange = vi.fn()
      render(
        <PaletteSelector
          value="Viridis1"
          onChange={onChange}
          defaultCategory="viridis"
        />,
      )

      // A Card is a div, so without these it is neither focusable nor
      // announced as the selected palette.
      const card = screen.getByTestId('palette-card-Viridis1')
      expect(card.getAttribute('role')).toBe('button')
      expect(card.getAttribute('tabindex')).toBe('0')
      expect(card.getAttribute('aria-pressed')).toBe('true')
      expect(
        screen
          .getByTestId('palette-card-Viridis2')
          .getAttribute('aria-pressed'),
      ).toBe('false')

      fireEvent.keyDown(screen.getByTestId('palette-card-Viridis2'), {
        key: 'Enter',
      })
      fireEvent.keyDown(screen.getByTestId('palette-card-Viridis3'), {
        key: ' ',
      })

      expect(onChange.mock.calls).toEqual([['Viridis2'], ['Viridis3']])
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'drops colorblind-unsafe palettes when asked',
    () => {
      const unsafe = getPalettesByCategory('diverging').filter(
        ({ palette }) => palette.metadata.colorBlindSafe === false,
      )
      render(
        <PaletteSelector
          value=""
          onChange={vi.fn()}
          defaultCategory="diverging"
          colorBlindSafeOnly
        />,
      )

      const list = screen.getByTestId('palette-list')
      expect(
        list.querySelectorAll('[data-testid^="palette-card-"]'),
      ).toHaveLength(counts.diverging - unsafe.length)
      expect(unsafe.length).toBeGreaterThan(0)
      for (const { id } of unsafe) {
        expect(screen.queryByTestId(`palette-card-${id}`)).toBeNull()
      }
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'offers "No palette" only when the caller can clear',
    () => {
      const onClear = vi.fn()
      const { unmount } = render(
        <PaletteSelector value="" onChange={vi.fn()} />,
      )
      expect(screen.queryByTestId('palette-clear-button')).toBeNull()
      unmount()

      render(<PaletteSelector value="" onChange={vi.fn()} onClear={onClear} />)
      fireEvent.click(screen.getByTestId('palette-clear-button'))

      expect(onClear).toHaveBeenCalledTimes(1)
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'puts the strip layout in a horizontal scroll container',
    () => {
      render(<PaletteSelector layout="strip" value="" onChange={vi.fn()} />)

      const style = window.getComputedStyle(screen.getByTestId('palette-strip'))
      // A popover Paper is overflow-x: hidden, so the strip itself must scroll
      // or palettes past the viewport edge are unreachable (#653).
      expect(style.overflowX).toBe('auto')
      expect(style.maxWidth).toBe('100%')
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'shows strip arrows only when the strip overflows, disabled at its ends',
    () => {
      render(<PaletteSelector layout="strip" value="" onChange={vi.fn()} />)
      // jsdom reports 0 for both metrics, i.e. nothing to scroll.
      expect(screen.queryByTestId('palette-scroll-left')).toBeNull()

      stubScrollMetrics(600, 300)
      render(<PaletteSelector layout="strip" value="" onChange={vi.fn()} />)

      const arrows = screen.getAllByTestId(
        'palette-scroll-left',
      ) as HTMLButtonElement[]
      const rights = screen.getAllByTestId(
        'palette-scroll-right',
      ) as HTMLButtonElement[]
      expect(arrows[arrows.length - 1].disabled).toBe(true)
      expect(rights[rights.length - 1].disabled).toBe(false)
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'scrolls the strip forward when the right arrow is clicked',
    () => {
      stubScrollMetrics(600, 300)
      render(<PaletteSelector layout="strip" value="" onChange={vi.fn()} />)
      const strip = screen.getByTestId('palette-strip')
      const scrollBy = vi.fn()
      strip.scrollBy = scrollBy

      fireEvent.click(screen.getByTestId('palette-scroll-right'))

      expect(scrollBy).toHaveBeenCalledTimes(1)
      expect(scrollBy.mock.calls[0][0].left).toBeGreaterThan(0)
    },
    RENDER_TIMEOUT_MS,
  )
})
