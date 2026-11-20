import {
  Experimental_CssVarsProvider as CssVarsProvider,
  experimental_extendTheme as extendTheme,
} from '@mui/material/styles'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeToggleButton } from './ThemeToggleButton'

// MUI's CssVarsProvider persists the chosen mode under this key.
const MODE_KEY = 'mui-mode'

const stubMatchMedia = (prefersDark: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: prefersDark && query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

const renderButton = () =>
  render(
    <CssVarsProvider theme={extendTheme()} defaultMode="system">
      <ThemeToggleButton />
    </CssVarsProvider>,
  )

const openMenu = (): HTMLElement => {
  fireEvent.click(screen.getByTestId('theme-mode-button'))
  return screen.getByRole('menu')
}

describe('ThemeToggleButton', () => {
  beforeEach(() => {
    localStorage.clear()
    stubMatchMedia(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('follows the system setting by default and says so', async () => {
    renderButton()

    const button = await screen.findByTestId('theme-mode-button')
    expect(button.getAttribute('aria-label')).toBe('Appearance: System')
    expect(within(button).getByTestId('ContrastIcon')).toBeTruthy()
  })

  it('offers System, Light and Dark, each with its icon, marking the current one', async () => {
    renderButton()
    await screen.findByTestId('theme-mode-button')

    const menu = openMenu()
    const items = within(menu).getAllByRole('menuitemradio')
    expect(items.map((item) => item.textContent)).toEqual([
      'System',
      'Light',
      'Dark',
    ])
    expect(within(items[0]).getByTestId('ContrastIcon')).toBeTruthy()
    expect(within(items[1]).getByTestId('LightModeIcon')).toBeTruthy()
    expect(within(items[2]).getByTestId('DarkModeIcon')).toBeTruthy()
    expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
    ])
    // A checkmark marks the current choice; the selected-row tint alone is
    // too faint to read.
    expect(
      items.map((item) => within(item).queryByTestId('CheckIcon') !== null),
    ).toEqual([true, false, false])
  })

  it('picking Dark switches the mode, the icon and the label, and closes the menu', async () => {
    renderButton()
    await screen.findByTestId('theme-mode-button')

    fireEvent.click(within(openMenu()).getByText('Dark'))

    await waitFor(() => expect(localStorage.getItem(MODE_KEY)).toBe('dark'))
    const button = screen.getByTestId('theme-mode-button')
    expect(button.getAttribute('aria-label')).toBe('Appearance: Dark')
    expect(within(button).getByTestId('DarkModeIcon')).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  })

  // #850: once light or dark was picked, the app could never follow the
  // operating system again.
  it('picking System after a fixed mode goes back to following the OS', async () => {
    localStorage.setItem(MODE_KEY, 'light')
    stubMatchMedia(true)
    renderButton()

    const button = await screen.findByTestId('theme-mode-button')
    expect(button.getAttribute('aria-label')).toBe('Appearance: Light')

    fireEvent.click(within(openMenu()).getByText('System'))

    await waitFor(() => expect(localStorage.getItem(MODE_KEY)).toBe('system'))
    expect(button.getAttribute('aria-label')).toBe('Appearance: System')
    expect(within(button).getByTestId('ContrastIcon')).toBeTruthy()
    expect(document.documentElement.getAttribute('data-mui-color-scheme')).toBe(
      'dark',
    )
  })
})
