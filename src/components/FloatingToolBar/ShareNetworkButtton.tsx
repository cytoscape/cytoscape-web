import { IconButton, Tooltip } from '@mui/material'
import { Share } from '@mui/icons-material'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useEffect, useRef } from 'react'
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
  // Use this as the staring point for the sharable URL
  const wsId = useWorkspaceStore((state) => state.workspace.id)

  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  // Encode UI states as URL search params
  const [search, setSearch] = useSearchParams()

  // selectedNodes from the URL
  const selectedNodesUrlRef = useRef<string | null>(null)

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

  const setSelection = (params: URLSearchParams): void => {
    if (networkViewModel === undefined) {
      return
    }

    const selectedNodeCount: number = networkViewModel.selectedNodes.length
    const selectedEdgeCount: number = networkViewModel.selectedEdges.length
    if (selectedNodeCount === 0 && selectedEdgeCount === 0) {
      params.delete(SelectionStates.SelectedNodes)
      params.delete(SelectionStates.SelectedEdges)
      setTimeout(() => {
        setSearch(params)
      }, 200)
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
    setTimeout(() => {
      setSearch(params)
    }, 200)
  }

  useEffect(() => {
    const selectedInURL = search.get(SelectionStates.SelectedNodes)
    if (selectedInURL !== null && selectedNodesUrlRef.current === null) {
      selectedNodesUrlRef.current = selectedInURL
    }
    if (
      selectedInURL !== null &&
      selectedNodesUrlRef.current !== null &&
      selectedInURL !== selectedNodesUrlRef.current
    ) {
      // Set the selected nodes in the URL
      const params = new URLSearchParams(search)
      params.set(SelectionStates.SelectedNodes, selectedInURL)
      setSelection(new URLSearchParams(search))
    }
  }, [])

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

    // Full URL
    const { href } = location

    // The first part of the URL should be the base URL
    const parts: string[] = href.split(wsId)
    const baseUrl = parts[0]

    const query = getQueryString()

    void copyTextToClipboard(
      // Here, "0" means dummy workspace ID only for the purpose of generating sharable URL
      `${baseUrl}0/networks/${currentNetworkId}?${query}`,
    ).then(() => {
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
