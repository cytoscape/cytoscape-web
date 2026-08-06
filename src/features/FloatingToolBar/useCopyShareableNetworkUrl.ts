import { useContext } from 'react'
import { useSearchParams } from 'react-router-dom'

import { AppConfigContext } from '../../AppConfigContext'
import { useMessageStore } from '../../data/hooks/stores/MessageStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { logUi } from '../../debug'
import { IdType } from '../../models'
import { MessageSeverity } from '../../models/MessageModel'
import { NetworkView } from '../../models/ViewModel'
import { useSubNetworkStore } from '../HierarchyViewer/store/SubNetworkStore'
import { isSubnetwork } from '../HierarchyViewer/utils/hierarchyUtil'
import { resolveShareTargetNetworkId } from './resolveShareTargetNetworkId'
import { buildShareUrl } from './shareUrl'

// Selection will be encoded if the selected object count is less than this number
const MAX_SELECTED_OBJ = 300

export const SelectionStates = {
  SelectedNodes: 'selectednodes',
  SelectedEdges: 'selectededges',
} as const

export type SelectionState =
  (typeof SelectionStates)[keyof typeof SelectionStates]

/**
 * Returns a function that copies a sharable URL for the current network to the
 * clipboard, encoding the UI and selection states as URL search params.
 *
 * The URL always points at the current network, so callers should only offer
 * this for that network. An optional `targetNetworkId` names the network view
 * to restore (the hierarchy viewer's subnetwork toolbar passes its own).
 */
export const useCopyShareableNetworkUrl = () => {
  // Encode UI states as URL search params
  const [search] = useSearchParams()
  const { urlBaseName } = useContext(AppConfigContext)
  const addMessage = useMessageStore((state) => state.addMessage)

  const getQueryString = (targetNetworkId: IdType | undefined): string => {
    const ui = useUiStateStore.getState().ui
    const panelParams = new URLSearchParams(ui.panels)
    const panelObj = Object.fromEntries(panelParams.entries())
    const searchObj: Record<string, string> = {
      ...Object.fromEntries(search.entries()),
      ...panelObj,
      activeTableBrowserTab: `${ui.tableUi.activeTabIndex}`,
      activeNetworkViewTab: `${ui.networkViewUi.activeTabIndex}`,
    }
    if (targetNetworkId) {
      searchObj.activeNetworkView = targetNetworkId
    }
    const searchStr = new URLSearchParams(searchObj).toString()
    return searchStr
  }

  const getSelectionParams = (
    currentNetworkId: IdType,
    targetNetworkId: IdType | undefined,
  ): URLSearchParams => {
    const params = new URLSearchParams()
    const getViewModel = useViewModelStore.getState().getViewModel
    const networkViewModel: NetworkView | undefined =
      getViewModel(currentNetworkId)

    // Encode main network selection (currentNetworkId)
    if (networkViewModel !== undefined) {
      const selectedNodeCount: number = networkViewModel.selectedNodes.length
      const selectedEdgeCount: number = networkViewModel.selectedEdges.length

      if (selectedNodeCount > 0 && selectedNodeCount <= MAX_SELECTED_OBJ) {
        params.set(
          SelectionStates.SelectedNodes,
          networkViewModel.selectedNodes.join(' '),
        )
      }

      if (selectedEdgeCount > 0 && selectedEdgeCount <= MAX_SELECTED_OBJ) {
        params.set(
          SelectionStates.SelectedEdges,
          networkViewModel.selectedEdges.join(' '),
        )
      }
    }

    const targetNetworkViewModel: NetworkView | undefined = getViewModel(
      targetNetworkId ?? '',
    )

    // Encode subnetwork selection if the target network is a subnetwork
    if (
      targetNetworkId &&
      targetNetworkId !== currentNetworkId &&
      isSubnetwork(targetNetworkId) &&
      targetNetworkViewModel !== undefined
    ) {
      const selectedSubnetworkNodeCount: number =
        targetNetworkViewModel.selectedNodes.length
      const selectedSubnetworkEdgeCount: number =
        targetNetworkViewModel.selectedEdges.length

      if (
        selectedSubnetworkNodeCount > 0 &&
        selectedSubnetworkNodeCount <= MAX_SELECTED_OBJ
      ) {
        params.set(
          'selectedSubnetworkNodes',
          targetNetworkViewModel.selectedNodes.join(' '),
        )
      }

      if (
        selectedSubnetworkEdgeCount > 0 &&
        selectedSubnetworkEdgeCount <= MAX_SELECTED_OBJ
      ) {
        params.set(
          'selectedSubnetworkEdges',
          targetNetworkViewModel.selectedEdges.join(' '),
        )
      }
    }

    return params
  }

  const copyTextToClipboard = async (text: string): Promise<void> => {
    if ('clipboard' in navigator) {
      return await navigator.clipboard.writeText(text)
    }
  }

  const copyShareableNetworkUrl = (targetNetworkId?: IdType): void => {
    const currentNetworkId =
      useWorkspaceStore.getState().workspace.currentNetworkId

    // Determine the target network ID: an explicit target (subnetwork toolbar),
    // the active network view, or the subnetwork currently shown (CW-654).
    const effectiveTargetNetworkId: IdType | undefined =
      resolveShareTargetNetworkId({
        targetNetworkId,
        activeNetworkView: useUiStateStore.getState().ui.activeNetworkView,
        currentNetworkId,
        shownSubNetworkId: useSubNetworkStore.getState().currentSubNetworkId,
      })

    const { location } = window
    // Get base query parameters
    const baseQuery = getQueryString(effectiveTargetNetworkId)
    const allParams = new URLSearchParams(baseQuery)

    // Add selection parameters
    const selectionParams = getSelectionParams(
      currentNetworkId,
      effectiveTargetNetworkId,
    )
    selectionParams.forEach((value, key) => {
      allParams.set(key, value)
    })

    const finalQuery = allParams.toString()

    // Build through the URL API so a bad origin / urlBaseName can't silently
    // produce a malformed link (CW-514). Report an error rather than copying
    // garbage to the clipboard.
    let newUrl: string
    try {
      newUrl = buildShareUrl(
        location.origin,
        urlBaseName,
        currentNetworkId,
        finalQuery,
      )
    } catch (error) {
      logUi.error(
        `[${useCopyShareableNetworkUrl.name}]: Failed to build sharable URL`,
        error,
      )
      addMessage({
        message: 'Unable to generate a shareable URL for this network.',
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
      return
    }

    logUi.info(
      `[${useCopyShareableNetworkUrl.name}]: Copied Sharable URL: ${newUrl}`,
    )

    void copyTextToClipboard(newUrl).then(() => {
      // Notify user that the sharable URL has been copied to clipboard
      addMessage({
        message: 'URL for sharing this network has been copied!',
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    })
  }

  return copyShareableNetworkUrl
}
