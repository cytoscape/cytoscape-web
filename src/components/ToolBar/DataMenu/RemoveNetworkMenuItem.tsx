import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'

export const RemoveNetworkMenuItem = (): ReactElement => {
  const deleteCurrentNetwork = useWorkspaceStore(
    (state) => state.deleteCurrentNetwork,
  )
  const handleRemoveNetwork = (): void => {
    deleteCurrentNetwork()
    console.info('Networks removed:')
  }

  return (
    <MenuItem onClick={handleRemoveNetwork}>Remove current network2</MenuItem>
  )
}
