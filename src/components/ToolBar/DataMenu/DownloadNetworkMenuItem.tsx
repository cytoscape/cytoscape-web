import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

export const DownloadNetworkMenuItem = (
  props: BaseMenuProps,
): ReactElement => {

  const handleDownloadNetwork = (): void => {
    props.handleClose()
  }

  return (
    <MenuItem onClick={handleDownloadNetwork}>
      Download Network to File
    </MenuItem>
  )
}
