import { createTheme } from '@mui/material/styles'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CyDialog } from '@/components/CyDialog'
import { DropdownMenu, DropdownMenuItem } from './DropdownMenu'

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

  it('opens a submenu with Enter and moves focus into it', () => {
    renderOpenMenu([
      { label: 'Import', items: [{ label: 'From file', command: vi.fn() }] },
    ])

    const parent = screen.getByRole('menuitem', { name: 'Import' })
    fireEvent.keyDown(parent, { key: 'Enter' })

    const child = screen.getByRole('menuitem', { name: 'From file' })
    expect(child).toBeTruthy()
    // Without this the submenu opens but the keyboard is stranded on the
    // parent row, so the submenu is unreachable without a mouse.
    expect(document.activeElement).toBe(child)
  })

  it('keeps arrow-key focus inside an open submenu', () => {
    renderOpenMenu([
      { label: 'Apply', command: vi.fn() },
      {
        label: 'Import',
        items: [
          { label: 'From file', command: vi.fn() },
          { label: 'From table', command: vi.fn() },
        ],
      },
    ])

    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Import' }), {
      key: 'Enter',
    })
    const child = screen.getByRole('menuitem', { name: 'From file' })
    expect(document.activeElement).toBe(child)

    // The keydown bubbles through the submenu portal to the parent level,
    // which must not also move focus onto its own first row.
    fireEvent.keyDown(child, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'From table' }),
    )
  })

  it('closes the submenu with Escape and returns focus to the parent', () => {
    renderOpenMenu([
      { label: 'Import', items: [{ label: 'From file', command: vi.fn() }] },
    ])

    const parent = screen.getByRole('menuitem', { name: 'Import' })
    fireEvent.keyDown(parent, { key: 'Enter' })

    const child = screen.getByRole('menuitem', { name: 'From file' })
    fireEvent.keyDown(child, { key: 'Escape' })

    expect(screen.queryByRole('menuitem', { name: 'From file' })).toBeNull()
    expect(document.activeElement).toBe(parent)
  })

  it('moves focus across template rows and activates them with Enter', () => {
    const run = vi.fn()
    const skipped = vi.fn()
    renderOpenMenu([
      {
        template: (
          <DropdownMenuItem label="Apply Default Layout" onClick={run} />
        ),
      },
      {
        template: (
          <DropdownMenuItem label="Grid" disabled={true} onClick={skipped} />
        ),
      },
      { template: <DropdownMenuItem label="Settings..." onClick={run} /> },
    ])

    const menu = screen.getByRole('menu')
    const rows = screen.getAllByRole('menuitem')
    // One menuitem per template row, not one per template plus its wrapper.
    expect(rows).toHaveLength(3)

    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(rows[0])

    // The disabled row is skipped: focus lands on 'Settings...'.
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(rows[2])

    fireEvent.keyDown(rows[2], { key: 'Enter' })
    expect(run).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(rows[1], { key: 'Enter' })
    expect(skipped).not.toHaveBeenCalled()
  })

  it('takes a template row out of the tab order when the model disables it', () => {
    const run = vi.fn()
    renderOpenMenu([
      {
        disabled: true,
        template: <DropdownMenuItem label="Merge" onClick={run} />,
      },
    ])

    const row = screen.getByRole('menuitem', { name: 'Merge' })
    expect(row.tabIndex).toBe(-1)
    expect(row.getAttribute('aria-disabled')).toBe('true')
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(run).not.toHaveBeenCalled()
  })

  it("points the trigger's aria-controls at the rendered menu", () => {
    renderOpenMenu([{ label: 'Run', command: vi.fn() }])

    const button = screen.getByTestId('toolbar-tools-menu-button')
    const controls = button.getAttribute('aria-controls')
    expect(controls).toBe('tools-menu')
    expect(document.getElementById(controls as string)).toBe(
      screen.getByRole('menu'),
    )
  })
})

describe('DropdownMenu with a dialog owned by a template row', () => {
  // Help > About, Citation, Report a Bug and Developer > Import Database
  // Snapshot keep their dialog state inside the menu item: the row opens a
  // CyDialog rendered next to it, and the menu is told to close only when
  // the dialog closes. The dialog is a React descendant of the menu but a
  // DOM descendant of body, so the menu must neither close when the dialog
  // takes focus (unmounting the dialog with it) nor treat keys and clicks
  // inside the dialog as its own.
  const DialogRow = () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <DropdownMenuItem label="About" onClick={() => setOpen(true)} />
        <CyDialog open={open}>
          <input aria-label="Name" />
          <button onClick={() => setOpen(false)}>Close</button>
        </CyDialog>
      </>
    )
  }

  const MenuHarness = () => {
    const [open, setOpen] = useState(false)
    return (
      <DropdownMenu
        id="help"
        label="Help"
        menuItems={[{ template: <DialogRow /> }]}
        open={open}
        onOpenChange={setOpen}
      />
    )
  }

  const openDialogFromMenu = async (): Promise<HTMLElement> => {
    render(<MenuHarness />)
    fireEvent.click(screen.getByTestId('toolbar-help-menu-button'))
    fireEvent.click(screen.getByText('About'))
    // The menu decides whether focus left it in a microtask after the blur
    // the dialog's focus trap causes; let that settle before asserting.
    await act(async () => {})
    return screen.getByLabelText('Name')
  }

  // The open modal aria-hides everything else on the page, the menu
  // included, so look for the menu through that flag.
  const getMenu = (): HTMLElement => screen.getByRole('menu', { hidden: true })

  it('keeps the menu, and so the dialog, mounted while the dialog has focus', async () => {
    await openDialogFromMenu()

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(getMenu()).toBeTruthy()
  })

  it('ignores Escape pressed inside the dialog', async () => {
    const input = await openDialogFromMenu()

    fireEvent.keyDown(input, { key: 'Escape' })
    await act(async () => {})

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(getMenu()).toBeTruthy()
  })

  it('lets the dialog own its keys and mouse: Space types, mousedown focuses', async () => {
    const input = await openDialogFromMenu()

    // fireEvent returns false when a handler called preventDefault().
    expect(fireEvent.keyDown(input, { key: ' ' })).toBe(true)
    expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(true)
    expect(fireEvent.keyDown(input, { key: 'ArrowDown' })).toBe(true)
    expect(fireEvent.mouseDown(input)).toBe(true)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('leaves the dialog mounted when a click lands inside it', async () => {
    const input = await openDialogFromMenu()

    // A full pointer sequence, since ClickAwayListener acts on mousedown and
    // the row's own handlers act on click.
    fireEvent.mouseDown(input)
    fireEvent.mouseUp(input)
    fireEvent.click(input)
    await act(async () => {})

    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('closes the menu when the dialog closes and asks it to', async () => {
    await openDialogFromMenu()

    fireEvent.click(screen.getByText('Close'))
    await act(async () => {})
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('DropdownMenu stacking against dialogs', () => {
  // #745: the submenu Popper sat at theme.zIndex.modal + 1 and painted over a
  // service app's form. MUI's Dialog uses theme.zIndex.modal and src/theme.ts
  // sets no override, so every menu level has to stay strictly under it.
  const modalZIndex = createTheme().zIndex.modal

  const NestedHarness = () => {
    const [open, setOpen] = useState(false)
    return (
      <DropdownMenu
        id="data"
        label="Data"
        menuItems={[
          {
            label: 'Import',
            items: [{ label: 'From file', command: vi.fn() }],
          },
        ]}
        open={open}
        onOpenChange={setOpen}
      />
    )
  }

  // Popper carries the z-index on its own root, above the level's
  // role="menu"; `sx` emits an emotion class, so read the cascade.
  const zIndexOf = (level: HTMLElement): number => {
    for (
      let node: HTMLElement | null = level;
      node !== null;
      node = node.parentElement
    ) {
      const zIndex = window.getComputedStyle(node).zIndex
      if (zIndex !== '' && zIndex !== 'auto') {
        return Number(zIndex)
      }
    }
    throw new Error('no z-index on any ancestor of the menu level')
  }

  it('keeps every open menu level below a dialog', () => {
    render(<NestedHarness />)
    fireEvent.click(screen.getByTestId('toolbar-data-menu-button'))
    fireEvent.click(screen.getByText('Import'))

    const levels = screen.getAllByRole('menu')
    expect(levels).toHaveLength(2)
    levels.forEach((level) => {
      expect(zIndexOf(level)).toBeLessThan(modalZIndex)
    })
  })

  it('paints a submenu above the level that owns it', () => {
    render(<NestedHarness />)
    fireEvent.click(screen.getByTestId('toolbar-data-menu-button'))
    fireEvent.click(screen.getByText('Import'))

    const [topLevel, submenu] = screen.getAllByRole('menu')
    expect(zIndexOf(submenu)).toBeGreaterThan(zIndexOf(topLevel))
  })
})
