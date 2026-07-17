import { fireEvent, render, screen } from '@testing-library/react'
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
