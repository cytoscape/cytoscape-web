import React, { useState, useEffect, useMemo } from 'react'
import { Alert, Snackbar, SnackbarCloseReason } from '@mui/material'

import { useMessageStore } from '../../hooks/stores/MessageStore'
import { MessageSeverity } from '../../models/MessageModel'

export const SnackbarMessageList = (): React.ReactElement => {
  const [open, setOpen] = useState(false)
  const messages = useMessageStore((state) => state.messages)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

  const currentMessage = useMemo(
    () => messages[currentMessageIndex],
    [messages, currentMessageIndex],
  )

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

  const advanceMessage = () => {
    setCurrentMessageIndex((prev) => prev + 1)
    setOpen(false)
  }

  const handleSnackbarClose = (
    event: React.SyntheticEvent,
    reason: SnackbarCloseReason,
  ): void => {
    if (reason === 'clickaway') {
      return
    }
    advanceMessage()
  }

  const handleAlertClose = () => {
    advanceMessage()
  }

  const handleAlertClick = () => {
    if (currentMessage?.persistent) {
      advanceMessage()
    }
  }

  const autoHideDuration =
    currentMessage?.persistent === true
      ? undefined
      : (currentMessage?.duration ?? 5000)

  return (
    <Snackbar
      sx={{ zIndex: 9999999 }}
      open={open}
      onClose={handleSnackbarClose}
      autoHideDuration={autoHideDuration}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        severity={currentMessage?.severity ?? MessageSeverity.INFO}
        sx={{ width: '100%' }}
        onClose={handleAlertClose}
        onClick={handleAlertClick}
      >
        {currentMessage?.message}
      </Alert>
    </Snackbar>
  )
}

export default SnackbarMessageList
