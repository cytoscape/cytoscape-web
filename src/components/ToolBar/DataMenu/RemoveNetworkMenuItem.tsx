import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { BaseMenuProps } from '../BaseMenuProps'
import { useNavigate } from 'react-router-dom'
import { ConfirmationDialog } from '../../Util/ConfirmationDialog'

export const RemoveNetworkMenuItem = (props: BaseMenuProps): ReactElement => {
  const [open, setOpen] = useState<boolean>(false)
  const navigate = useNavigate()
  const workspace = useWorkspaceStore((state) => state.workspace)

  const { id } = workspace
  const deleteCurrentNetwork = useWorkspaceStore(
    (state) => state.deleteCurrentNetwork,
  )

  useEffect(() => {
    if (workspace.networkIds.length === 0) {
      // Update the URL
      navigate(`/${id}/networks`)
    }
  }, [workspace.networkIds.length])

  const handleRemoveNetwork = (): void => {
    props.handleClose()
    deleteCurrentNetwork()
  }

  return (
    <>
      <MenuItem onClick={() => setOpen(true)}>Remove current network</MenuItem>
      <ConfirmationDialog
        title="Remove Current Network"
        message="Do you really want to delete this network?"
        onConfirm={handleRemoveNetwork}
        open={open}
        setOpen={setOpen}
        buttonTitle="Yes (cannot be undone)"
      />
    </>
  )
}
