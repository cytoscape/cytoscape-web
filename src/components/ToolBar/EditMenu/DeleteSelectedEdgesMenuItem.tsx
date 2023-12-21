import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { NetworkView } from '../../../models/ViewModel'
import { useViewModelStore } from '../../../store/ViewModelStore'

export const DeleteSelectedEdgesMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const [disabled, setDisabled] = useState<boolean>(true)

  const deleteSelectedEdges = useNetworkStore((state) => state.deleteEdges)
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const viewModel: NetworkView | undefined = useViewModelStore(
    (state) => state.getViewModel(currentNetworkId),
  )

  const selectedEdges: IdType[] =
    viewModel !== undefined ? viewModel.selectedEdges : []

  useEffect(() => {
    if (selectedEdges.length > 0) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [selectedEdges])

  const handleDeleteEdges = (): void => {
    // TODO: ask user to confirm deletion

    props.handleClose()
    deleteSelectedEdges(currentNetworkId, selectedEdges)
  }

  return (
    <MenuItem disabled={disabled} onClick={handleDeleteEdges}>
      Delete Selected Edges
    </MenuItem>
  )
}
