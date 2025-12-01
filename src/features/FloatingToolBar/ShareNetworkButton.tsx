import { Share } from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'
import { useContext, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import { AppConfigContext } from '../../AppConfigContext'
import { logUi } from '../../debug'
import { useMessageStore } from '../../data/hooks/stores/MessageStore'
import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { isSubnetwork } from '../HierarchyViewer/utils/hierarchyUtil'
import { IdType } from '../../models'
import { MessageSeverity } from '../../models/MessageModel'
import { Ui } from '../../models/UiModel'
import { NetworkView } from '../../models/ViewModel'

// Selection will be encoded if the selected object count is less than this number
const MAX_SELECTED_OBJ = 300

export const SelectionStates = {
  SelectedNodes: 'selectednodes',
  SelectedEdges: 'selectededges',
} as const

export type SelectionState =
  (typeof SelectionStates)[keyof typeof SelectionStates]

interface ShareNetworkButtonProps {
  targetNetworkId?: IdType
}

/**
 * Button to copy the sharable URL to clipboard
 *
 * This component watches the UI and Selection states and encode them as URL search params
 */
export const ShareNetworkButton = ({
  targetNetworkId,
}: ShareNetworkButtonProps): JSX.Element => {
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  // Encode UI states as URL search params
  const [search] = useSearchParams()
  const { urlBaseName } = useContext(AppConfigContext)

  const ui: Ui = useUiStateStore((state) => state.ui)
  const { panels } = ui

  // Get view models for both current network and target network (if different)
  const networkViewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )

  const targetNetworkViewModel: NetworkView | undefined = useViewModelStore(
    (state) => state.getViewModel(targetNetworkId ?? ''),
  )

  const networkSummary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const isLocal = networkSummary?.isNdex !== true

  const addMessage = useMessageStore((state) => state.addMessage)

  const getQueryString = (): string => {
    const panelParams = new URLSearchParams(panels)
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

  const getSelectionParams = (): URLSearchParams => {
    const params = new URLSearchParams()

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

    // Encode subnetwork selection if targetNetworkId is a subnetwork
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

  const setSelection = (params: URLSearchParams): void => {
    // Update main network selection params
    if (networkViewModel !== undefined) {
      const selectedNodeCount: number = networkViewModel.selectedNodes.length
      const selectedEdgeCount: number = networkViewModel.selectedEdges.length

      if (selectedNodeCount > 0 && selectedNodeCount <= MAX_SELECTED_OBJ) {
        params.set(
          SelectionStates.SelectedNodes,
          networkViewModel.selectedNodes.join(' '),
        )
      } else {
        params.delete(SelectionStates.SelectedNodes)
      }

      if (selectedEdgeCount > 0 && selectedEdgeCount <= MAX_SELECTED_OBJ) {
        params.set(
          SelectionStates.SelectedEdges,
          networkViewModel.selectedEdges.join(' '),
        )
      } else {
        params.delete(SelectionStates.SelectedEdges)
      }
    } else {
      params.delete(SelectionStates.SelectedNodes)
      params.delete(SelectionStates.SelectedEdges)
    }

    // Update subnetwork selection params
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
      } else {
        params.delete('selectedSubnetworkNodes')
      }

      if (
        selectedSubnetworkEdgeCount > 0 &&
        selectedSubnetworkEdgeCount <= MAX_SELECTED_OBJ
      ) {
        params.set(
          'selectedSubnetworkEdges',
          targetNetworkViewModel.selectedEdges.join(' '),
        )
      } else {
        params.delete('selectedSubnetworkEdges')
      }
    } else {
      params.delete('selectedSubnetworkNodes')
      params.delete('selectedSubnetworkEdges')
    }
  }

  useEffect(() => {
    setSelection(new URLSearchParams(search))
  }, [
    networkViewModel?.selectedNodes,
    networkViewModel?.selectedEdges,
    targetNetworkViewModel?.selectedNodes,
    targetNetworkViewModel?.selectedEdges,
    targetNetworkId,
  ])

  const copyTextToClipboard = async (text: string): Promise<void> => {
    if ('clipboard' in navigator) {
      return await navigator.clipboard.writeText(text)
    }
  }
  const handleClick = (): void => {
    const { location } = window
    // Get base query parameters
    const baseUrl = (location.origin + urlBaseName).replace(/\/+$/, '')
    const baseQuery = getQueryString()
    const allParams = new URLSearchParams(baseQuery)

    // Add selection parameters
    const selectionParams = getSelectionParams()
    selectionParams.forEach((value, key) => {
      allParams.set(key, value)
    })

    const finalQuery = allParams.toString()

    // Here, "0" means dummy workspace ID only for the purpose of generating sharable URL
    const newUrl = `${baseUrl}/0/networks/${currentNetworkId}?${finalQuery}`
    logUi.info(
      `[${ShareNetworkButton.name}]:[${handleClick.name}]: Copied Sharable URL: ${newUrl}`,
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

  return (
    <>
      <Tooltip
        title={
          isLocal
            ? 'Save this network to NDEx first to generate a shareable URL.'
            : 'Share this network (copy URL to clipboard)'
        }
        placement="top"
        arrow
      >
        <span>
          <IconButton
            data-testid="share-network-button"
            onClick={isLocal ? undefined : handleClick}
            aria-label="share"
            size="small"
            disableFocusRipple
            disabled={isLocal}
          >
            <Share fontSize="inherit" />
          </IconButton>
        </span>
      </Tooltip>
    </>
  )
}
