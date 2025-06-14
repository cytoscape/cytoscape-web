import { IconButton, Tooltip } from '@mui/material'
import { Share } from '@mui/icons-material'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Ui } from '../../models/UiModel'
import { NetworkView } from '../../models/ViewModel'
import { useUiStateStore } from '../../store/UiStateStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { IdType } from '../../models'
import { useMessageStore } from '../../store/MessageStore'
import { MessageSeverity } from '../../models/MessageModel'
import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'

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

  const ui: Ui = useUiStateStore((state) => state.ui)
  const { panels } = ui

  // This will be used to watch the selection state
  const networkViewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
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
    }
    if (targetNetworkId) {
      searchObj.activeNetworkView = targetNetworkId
    }
    const searchStr = new URLSearchParams(searchObj).toString()
    return searchStr
  }

  const getSelectionParams = (): URLSearchParams => {
    const params = new URLSearchParams()

    if (networkViewModel === undefined) {
      return params
    }

    const selectedNodeCount: number = networkViewModel.selectedNodes.length
    const selectedEdgeCount: number = networkViewModel.selectedEdges.length

    if (selectedNodeCount === 0 && selectedEdgeCount === 0) {
      return params
    }

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

    return params
  }

  const setSelection = (params: URLSearchParams): void => {
    if (networkViewModel === undefined) {
      return
    }

    const selectedNodeCount: number = networkViewModel.selectedNodes.length
    const selectedEdgeCount: number = networkViewModel.selectedEdges.length
    if (selectedNodeCount === 0 && selectedEdgeCount === 0) {
      params.delete(SelectionStates.SelectedNodes)
      params.delete(SelectionStates.SelectedEdges)
      // setSearch(params)
      return
    }

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
  }

  useEffect(() => {
    setSelection(new URLSearchParams(search))
  }, [networkViewModel?.selectedNodes, networkViewModel?.selectedEdges])

  const copyTextToClipboard = async (text: string): Promise<void> => {
    if ('clipboard' in navigator) {
      return await navigator.clipboard.writeText(text)
    }
  }
  const handleClick = (): void => {
    const { location } = window

    // Get the origin (protocol + domain + port) instead of splitting by wsId
    const baseUrl = location.origin + '/'

    // Get base query parameters
    const baseQuery = getQueryString()
    const allParams = new URLSearchParams(baseQuery)

    // Add selection parameters
    const selectionParams = getSelectionParams()
    selectionParams.forEach((value, key) => {
      allParams.set(key, value)
    })

    const finalQuery = allParams.toString()

    // Here, "0" means dummy workspace ID only for the purpose of generating sharable URL
    const newUrl = `${baseUrl}0/networks/${currentNetworkId}?${finalQuery}`
    console.log(`Copied Sharable URL: ${newUrl}`)
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
