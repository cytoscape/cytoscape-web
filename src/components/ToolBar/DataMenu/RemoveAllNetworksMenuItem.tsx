import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

export const RemoveAllNetworksMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const handleRemoveAllNetworks = (): void => {
    console.info('(Not implemented) All networks removed')
    props.handleClose()
  }

  return (
    <MenuItem onClick={handleRemoveAllNetworks}>Remove all networks</MenuItem>
  )
}
