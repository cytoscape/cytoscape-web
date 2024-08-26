/**
 * The menu item to display the AppSettings dialog
 */

import { MenuItem } from '@mui/material'
import { useState } from 'react'
import { AppSettingsDialog } from '../../AppManager/AppSettingsDialog'

interface AppSettingsMenuItemProps {
  handleClose: () => void
}

export const AppSettingsMenuItem = ({
  handleClose,
}: AppSettingsMenuItemProps) => {
  // Open/Close the dialog
  const [open, setOpen] = useState(false)

  const handleClick = (): void => {
    setOpen(true)
  }

  return (
    <>
      <MenuItem onClick={handleClick}>Settings</MenuItem>
      <AppSettingsDialog
        open={open}
        setOpen={setOpen}
        handleClose={handleClose}
      />
    </>
  )
}
