import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'

export const RemoveAllNetworksMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const deleteAllNetworks = useWorkspaceStore(
    (state) => state.deleteAllNetworks,
  )

  const handleDeleteAllNetworks = (): void => {
    console.info('All networks removed')
    props.handleClose()
    deleteAllNetworks()
  }

  return (
    <MenuItem onClick={handleDeleteAllNetworks}>Remove all networks</MenuItem>
  )
}
