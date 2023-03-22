import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

export const UploadNetworkMenuItem = (
  props: BaseMenuProps,
): ReactElement => {

  const handleUploadNetwork = (): void => {
    props.handleClose()
  }

  return (
    <MenuItem onClick={handleUploadNetwork}>
      Upload Network from File
    </MenuItem>
  )
}
