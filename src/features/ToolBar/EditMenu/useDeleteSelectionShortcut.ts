import { useEffect } from 'react'

import { deleteSelectedElements } from '../../../data/edit/deleteSelection'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { logUi } from '../../../debug'
import { isEdgeCreationActive } from '../../NetworkPanel/CyjsRenderer/edgeCreationMode'
import { isCanvasFocused } from '../SelectMenu/useSelectAllShortcut'
import { isModalOpen } from './useUndoRedoShortcuts'

/**
 * Whether the keydown is the Delete Selection shortcut: Delete or Backspace
 * (the Mac keyboard's "delete" key), with no modifier. A held key's repeats
 * match too; the shortcut ignores them.
 */
export const isDeleteSelectionShortcut = (event: KeyboardEvent): boolean =>
  (event.key === 'Delete' || event.key === 'Backspace') &&
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
 *
 * While the canvas has the key, the shortcut always takes it, even when it
 * deletes nothing: an engine that still maps Backspace to Back (Playwright's
 * WebKit does) would otherwise leave the page. It deletes nothing for a held
 * key's repeats (one press, one deletion), with nothing selected, or while an
 * edge is being drawn ("Create Edge from this Node"), whose source node it
 * would otherwise delete.
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
      event.preventDefault()
      if (event.repeat || isEdgeCreationActive()) return
      const networkId = getDeleteTargetNetworkId()
      if (networkId === '' || !deleteSelectedElements(networkId)) return
      logUi.info(`[useDeleteSelectionShortcut]: deleted from ${networkId}`)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
