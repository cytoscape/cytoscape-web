import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { useViewModelStore } from '../../../store/ViewModelStore'

export const DeleteSelectedNodesMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const [disabled, setDisabled] = useState<boolean>(true)
  const deleteSelectedNodes = useNetworkStore((state) => state.deleteNodes)

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const viewModel = useViewModelStore(
    (state) => state.getViewModel(currentNetworkId),
  )

  const selectedNodes: IdType[] =
    viewModel !== undefined ? viewModel.selectedNodes : []

  useEffect(() => {
    if (selectedNodes.length > 0) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [selectedNodes])

  const handleDeleteNodes = (): void => {
    // TODO: ask user to confirm deletion

    props.handleClose()
    deleteSelectedNodes(currentNetworkId, selectedNodes)
  }

  return (
    <MenuItem disabled={disabled} onClick={handleDeleteNodes}>
      Delete Selected Nodes
    </MenuItem>
  )
}
