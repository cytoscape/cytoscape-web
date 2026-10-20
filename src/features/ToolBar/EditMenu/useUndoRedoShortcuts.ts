import { useEffect, useRef } from 'react'

import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useUndoStore } from '../../../data/hooks/stores/UndoStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useUndoStack } from '../../../data/hooks/useUndoStack'
import { logUi } from '../../../debug'
import { IdType } from '../../../models'
import { isApplePlatform } from '../SelectMenu/useSelectAllShortcut'

/** The Undo shortcut as the menu shows it */
export const undoShortcutLabel = (): string =>
  isApplePlatform() ? '⌘Z' : 'Ctrl+Z'

/** The Redo shortcut as the menu shows it: each platform's usual form */
export const redoShortcutLabel = (): string =>
  isApplePlatform() ? '⇧⌘Z' : 'Ctrl+Y'

const isKey = (event: KeyboardEvent, key: string): boolean =>
  event.key.toLowerCase() === key

/** Exactly one of Ctrl and ⌘, and no Alt */
const hasCommandModifier = (event: KeyboardEvent): boolean =>
  !event.altKey && event.metaKey !== event.ctrlKey

/**
 * Whether the keydown is the Undo shortcut: Ctrl+Z or ⌘Z, with no other
 * modifier. Both are accepted on every platform rather than trusting the
 * platform detection (see `isApplePlatform`).
 */
export const isUndoShortcut = (event: KeyboardEvent): boolean =>
  isKey(event, 'z') && !event.shiftKey && hasCommandModifier(event)

/**
 * Whether the keydown is the Redo shortcut: Ctrl+Shift+Z, ⌘⇧Z or Ctrl+Y, on
 * every platform. Ctrl+Y is Cytoscape Desktop's Redo on every OS, so it works
 * on macOS too. ⌘Y is not accepted: on macOS it is the browser's History.
 */
export const isRedoShortcut = (event: KeyboardEvent): boolean =>
  (isKey(event, 'z') && event.shiftKey && hasCommandModifier(event)) ||
  (isKey(event, 'y') &&
    !event.shiftKey &&
    !event.altKey &&
    event.ctrlKey &&
    !event.metaKey)

// Inputs that do not take text, so they have no undo of their own
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])

/**
 * Whether Undo and Redo may act on the network: the focus is not in a text
 * field (which keeps its own undo), and no dialog, popover or open menu has
 * the keyboard, so nothing changes under an open form. Unlike Ctrl/⌘+A, a
 * focused button or the table browser does not block them: choosing a menu
 * row hands the focus back to the menu's button, and Delete Selected Nodes
 * followed by Ctrl/⌘+Z must still undo.
 */
export const canUndoFromKeyboard = (doc: Document = document): boolean => {
  // Any open MUI modal (CyDialog, Popover, Drawer) keeps the shortcut out
  if (doc.querySelector('.MuiModal-root:not(.MuiModal-hidden)') !== null) {
    return false
  }
  const active = doc.activeElement
  if (!(active instanceof HTMLElement)) return true
  if (active.isContentEditable || active instanceof HTMLTextAreaElement) {
    return false
  }
  if (
    active instanceof HTMLInputElement &&
    !NON_TEXT_INPUT_TYPES.has(active.type)
  ) {
    return false
  }
  return (
    active.closest(
      '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
    ) === null
  )
}

/** The network Undo and Redo act on, as `useUndoStack` resolves it */
const getUndoTargetNetworkId = (): IdType => {
  const activeNetworkView = useUiStateStore.getState().ui.activeNetworkView
  return activeNetworkView === undefined || activeNetworkView === ''
    ? useWorkspaceStore.getState().workspace.currentNetworkId
    : activeNetworkView
}

const stackLength = (stack: 'undoStack' | 'redoStack'): number =>
  useUndoStore.getState().undoRedoStacks[getUndoTargetNetworkId()]?.[stack]
    ?.length ?? 0

/**
 * Ctrl/⌘+Z runs Edit ▸ Undo; Ctrl/⌘+Shift+Z and Ctrl+Y run Edit ▸ Redo, on
 * the same network as the menu rows
 */
export const useUndoRedoShortcuts = (): void => {
  const { undoLastEdit, redoLastEdit } = useUndoStack()
  // The listener is installed once; the commands change with the stores
  const commandsRef = useRef({ undoLastEdit, redoLastEdit })
  useEffect(() => {
    commandsRef.current = { undoLastEdit, redoLastEdit }
  }, [undoLastEdit, redoLastEdit])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.isComposing) return
      const undo = isUndoShortcut(event)
      if (!undo && !isRedoShortcut(event)) return
      if (!canUndoFromKeyboard()) return
      // Nothing to do: leave the key to the browser
      if (stackLength(undo ? 'undoStack' : 'redoStack') === 0) return
      event.preventDefault()
      if (undo) {
        commandsRef.current.undoLastEdit()
      } else {
        commandsRef.current.redoLastEdit()
      }
      logUi.info(`[useUndoRedoShortcuts]: ${undo ? 'undo' : 'redo'}`)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
