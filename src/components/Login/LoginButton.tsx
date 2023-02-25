import { Avatar } from '@mui/material'
import { deepOrange } from '@mui/material/colors'
import { ReactElement, useState } from 'react'
import { LoginPanel } from './LoginPanel'

export const LoginButton = (): ReactElement => {
  const [open, setOpen] = useState<boolean>(false)

  const handleClose = (): void => {
    if (!open) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  return (
    <>
      <Avatar
        sx={{
          bgcolor: deepOrange[500],
          marginLeft: 2,
          width: '32',
          height: '32',
        }}
        onClick={handleClose}
      />
      <LoginPanel open={open} handleClose={handleClose} />
    </>
  )
}
