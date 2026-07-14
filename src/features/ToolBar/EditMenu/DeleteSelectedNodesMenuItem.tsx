import DeleteIcon from '@mui/icons-material/Delete'
import { ReactElement } from 'react'

import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useDeleteNodes } from '../../../data/hooks/useDeleteNodes'
import { NetworkView } from '../../../models'
import { IdType } from '../../../models/IdType'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

export const DeleteSelectedNodesMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  const { deleteNodes } = useDeleteNodes()

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

  // Disable the menu item if there are no selected nodes
  // or if the sub network view is selected
  const disabled: boolean =
    selectedNodes.length === 0 || targetNetworkId !== currentNetworkId

  const handleDeleteNodes = (): void => {
    props.onClick()

    // Delete the selected nodes
    deleteNodes(currentNetworkId, selectedNodes)

    // Clear the selection
    exclusiveSelect(currentNetworkId, [], [])
  }

  return (
    <DropdownMenuItem
      label="Delete Selected Nodes"
      icon={<DeleteIcon />}
      disabled={disabled}
      onClick={handleDeleteNodes}
    />
  )
}
