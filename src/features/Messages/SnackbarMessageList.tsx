import { Alert, Snackbar, SnackbarCloseReason } from '@mui/material'
import React, { useEffect, useMemo, useState } from 'react'

import { useMessageStore } from '../../data/hooks/stores/MessageStore'
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
    event: Event | React.SyntheticEvent,
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
      data-testid="snackbar-message-list"
      open={open}
      onClose={handleSnackbarClose}
      autoHideDuration={autoHideDuration}
      // Bottom-center, Material Design's default for web (MUI's own default,
      // bottom-left, covers the floating layout tools when the table panel is
      // collapsed). Anything at the top sits on the network view's tab strip
      // (e.g. the Hierarchy Viewer's Cell View tab), and because MUI pauses
      // auto-hide while the pointer is over it, a user reaching for that tab
      // could not click it until they closed the message. Bottom-center lands
      // on table rows (or on an empty canvas when the table is collapsed),
      // clear of the floating toolbars in the bottom corners and of the
      // onboarding tour, whose tooltips sit above it.
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        zIndex: 9999999,
        '& .MuiPaper-root': {
          borderRadius: 2,
          boxShadow: 6,
        },
      }}
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
