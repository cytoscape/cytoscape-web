import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useUiStateStore } from '@/data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import {
  isDeleteSelectionShortcut,
  useDeleteSelectionShortcut,
} from './useDeleteSelectionShortcut'

const deleteSelectedElements = vi.fn()

vi.mock('@/data/edit/deleteSelection', () => ({
  deleteSelectedElements: (networkId: string) =>
    deleteSelectedElements(networkId),
}))

const keydown = (init: KeyboardEventInit): KeyboardEvent =>
  new KeyboardEvent('keydown', { cancelable: true, ...init })

describe('isDeleteSelectionShortcut', () => {
  it('is Delete or Backspace', () => {
    expect(isDeleteSelectionShortcut(keydown({ key: 'Delete' }))).toBe(true)
    expect(isDeleteSelectionShortcut(keydown({ key: 'Backspace' }))).toBe(true)
  })

  it('rejects other keys, modifiers and repeats', () => {
    const cases: KeyboardEventInit[] = [
      { key: 'd' },
      { key: 'Delete', ctrlKey: true },
      { key: 'Backspace', metaKey: true },
      { key: 'Delete', altKey: true },
      { key: 'Delete', shiftKey: true },
      { key: 'Delete', repeat: true },
    ]
    cases.forEach((init) =>
      expect(isDeleteSelectionShortcut(keydown(init))).toBe(false),
    )
  })
})

describe('useDeleteSelectionShortcut', () => {
  const NET = 'net_1'

  const press = (init: KeyboardEventInit = { key: 'Delete' }) => {
    const event = keydown(init)
    window.dispatchEvent(event)
    return event
  }

  beforeEach(() => {
    deleteSelectedElements.mockReset()
    deleteSelectedElements.mockReturnValue(true)
    useWorkspaceStore.setState((state) => {
      state.workspace.currentNetworkId = NET
    })
    useUiStateStore.setState((state) => {
      state.ui.activeNetworkView = ''
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('deletes from the current network and keeps the key from the browser', () => {
    const { unmount } = renderHook(() => useDeleteSelectionShortcut())

    expect(press().defaultPrevented).toBe(true)
    expect(press({ key: 'Backspace' }).defaultPrevented).toBe(true)
    expect(deleteSelectedElements).toHaveBeenCalledTimes(2)
    expect(deleteSelectedElements).toHaveBeenCalledWith(NET)

    unmount()
    press()
    expect(deleteSelectedElements).toHaveBeenCalledTimes(2)
  })

  it('leaves the key to the browser when nothing was deleted', () => {
    deleteSelectedElements.mockReturnValue(false)
    renderHook(() => useDeleteSelectionShortcut())
    expect(press().defaultPrevented).toBe(false)
  })

  it('acts while the current network is the active view, not a subnetwork', () => {
    renderHook(() => useDeleteSelectionShortcut())
    useUiStateStore.setState((state) => {
      state.ui.activeNetworkView = NET
    })
    press()
    expect(deleteSelectedElements).toHaveBeenCalledTimes(1)

    useUiStateStore.setState((state) => {
      state.ui.activeNetworkView = `${NET}_subsystem`
    })
    expect(press().defaultPrevented).toBe(false)
    expect(deleteSelectedElements).toHaveBeenCalledTimes(1)
  })

  it('stays out of text fields, the table browser, menus and modals', () => {
    renderHook(() => useDeleteSelectionShortcut())
    ;[
      '<input id="x" />',
      // The table browser's grid, where Delete clears cells
      '<div id="x" tabindex="0"></div>',
      '<div role="menu"><div id="x" role="menuitem" tabindex="0"></div></div>',
    ].forEach((html) => {
      document.body.innerHTML = html
      document.getElementById('x')!.focus()
      expect(press().defaultPrevented).toBe(false)
    })

    document.body.innerHTML = '<div class="MuiModal-root"></div>'
    expect(press().defaultPrevented).toBe(false)
    expect(deleteSelectedElements).not.toHaveBeenCalled()
  })

  it('acts while the focus is inside the network renderer', () => {
    renderHook(() => useDeleteSelectionShortcut())
    document.body.innerHTML =
      '<div data-testid="cyjs-renderer"><div id="x" tabindex="0"></div></div>'
    document.getElementById('x')!.focus()
    expect(press().defaultPrevented).toBe(true)
  })
})
