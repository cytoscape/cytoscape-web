import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'

import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useDeleteNodes } from '../../../data/hooks/useDeleteNodes'
import { NetworkView } from '../../../models'
import { IdType } from '../../../models/IdType'
import { BaseMenuProps } from '../BaseMenuProps'

export const DeleteSelectedNodesMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const { deleteNodes } = useDeleteNodes()

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

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)

  const selectedNodes: IdType[] =
    viewModel !== undefined ? viewModel.selectedNodes : []

  useEffect(() => {
    // Disable the menu item if there are no selected nodes
    // or if the sub network view is selected
    if (selectedNodes.length > 0 && targetNetworkId === currentNetworkId) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [selectedNodes, targetNetworkId])

  const handleDeleteNodes = (): void => {
    props.handleClose()

    // Delete the selected nodes
    deleteNodes(currentNetworkId, selectedNodes)

    // Clear the selection
    exclusiveSelect(currentNetworkId, [], [])
  }

  return (
    <MenuItem disabled={disabled} onClick={handleDeleteNodes}>
      Delete Selected Nodes
    </MenuItem>
  )
}
