import DeleteIcon from '@mui/icons-material/Delete'
import { ReactElement, useEffect, useState } from 'react'

import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useDeleteEdges } from '../../../data/hooks/useDeleteEdges'
import { IdType } from '../../../models/IdType'
import { NetworkView } from '../../../models/ViewModel'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'


export const DeleteSelectedEdgesMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  const { deleteEdges } = useDeleteEdges()

  const [disabled, setDisabled] = useState<boolean>(true)

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)

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
    props.onClick()

    // Delete the selected edges
    deleteEdges(currentNetworkId, selectedEdges)

    // Clear the selection
    exclusiveSelect(currentNetworkId, [], [])
  }

  return (
    <DropdownMenuItem
      label="Delete Selected Edges"
      icon={<DeleteIcon />}
      disabled={disabled}
      onClick={handleDeleteEdges}
    />
  )
}
