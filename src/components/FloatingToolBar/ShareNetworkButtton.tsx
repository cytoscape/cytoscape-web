import { Alert, IconButton, Snackbar, Tooltip } from '@mui/material'
import { Share } from '@mui/icons-material'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Ui } from '../../models/UiModel'
import { NetworkView } from '../../models/ViewModel'
import { useUiStateStore } from '../../store/UiStateStore'
import { useViewModelStore } from '../../store/ViewModelStore'

// Selection will be encoded if the selected object count is less than this number
const MAX_SELECTED_OBJ = 300

export const SelectionStates = {
  SelectedNodes: 'selectednodes',
  SelectedEdges: 'selectededges',
} as const

export type SelectionState =
  (typeof SelectionStates)[keyof typeof SelectionStates]

/**
 * Button to copy the sharable URL to clipboard
 *
 * This component watches the UI and Selection states and encode them as URL search params
 */
export const ShareNetworkButton = (): JSX.Element => {
  // Use this as the staring point for the sharable URL
  const wsId = useWorkspaceStore((state) => state.workspace.id)

  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  // Encode UI states as URL search params
  const [search, setSearch] = useSearchParams()

  const ui: Ui = useUiStateStore((state) => state.ui)
  const { panels } = ui

  // This will be used to watch the selection state
  const networkViewModel: NetworkView = useViewModelStore(
    (state) => state.viewModels[currentNetworkId],
  )

  const selectedNodeCount: number = networkViewModel?.selectedNodes.length
  const selectedEdgeCount: number = networkViewModel?.selectedEdges.length

  const getQueryString = (): string => {
    const panelParams = new URLSearchParams(panels)
    const panelStr = panelParams.toString()
    const searchStr = search.toString()
    const tableBrowserIndexStr = `activeTableBrowserTab=${ui.tableUi.activeTabIndex}`
    return `${panelStr}&${searchStr}&${tableBrowserIndexStr}`
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
    setSelection(new URLSearchParams(search))
  }, [selectedNodeCount, selectedEdgeCount])

  const [open, setOpen] = useState(false)

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
      `${baseUrl}network/${currentNetworkId}?${query}`,
    ).then(() => {
      // Notify user that the sharable URL has been copied to clipboard
      setOpen(true)
    })
  }

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string,
  ): void => {
    if (reason === 'clickaway') {
      return
    }

    setOpen(false)
  }

  return (
    <>
      <Tooltip
        title={`Share this network (copy URL to clipboard)`}
        placement="top"
        arrow
      >
        <IconButton
          onClick={handleClick}
          aria-label="share"
          size="small"
          disableFocusRipple={true}
        >
          <Share fontSize="inherit" />
        </IconButton>
      </Tooltip>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={open}
        autoHideDuration={3000}
        onClose={handleClose}
      >
        <Alert onClose={handleClose} severity="success" sx={{ width: '100%' }}>
          URL for sharing this network has been copied!
        </Alert>
      </Snackbar>
    </>
  )
}
