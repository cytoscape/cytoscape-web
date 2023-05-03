import { MenuItem } from '@mui/material'
import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNavigate } from 'react-router-dom'
import { ConfirmationDialog } from '../../Util/ConfirmationDialog'

export const ResetLocalWorkspaceMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace)

  const handleReset = (): void => {
    props.handleClose()
    resetWorkspace()
    navigate('/')
    navigate(0)
  }

  return (
    <>
      <MenuItem onClick={() => setOpen(true)}>Clear local database</MenuItem>
      <ConfirmationDialog
        title="Reset Local Workspace (for developers)"
        message="Are you sure you want to reset all workspace data? (This deletes all of the local cache)"
        onConfirm={handleReset}
        open={open}
        setOpen={setOpen}
        buttonTitle="Reset Workspace (cannot be undone)"
      />
    </>
  )
}
