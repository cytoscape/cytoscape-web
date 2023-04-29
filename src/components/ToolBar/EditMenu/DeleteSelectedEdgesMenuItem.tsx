import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { NetworkView } from '../../../models/ViewModel'
import { useViewModelStore } from '../../../store/ViewModelStore'

export const DeleteSelectedEdgesMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const deleteSelectedEdges = useNetworkStore((state) => state.deleteEdges)
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const networkViewModel: NetworkView = useViewModelStore(
    (state) => state.viewModels[currentNetworkId],
  )

  const selectedEdges: IdType[] =
    networkViewModel !== undefined ? networkViewModel.selectedEdges : []

  const handleDeleteEdges = (): void => {
    // TODO: ask user to confirm deletion

    props.handleClose()
    deleteSelectedEdges(currentNetworkId, selectedEdges)
    // TODO: Propagate to views and other stores
  }

  return <MenuItem onClick={handleDeleteEdges}>Delete Selected Edges</MenuItem>
}
