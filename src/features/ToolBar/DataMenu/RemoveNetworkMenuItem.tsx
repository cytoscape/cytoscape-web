import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'

import { useUrlNavigation } from '../../../hooks/navigation/useUrlNavigation'
import { useWorkspaceStore } from '../../../hooks/stores/WorkspaceStore'
import { ConfirmationDialog } from '../../ConfirmationDialog'
import { BaseMenuProps } from '../BaseMenuProps'

export const RemoveNetworkMenuItem = (props: BaseMenuProps): ReactElement => {
  const [open, setOpen] = useState<boolean>(false)
  const networkIds = useWorkspaceStore((state) => state.workspace.networkIds)
  const deleteCurrentNetwork = useWorkspaceStore(
    (state) => state.deleteCurrentNetwork,
  )
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const { navigateToNetwork } = useUrlNavigation()
  const workspace = useWorkspaceStore((state) => state.workspace)
  const handleRemoveNetwork = (): void => {
    props.handleClose()
    deleteCurrentNetwork()
    const nextNetworkId =
      networkIds.filter((networkId) => networkId !== currentNetworkId)?.[0] ??
      ''
    if (nextNetworkId !== '') {
      setCurrentNetworkId(nextNetworkId)
      navigateToNetwork({
        workspaceId: workspace.id,
        networkId: nextNetworkId,
        searchParams: new URLSearchParams(location.search),
        replace: true,
      })
    } else {
      setCurrentNetworkId('')
      navigateToNetwork({
        workspaceId: workspace.id,
        networkId: '',
        searchParams: new URLSearchParams(location.search),
        replace: true,
      })
    }
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
