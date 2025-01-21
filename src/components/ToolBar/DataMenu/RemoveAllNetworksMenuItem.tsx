import { MenuItem } from '@mui/material'
import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { ConfirmationDialog } from '../../Util/ConfirmationDialog'

export const RemoveAllNetworksMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const [open, setOpen] = useState(false)
  const networkIds = useWorkspaceStore((state) => state.workspace.networkIds)
  const deleteAllNetworks = useWorkspaceStore(
    (state) => state.deleteAllNetworks,
  )

  const handleDeleteAllNetworks = (): void => {
    props.handleClose()
    deleteAllNetworks()
  }

  return (
    <>
      <MenuItem
        disabled={networkIds.length === 0}
        onClick={() => setOpen(true)}
      >
        Remove All Networks
      </MenuItem>
      <ConfirmationDialog
        title="Remove All Networks"
        message="Do you really want to delete all networks from this workspace?"
        onConfirm={handleDeleteAllNetworks}
        open={open}
        setOpen={setOpen}
        buttonTitle="Yes (cannot be undone)"
        isAlert={true}
      />
    </>
  )
}
