import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useUiStateStore } from '@/data/hooks/stores/UiStateStore'
import { useUndoStore } from '@/data/hooks/stores/UndoStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import type { Edit } from '@/models/StoreModel/UndoStoreModel'
import {
  canUndoFromKeyboard,
  isRedoShortcut,
  isUndoShortcut,
  redoShortcutLabel,
  undoShortcutLabel,
  useUndoRedoShortcuts,
} from './useUndoRedoShortcuts'

const undoLastEdit = vi.fn()
const redoLastEdit = vi.fn()

vi.mock('@/data/hooks/useUndoStack', () => ({
  useUndoStack: () => ({ undoLastEdit, redoLastEdit }),
}))

const keydown = (init: KeyboardEventInit): KeyboardEvent =>
  new KeyboardEvent('keydown', { cancelable: true, ...init })

describe('isUndoShortcut', () => {
  it('is Ctrl+Z or ⌘Z, with or without Caps Lock', () => {
    expect(isUndoShortcut(keydown({ key: 'z', ctrlKey: true }))).toBe(true)
    expect(isUndoShortcut(keydown({ key: 'z', metaKey: true }))).toBe(true)
    expect(isUndoShortcut(keydown({ key: 'Z', ctrlKey: true }))).toBe(true)
  })

  it('rejects other keys and extra modifiers', () => {
    const cases: KeyboardEventInit[] = [
      { key: 'z' },
      { key: 'y', ctrlKey: true },
      { key: 'Z', ctrlKey: true, shiftKey: true },
      { key: 'z', ctrlKey: true, altKey: true },
      { key: 'z', ctrlKey: true, metaKey: true },
    ]
    cases.forEach((init) => expect(isUndoShortcut(keydown(init))).toBe(false))
  })
})

describe('isRedoShortcut', () => {
  it('is Ctrl+Shift+Z, ⌘⇧Z or Ctrl+Y', () => {
    const cases: KeyboardEventInit[] = [
      { key: 'Z', ctrlKey: true, shiftKey: true },
      { key: 'Z', metaKey: true, shiftKey: true },
      // macOS browsers can report the lower-case key while ⌘ is held
      { key: 'z', metaKey: true, shiftKey: true },
      { key: 'y', ctrlKey: true },
      { key: 'Y', ctrlKey: true },
    ]
    cases.forEach((init) => expect(isRedoShortcut(keydown(init))).toBe(true))
  })

  it('rejects ⌘Y (the browser History on macOS) and extra modifiers', () => {
    const cases: KeyboardEventInit[] = [
      { key: 'y', metaKey: true },
      { key: 'y' },
      { key: 'Y', ctrlKey: true, shiftKey: true },
      { key: 'y', ctrlKey: true, altKey: true },
      { key: 'Z', ctrlKey: true, shiftKey: true, altKey: true },
      { key: 'Z', ctrlKey: true, metaKey: true, shiftKey: true },
      { key: 'z', ctrlKey: true },
    ]
    cases.forEach((init) => expect(isRedoShortcut(keydown(init))).toBe(false))
  })
})

describe('shortcut labels', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('show each platform its usual form', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel' })
    expect(undoShortcutLabel()).toBe('⌘Z')
    expect(redoShortcutLabel()).toBe('⇧⌘Z')
    vi.stubGlobal('navigator', { platform: 'Win32' })
    expect(undoShortcutLabel()).toBe('Ctrl+Z')
    expect(redoShortcutLabel()).toBe('Ctrl+Y')
  })
})

describe('canUndoFromKeyboard', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const focus = (html: string, id: string): void => {
    document.body.innerHTML = html
    document.getElementById(id)!.focus()
  }

  it('is true with nothing focused, a button, a checkbox or a grid', () => {
    expect(canUndoFromKeyboard()).toBe(true)
    ;[
      '<button id="x">Edit</button>',
      '<input id="x" type="checkbox" />',
      '<div id="x" tabindex="0"></div>',
    ].forEach((html) => {
      focus(html, 'x')
      expect(canUndoFromKeyboard()).toBe(true)
    })
  })

  it('is false in a text field, which keeps its own undo', () => {
    ;[
      '<input id="x" />',
      '<input id="x" type="number" />',
      '<textarea id="x"></textarea>',
      '<div id="x" contenteditable="true" tabindex="0"></div>',
    ].forEach((html) => {
      focus(html, 'x')
      // jsdom does not implement isContentEditable
      const el = document.getElementById('x')!
      if (el.hasAttribute('contenteditable')) {
        Object.defineProperty(el, 'isContentEditable', { value: true })
      }
      expect(canUndoFromKeyboard()).toBe(false)
    })
  })

  it('is false inside a dialog or an open menu', () => {
    ;['dialog', 'menu', 'listbox'].forEach((role) => {
      focus(`<div role="${role}"><button id="x">b</button></div>`, 'x')
      expect(canUndoFromKeyboard()).toBe(false)
    })
  })

  it('is false while a modal is open, wherever the focus is', () => {
    document.body.innerHTML = '<div class="MuiModal-root"></div>'
    expect(canUndoFromKeyboard()).toBe(false)
    document.body.innerHTML =
      '<div class="MuiModal-root MuiModal-hidden"></div>'
    expect(canUndoFromKeyboard()).toBe(true)
  })
})

describe('useUndoRedoShortcuts', () => {
  const NET = 'net_1'
  const edit = { description: 'Delete nodes' } as Edit

  const press = (init: KeyboardEventInit): KeyboardEvent => {
    const event = keydown(init)
    window.dispatchEvent(event)
    return event
  }

  beforeEach(() => {
    undoLastEdit.mockReset()
    redoLastEdit.mockReset()
    useWorkspaceStore.setState((state) => {
      state.workspace.currentNetworkId = NET
    })
    useUiStateStore.setState((state) => {
      state.ui.activeNetworkView = ''
    })
    useUndoStore.setState({
      undoRedoStacks: { [NET]: { undoStack: [edit], redoStack: [edit] } },
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('undoes and redoes, and keeps the key from the browser', () => {
    const { unmount } = renderHook(() => useUndoRedoShortcuts())

    expect(press({ key: 'z', ctrlKey: true }).defaultPrevented).toBe(true)
    expect(undoLastEdit).toHaveBeenCalledTimes(1)

    expect(
      press({ key: 'Z', metaKey: true, shiftKey: true }).defaultPrevented,
    ).toBe(true)
    expect(press({ key: 'y', ctrlKey: true }).defaultPrevented).toBe(true)
    expect(redoLastEdit).toHaveBeenCalledTimes(2)

    unmount()
    press({ key: 'z', ctrlKey: true })
    expect(undoLastEdit).toHaveBeenCalledTimes(1)
  })

  it("uses the active view's stack, and leaves the key alone when it is empty", () => {
    useUiStateStore.setState((state) => {
      state.ui.activeNetworkView = 'net_1_sub'
    })
    renderHook(() => useUndoRedoShortcuts())

    expect(press({ key: 'z', ctrlKey: true }).defaultPrevented).toBe(false)
    expect(press({ key: 'y', ctrlKey: true }).defaultPrevented).toBe(false)
    expect(undoLastEdit).not.toHaveBeenCalled()
    expect(redoLastEdit).not.toHaveBeenCalled()
  })

  it('does nothing in a text field', () => {
    renderHook(() => useUndoRedoShortcuts())
    document.body.innerHTML = '<input id="field" />'
    document.getElementById('field')!.focus()

    expect(press({ key: 'z', ctrlKey: true }).defaultPrevented).toBe(false)
    expect(undoLastEdit).not.toHaveBeenCalled()
  })
})
