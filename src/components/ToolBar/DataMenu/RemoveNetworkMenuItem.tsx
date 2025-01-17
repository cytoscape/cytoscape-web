import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { BaseMenuProps } from '../BaseMenuProps'
import { ConfirmationDialog } from '../../Util/ConfirmationDialog'

export const RemoveNetworkMenuItem = (props: BaseMenuProps): ReactElement => {
  const [open, setOpen] = useState<boolean>(false)
  const networkIds = useWorkspaceStore((state) => state.workspace.networkIds)
  const deleteCurrentNetwork = useWorkspaceStore(
    (state) => state.deleteCurrentNetwork,
  )

  const handleRemoveNetwork = (): void => {
    props.handleClose()
    deleteCurrentNetwork()
  }

  return (
    <>
      <MenuItem
        disabled={networkIds.length === 0}
        onClick={() => setOpen(true)}
      >
        Remove Current Network
      </MenuItem>
      <ConfirmationDialog
        title="Remove Current Network"
        message="Do you really want to delete this network?"
        onConfirm={handleRemoveNetwork}
        open={open}
        setOpen={setOpen}
        buttonTitle="Yes (cannot be undone)"
        isAlert={true}
      />
    </>
  )
}
