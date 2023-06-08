import React, { useState, useEffect } from 'react'
import { Snackbar, SnackbarCloseReason } from '@mui/material'

import { useMessageStore } from '../../store/MessageStore'

export const SnackbarMessageList = (): React.ReactElement => {
  const [open, setOpen] = useState(false)
  const messages = useMessageStore((state) => state.messages)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

  useEffect(() => {
    if (messages.length > 0) {
      setOpen(true)
    }
  }, [messages])

  const handleSnackbarClose = (
    event: React.SyntheticEvent,
    reason: SnackbarCloseReason,
  ): void => {
    if (reason === 'clickaway') {
      return
    }
    setCurrentMessageIndex(currentMessageIndex + 1)
    setOpen(false)
  }

  return (
    <Snackbar
      open={open}
      onClose={handleSnackbarClose}
      autoHideDuration={messages[currentMessageIndex]?.duration}
      message={messages[currentMessageIndex]?.message}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    />
  )
}

export default SnackbarMessageList
