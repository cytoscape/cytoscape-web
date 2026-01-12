import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'

import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useCreateEdge } from '../../../data/hooks/useCreateEdge'
import { NetworkView } from '../../../models'
import { IdType } from '../../../models/IdType'
import { BaseMenuProps } from '../BaseMenuProps'

export const CreateEdgeMenuItem = (props: BaseMenuProps): ReactElement => {
  const { createEdge } = useCreateEdge()

  const [disabled, setDisabled] = useState<boolean>(true)

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  // Grab active network view id
  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const targetNetworkId: IdType =
    activeNetworkId === undefined || activeNetworkId === ''
      ? currentNetworkId
      : activeNetworkId

  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )

  const selectedNodes: IdType[] =
    viewModel !== undefined ? viewModel.selectedNodes : []

  useEffect(() => {
    // Disable the menu item if fewer than 2 nodes are selected
    // or if the sub network view is selected
    if (selectedNodes.length >= 2 && targetNetworkId === currentNetworkId) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [selectedNodes, targetNetworkId, currentNetworkId])

  const handleCreateEdge = (): void => {
    props.handleClose()

    // Pick two random nodes from the selected nodes
    const shuffled = [...selectedNodes].sort(() => Math.random() - 0.5)
    const sourceNodeId = shuffled[0]
    const targetNodeId = shuffled[1]

    // Create the edge between the two nodes
    createEdge(currentNetworkId, sourceNodeId, targetNodeId)
  }

  return (
    <MenuItem disabled={disabled} onClick={handleCreateEdge}>
      Create Edge
    </MenuItem>
  )
}

