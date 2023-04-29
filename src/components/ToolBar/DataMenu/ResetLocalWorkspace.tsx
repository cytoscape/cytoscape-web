import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'

export const ResetLocalWorkspaceMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const deleteAllNetworks = useWorkspaceStore(
    (state) => state.deleteAllNetworks,
  )

  const handleReset = (): void => {
    console.info('All networks removed')
    props.handleClose()
    deleteAllNetworks()
  }

  return <MenuItem onClick={handleReset}>Clear all workspace data</MenuItem>
}
