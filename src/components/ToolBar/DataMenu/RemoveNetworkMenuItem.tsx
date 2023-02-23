import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { BaseMenuProps } from '../BaseMenuProps'

export const RemoveNetworkMenuItem = (props: BaseMenuProps): ReactElement => {
  const deleteCurrentNetwork = useWorkspaceStore(
    (state) => state.deleteCurrentNetwork,
  )

  const handleRemoveNetwork = (): void => {
    props.handleClose()
    deleteCurrentNetwork()

    // TODO: ask user to confirm deletion
  }

  return (
    <MenuItem onClick={handleRemoveNetwork}>Remove current network</MenuItem>
  )
}
