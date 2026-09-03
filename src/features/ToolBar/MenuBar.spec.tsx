import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DropdownMenu } from './DropdownMenu'
import { MenuBar, useMenuBarMenu } from './MenuBar'

/**
 * Mirrors how the toolbar menus are wired: each menu owns its dialogs and
 * close handlers, but its open flag comes from the shared menubar.
 */
const TestMenu = ({
  id,
  label,
  disabled = false,
}: {
  id: string
  label: string
  disabled?: boolean
}) => {
  const { open, setOpen } = useMenuBarMenu(id)
  return (
    <DropdownMenu
      id={id}
      label={label}
      menuItems={[
        { label: `${label} first`, command: vi.fn() },
        { label: `${label} second`, command: vi.fn() },
      ]}
      open={open}
      disabled={disabled}
      onOpenChange={setOpen}
    />
  )
}

const renderMenuBar = (): void => {
  render(
    <MenuBar>
      <TestMenu id="data" label="Data" />
      <TestMenu id="edit" label="Edit" disabled={true} />
      <TestMenu id="layout" label="Layout" />
      <TestMenu id="help" label="Help" />
    </MenuBar>,
  )
}

const button = (id: string): HTMLButtonElement =>
  screen.getByTestId(`toolbar-${id}-menu-button`) as HTMLButtonElement

const menuOf = (label: string): HTMLElement | null =>
  screen.queryByRole('menuitem', { name: `${label} first` })

describe('MenuBar', () => {
  it('opens another menu with a single click while one is open', () => {
    renderMenuBar()
    fireEvent.click(button('data'))
    expect(menuOf('Data')).not.toBeNull()

    // Before the menubar, the open menu's modal backdrop ate this click, so
    // the user had to click once to close Data and once more to open Layout.
    fireEvent.click(button('layout'))
    expect(menuOf('Data')).toBeNull()
    expect(menuOf('Layout')).not.toBeNull()
    expect(screen.getAllByRole('menu')).toHaveLength(1)
  })

  it('switches menus on hover once one is open, but not before', () => {
    renderMenuBar()

    fireEvent.pointerEnter(button('layout'), { pointerType: 'mouse' })
    expect(screen.queryByRole('menu')).toBeNull()

    fireEvent.click(button('data'))
    fireEvent.pointerEnter(button('layout'), { pointerType: 'mouse' })
    expect(menuOf('Data')).toBeNull()
    expect(menuOf('Layout')).not.toBeNull()

    fireEvent.pointerEnter(button('help'), { pointerType: 'mouse' })
    expect(menuOf('Layout')).toBeNull()
    expect(menuOf('Help')).not.toBeNull()
  })

  it('switches only for a mouse: a touch or pen tap fires hover before click', () => {
    renderMenuBar()
    fireEvent.click(button('data'))
    fireEvent.pointerEnter(button('layout'), { pointerType: 'touch' })
    fireEvent.pointerEnter(button('layout'), { pointerType: 'pen' })
    fireEvent.pointerEnter(button('layout'))
    expect(menuOf('Data')).not.toBeNull()
    expect(menuOf('Layout')).toBeNull()
  })

  it('keeps the open menu when a disabled trigger is hovered', () => {
    renderMenuBar()
    fireEvent.click(button('data'))
    fireEvent.pointerEnter(button('edit'), { pointerType: 'mouse' })
    expect(menuOf('Data')).not.toBeNull()
    expect(menuOf('Edit')).toBeNull()
  })

  it('moves between menus with the arrow keys, skipping disabled ones', () => {
    renderMenuBar()
    fireEvent.click(button('data'))
    const dataMenu = screen.getByRole('menu')

    // ArrowRight from the Data menu skips the disabled Edit menu and opens
    // Layout with the keyboard already on its first item.
    fireEvent.keyDown(dataMenu, { key: 'ArrowRight' })
    expect(menuOf('Data')).toBeNull()
    expect(document.activeElement).toBe(menuOf('Layout'))

    // ArrowLeft goes back; from the first menu it wraps to the last.
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(menuOf('Data'))
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(menuOf('Help'))
  })

  it('exposes the bar as a menubar whose triggers are menuitems', () => {
    renderMenuBar()
    const bar = screen.getByRole('menubar', { name: 'Main menu' })
    expect(bar.contains(button('data'))).toBe(true)
    expect(button('data').getAttribute('role')).toBe('menuitem')
  })

  it('enters a pointer-opened menu at either end with ArrowUp or ArrowDown', () => {
    renderMenuBar()
    fireEvent.click(button('data'))
    const menu = screen.getByRole('menu')
    expect(document.activeElement).toBe(menu)

    fireEvent.keyDown(menu, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Data second' }),
    )
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(menuOf('Data'))
  })

  it('is a single tab stop whose position follows focus (roving tabindex)', () => {
    renderMenuBar()
    // The first enabled trigger starts as the tab stop; a disabled trigger is
    // never one.
    expect(button('data').tabIndex).toBe(0)
    expect(button('edit').tabIndex).toBe(-1)
    expect(button('layout').tabIndex).toBe(-1)
    expect(button('help').tabIndex).toBe(-1)

    // Whichever trigger takes focus (click, or Tab back into the bar) becomes
    // the tab stop, so leaving and re-entering the bar lands where the user
    // was.
    act(() => button('help').focus())
    expect(button('help').tabIndex).toBe(0)
    expect(button('data').tabIndex).toBe(-1)

    // The arrow keys move focus, and the tab stop with it.
    fireEvent.keyDown(button('help'), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(button('layout'))
    expect(button('layout').tabIndex).toBe(0)
    expect(button('help').tabIndex).toBe(-1)
  })

  it('moves the tab stop to the first enabled trigger when its own is disabled', () => {
    const Harness = () => {
      const [layoutDisabled, setLayoutDisabled] = useState(false)
      return (
        <>
          <MenuBar>
            <TestMenu id="data" label="Data" />
            <TestMenu id="layout" label="Layout" disabled={layoutDisabled} />
            <TestMenu id="help" label="Help" />
          </MenuBar>
          <button
            data-testid="toggle"
            onClick={() => setLayoutDisabled((value) => !value)}
          />
        </>
      )
    }
    render(<Harness />)

    act(() => button('layout').focus())
    expect(button('layout').tabIndex).toBe(0)

    fireEvent.click(screen.getByTestId('toggle'))
    expect(button('layout').tabIndex).toBe(-1)
    expect(button('data').tabIndex).toBe(0)
    expect(button('help').tabIndex).toBe(-1)

    // Re-enabling it does not steal the tab stop back.
    fireEvent.click(screen.getByTestId('toggle'))
    expect(button('data').tabIndex).toBe(0)
    expect(button('layout').tabIndex).toBe(-1)
  })

  it('opens the next menu from a closed trigger with ArrowDown', () => {
    renderMenuBar()
    button('help').focus()
    fireEvent.keyDown(button('help'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(menuOf('Help'))
  })

  it('closes on Escape and returns focus to the trigger', () => {
    renderMenuBar()
    fireEvent.click(button('data'))
    const dataMenu = screen.getByRole('menu')
    expect(document.activeElement).toBe(dataMenu)

    fireEvent.keyDown(dataMenu, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(button('data'))
  })

  it('closes when focus leaves the menu, without stealing it back', async () => {
    renderMenuBar()
    render(<input data-testid="elsewhere" />)
    fireEvent.click(button('data'))
    expect(screen.getByRole('menu')).toBeTruthy()

    const elsewhere = screen.getByTestId('elsewhere')
    await act(async () => {
      elsewhere.focus()
      await Promise.resolve()
    })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(elsewhere)
  })

  it('closes on a click outside', async () => {
    renderMenuBar()
    fireEvent.click(button('data'))
    // ClickAwayListener arms itself one macrotask after mounting.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    fireEvent.click(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('lets the parent close its own menu through the shared state', () => {
    const Closer = () => {
      const { open, setOpen } = useMenuBarMenu('data')
      return (
        <button data-testid="closer" onClick={() => setOpen(false)}>
          {open ? 'open' : 'closed'}
        </button>
      )
    }
    render(
      <MenuBar>
        <TestMenu id="data" label="Data" />
        <Closer />
      </MenuBar>,
    )
    fireEvent.click(button('data'))
    expect(screen.getByTestId('closer').textContent).toBe('open')
    fireEvent.click(screen.getByTestId('closer'))
    expect(screen.getByTestId('closer').textContent).toBe('closed')
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
