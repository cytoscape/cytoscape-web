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
