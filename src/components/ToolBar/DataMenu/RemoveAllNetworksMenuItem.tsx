import { MenuItem } from '@mui/material'
import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { ConfirmationDialog } from '../../Util/ConfirmationDialog'
import { useNavigate } from 'react-router-dom'

export const RemoveAllNetworksMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const navigate = useNavigate()
  const workspace = useWorkspaceStore((state) => state.workspace)

  const { id } = workspace

  const [open, setOpen] = useState(false)
  const deleteAllNetworks = useWorkspaceStore(
    (state) => state.deleteAllNetworks,
  )

  const handleDeleteAllNetworks = (): void => {
    console.info('All networks removed')
    props.handleClose()
    deleteAllNetworks()

    // Update the URL
    navigate(`/${id}/networks`)
  }

  return (
    <>
      <MenuItem onClick={() => setOpen(true)}>Remove all networks</MenuItem>
      <ConfirmationDialog
        title="Remove All Networks"
        message="Are you sure you want to remeve all networks from this worksppace?"
        onConfirm={handleDeleteAllNetworks}
        open={open}
        setOpen={setOpen}
        buttonTitle="Confirm (cannot be undone)"
      />
    </>
  )
}
