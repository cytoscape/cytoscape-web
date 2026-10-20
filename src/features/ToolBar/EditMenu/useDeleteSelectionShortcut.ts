import { useEffect } from 'react'

import { deleteSelectedElements } from '../../../data/edit/deleteSelection'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { logUi } from '../../../debug'
import { isCanvasFocused } from '../SelectMenu/useSelectAllShortcut'
import { isModalOpen } from './useUndoRedoShortcuts'

/**
 * Whether the keydown is the Delete Selection shortcut: Delete or Backspace
 * (the Mac keyboard's "delete" key), with no modifier. A held key's repeats
 * are ignored: one press, one deletion.
 */
export const isDeleteSelectionShortcut = (event: KeyboardEvent): boolean =>
  (event.key === 'Delete' || event.key === 'Backspace') &&
  !event.repeat &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.altKey &&
  !event.shiftKey

/**
 * The network the shortcut deletes from: the current network, and none while
 * a Hierarchy Viewer subnetwork view is active (its elements are derived from
 * the hierarchy), as Delete Selected Nodes does
 */
const getDeleteTargetNetworkId = (): string => {
  const currentNetworkId =
    useWorkspaceStore.getState().workspace.currentNetworkId
  const activeNetworkView = useUiStateStore.getState().ui.activeNetworkView
  return activeNetworkView === undefined ||
    activeNetworkView === '' ||
    activeNetworkView === currentNetworkId
    ? currentNetworkId
    : ''
}

/**
 * Delete or Backspace deletes the selected nodes and edges of the current
 * network, as one undo step. It has no menu row. It acts only while the
 * network canvas has the keyboard and no modal is open, so a text field, the
 * table browser (where Delete clears cells) and a menu keep the key.
 */
export const useDeleteSelectionShortcut = (): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        !isDeleteSelectionShortcut(event) ||
        !isCanvasFocused() ||
        isModalOpen()
      ) {
        return
      }
      const networkId = getDeleteTargetNetworkId()
      // Nothing selected: leave the key to the browser
      if (networkId === '' || !deleteSelectedElements(networkId)) return
      event.preventDefault()
      logUi.info(`[useDeleteSelectionShortcut]: deleted from ${networkId}`)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
