import { MenuItem } from '@mui/material'
import { ReactElement, useState } from 'react'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { BaseMenuProps } from '../BaseMenuProps'
import { LoadFromNdexDialog } from './LoadFromNdexDialog'

export const LoadFromNdexMenuItem = (props: BaseMenuProps): ReactElement => {
  const addNetworks: (ids: IdType | IdType[]) => void = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )

  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const [openDialog, setOpenDialog] = useState<boolean>(false)

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
    props.handleClose()
  }

  const handleOpenDialog = (): void => {
    setOpenDialog(true)
  }

  const handleLoad = (uuidStr: string): void => {
    const uuids: IdType[] = uuidStr.split(' ')
    console.log('Given UUID string: ', uuidStr)
    console.log('Got UUID List: ', uuids)
    addNetworks(uuids)
    let nextCurrentNetworkId: IdType | undefined
    if (Array.isArray(uuids)) {
      nextCurrentNetworkId = uuids[0]
    } else {
      nextCurrentNetworkId = uuids
    }

    if (nextCurrentNetworkId !== undefined) {
      setTimeout(() => setCurrentNetworkId(nextCurrentNetworkId as IdType), 500)
    }
    setOpenDialog(false)
    props.handleClose()
  }

  return (
    <>
      <MenuItem onClick={handleOpenDialog}>
        Load network(s) from NDEx...
      </MenuItem>
      <LoadFromNdexDialog
        open={openDialog}
        handleClose={handleCloseDialog}
        handleLoad={handleLoad}
      />
    </>
  )
}
