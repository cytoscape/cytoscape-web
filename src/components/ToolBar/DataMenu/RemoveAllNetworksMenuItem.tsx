import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'

export const RemoveAllNetworksMenuItem = (): ReactElement => {
  const handleRemoveAllNetworks = (): void => {
    console.info('All networks removed')
  }

  return (
    <MenuItem onClick={handleRemoveAllNetworks}>
      Remove all networks
    </MenuItem>
  )
}
