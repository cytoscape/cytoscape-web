import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DropdownMenu } from './DropdownMenu'

const onOpenChange = vi.fn()

const menuItems = [{ label: 'An item', template: <span>An item</span> }]

describe('DropdownMenu disabled state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disables the menu button and does not open when disabled', () => {
    render(
      <DropdownMenu
        id="tools"
        label="Tools"
        menuItems={menuItems}
        disabled={true}
        disabledTooltip="Load or create a network first"
        onOpenChange={onOpenChange}
      />,
    )

    const button = screen.getByTestId(
      'toolbar-tools-menu-button',
    ) as HTMLButtonElement
    expect(button.disabled).toBe(true)

    // Clicking a disabled menu must not request the menu to open.
    fireEvent.click(button)
    expect(onOpenChange).not.toHaveBeenCalledWith(true)
  })

  it('enables the menu button when there are networks', () => {
    render(
      <DropdownMenu
        id="tools"
        label="Tools"
        menuItems={menuItems}
        disabled={false}
        onOpenChange={onOpenChange}
      />,
    )

    const button = screen.getByTestId(
      'toolbar-tools-menu-button',
    ) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })
})

describe('DropdownMenu keyboard access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // The menu's open state is controlled by its parent; mirror that wiring so
  // clicking the button genuinely opens the popover.
  const MenuHarness = ({
    items,
  }: {
    items: Parameters<typeof DropdownMenu>[0]['menuItems']
  }) => {
    const [open, setOpen] = useState(false)
    return (
      <DropdownMenu
        id="tools"
        label="Tools"
        menuItems={items}
        open={open}
        onOpenChange={setOpen}
      />
    )
  }

  const renderOpenMenu = (
    items: Parameters<typeof DropdownMenu>[0]['menuItems'],
  ) => {
    render(<MenuHarness items={items} />)
    fireEvent.click(screen.getByTestId('toolbar-tools-menu-button'))
  }

  it('activates a label item with Enter and Space', () => {
    const command = vi.fn()
    renderOpenMenu([{ label: 'Run', command }])

    const item = screen.getByRole('menuitem', { name: 'Run' })
    expect(item.tabIndex).toBe(0)

    fireEvent.keyDown(item, { key: 'Enter' })
    fireEvent.keyDown(item, { key: ' ' })
    expect(command).toHaveBeenCalledTimes(2)
  })

  it('does not activate a disabled item and marks it aria-disabled', () => {
    const command = vi.fn()
    renderOpenMenu([{ label: 'Run', command, disabled: true }])

    const item = screen.getByRole('menuitem', { name: 'Run' })
    expect(item.getAttribute('aria-disabled')).toBe('true')
    expect(item.tabIndex).toBe(-1)

    fireEvent.keyDown(item, { key: 'Enter' })
    fireEvent.click(item)
    expect(command).not.toHaveBeenCalled()
  })

  it('opens a submenu with Enter', () => {
    renderOpenMenu([
      { label: 'Import', items: [{ label: 'From file', command: vi.fn() }] },
    ])

    const parent = screen.getByRole('menuitem', { name: 'Import' })
    fireEvent.keyDown(parent, { key: 'Enter' })
    expect(screen.getByRole('menuitem', { name: 'From file' })).toBeTruthy()
  })
})
