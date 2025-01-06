import React, { useState, useEffect } from 'react'
import { Snackbar, SnackbarCloseReason } from '@mui/material'

import { useMessageStore } from '../../store/MessageStore'

export const SnackbarMessageList = (): React.ReactElement => {
  const [open, setOpen] = useState(false)
  const messages = useMessageStore((state) => state.messages)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

  useEffect(() => {
    if (messages.length > 0 && currentMessageIndex < messages.length) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [messages, currentMessageIndex])

  useEffect(() => {
    if (!open && currentMessageIndex < messages.length - 1) {
      const timer = setTimeout(() => {
        setCurrentMessageIndex((prev) => prev + 1)
        setOpen(true)
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [open, currentMessageIndex, messages.length])

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
      sx={{ zIndex: 9999999 }}
      open={open}
      onClose={handleSnackbarClose}
      autoHideDuration={messages[currentMessageIndex]?.duration ?? 5000}
      message={messages[currentMessageIndex]?.message}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    />
  )
}

export default SnackbarMessageList
