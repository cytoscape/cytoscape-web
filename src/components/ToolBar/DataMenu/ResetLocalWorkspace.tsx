import { MenuItem } from '@mui/material'
import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNavigate } from 'react-router-dom'
import { ConfirmationDialog } from '../../Util/ConfirmationDialog'
import { debounce } from 'lodash'

export const ResetLocalWorkspaceMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace)

  const handleReset = (): void => {
    props.handleClose()
    resetWorkspace()
      .then(() => {
        // For safety: debounce the navigation to prevent any potential timing issues
        debounce(() => {
          navigate('/')
          navigate(0)
        }, 1500)()
      })
      .catch((error) => {
        console.error('Failed to reset workspace:', error)
        alert('Failed to reset workspace. Please try again.')
      })
  }

  return (
    <>
      <MenuItem onClick={() => setOpen(true)}>Clear Local Database</MenuItem>
      <ConfirmationDialog
        title="Reset Local Workspace (for developers)"
        message="Are you sure you want to reset all workspace data? (This deletes all of the local cache)"
        onConfirm={handleReset}
        open={open}
        setOpen={setOpen}
        buttonTitle="Reset Workspace (cannot be undone)"
        isAlert={true}
      />
    </>
  )
}
