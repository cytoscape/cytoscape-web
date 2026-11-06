import { useEffect, useRef } from 'react'

import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useUndoStore } from '../../../data/hooks/stores/UndoStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useUndoStack } from '../../../data/hooks/useUndoStack'
import { logUi } from '../../../debug'
import { IdType } from '../../../models'
import { isEdgeCreationActive } from '../../NetworkPanel/CyjsRenderer/edgeCreationMode'
import { isApplePlatform } from '../SelectMenu/useSelectAllShortcut'

/** The Undo shortcut as the menu shows it */
export const undoShortcutLabel = (): string =>
  isApplePlatform() ? '⌘Z' : 'Ctrl+Z'

/** The Redo shortcut as the menu shows it: each platform's usual form */
export const redoShortcutLabel = (): string =>
  isApplePlatform() ? '⇧⌘Z' : 'Ctrl+Y'

/** The Undo row's shortcuts in `aria-keyshortcuts` form */
export const UNDO_KEY_SHORTCUTS = 'Control+Z Meta+Z'

/** The Redo row's shortcuts in `aria-keyshortcuts` form */
export const REDO_KEY_SHORTCUTS = 'Control+Shift+Z Meta+Shift+Z Control+Y'

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
 * Whether an MUI modal is open: a dialog (CyDialog), a popover, a drawer or
 * a context menu. Edits from the keyboard wait until it closes.
 */
export const isModalOpen = (doc: Document = document): boolean =>
  doc.querySelector('.MuiModal-root:not(.MuiModal-hidden)') !== null

/** The focused element, looking inside open shadow roots (web components) */
const deepActiveElement = (doc: Document): Element | null => {
  let active = doc.activeElement
  while (active?.shadowRoot?.activeElement != null) {
    active = active.shadowRoot.activeElement
  }
  return active
}

/** Whether the element or an ancestor matches, across shadow roots */
const closestComposed = (element: Element, selector: string): boolean => {
  let node: Element | null = element
  while (node !== null) {
    if (node.closest(selector) !== null) return true
    const root = node.getRootNode()
    node = root instanceof ShadowRoot ? root.host : null
  }
  return false
}

/**
 * Whether Undo and Redo may act on the network: the focus is not in a text
 * field (which keeps its own undo), and no dialog, popover or open menu has
 * the keyboard, so nothing changes under an open form. Unlike Ctrl/⌘+A, a
 * focused button or the table browser does not block them: choosing a menu
 * row hands the focus back to the menu's button, and Delete Selected Nodes
 * followed by Ctrl/⌘+Z must still undo.
 *
 * The focus is followed into open shadow roots, so a text field inside an
 * app's web component keeps its undo. A closed shadow root cannot be looked
 * into; an app widget there that handles Ctrl/⌘+Z must call
 * `preventDefault()`, which this shortcut respects.
 */
export const canUndoFromKeyboard = (doc: Document = document): boolean => {
  if (isModalOpen(doc)) return false
  const active = deepActiveElement(doc)
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
  return !closestComposed(
    active,
    '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
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
 * the same network as the menu rows. They change nothing while an edge is
 * being drawn ("Create Edge from this Node").
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
      // An edge is being drawn from a node, which an undo or redo could
      // remove (it may have created the node). Take the key, change nothing.
      if (isEdgeCreationActive()) return
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
