import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { NetworkView } from '../../../models/ViewModel'
import { useViewModelStore } from '../../../store/ViewModelStore'

export const DeleteSelectedNodesMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const deleteSelectedNodes = useNetworkStore((state) => state.deleteNodes)
  const deleteObjects = useViewModelStore((state) => state.deleteObjects)

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const networkViewModel: NetworkView = useViewModelStore(
    (state) => state.viewModels[currentNetworkId],
  )

  const selectedNodes: IdType[] =
    networkViewModel !== undefined ? networkViewModel.selectedNodes : []

  const handleDeleteNodes = (): void => {
    // TODO: ask user to confirm deletion

    props.handleClose()
    deleteSelectedNodes(currentNetworkId, selectedNodes)
    deleteObjects(currentNetworkId, selectedNodes)
    // TODO: Propagate to views and other stores
  }

  return <MenuItem onClick={handleDeleteNodes}>Delete Selected Nodes</MenuItem>
}
