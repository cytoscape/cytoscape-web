import { Alert, Snackbar, SnackbarCloseReason } from '@mui/material'
import React, { useState } from 'react'

import { useMessageStore } from '../../data/hooks/stores/MessageStore'
import { MessageSeverity } from '../../models/MessageModel'

export const SnackbarMessageList = (): React.ReactElement => {
  const messages = useMessageStore((state) => state.messages)
  // The message on screen. It moves on only once the closing message has
  // finished animating out (handleExited), so the snackbar keeps its text and
  // severity during the exit instead of shrinking as an empty info alert.
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  const currentMessage = messages[currentMessageIndex]
  // A message added while nothing is on screen opens by itself.
  const open = currentMessage !== undefined && !dismissed

  const autoHideDuration =
    currentMessage?.persistent === true
      ? undefined
      : (currentMessage?.duration ?? 5000)

  // Every close request ends up here, and only the message on screen can be
  // dismissed. MUI also reports closes that are not the user's: the snackbar
  // stays rendered while it animates out, a pointer leaving it (or a blur)
  // then restarts its auto-hide timer, and nothing clears that timer, so a
  // 'timeout' close arrives seconds after the message is gone. Advancing on
  // it skipped the next message (closing an import error with its X hid the
  // next import error). Dismissing is idempotent, so the X's click reaching
  // the Alert's own click handler cannot skip a message either.
  const dismiss = (): void => {
    if (open) {
      setDismissed(true)
    }
  }

  const handleSnackbarClose = (
    event: Event | React.SyntheticEvent,
    reason: SnackbarCloseReason,
  ): void => {
    if (reason === 'clickaway') {
      return
    }
    // A persistent message has no timer of its own; a timeout reaching it is
    // the stale one described above, left by the previous message.
    if (reason === 'timeout' && autoHideDuration === undefined) {
      return
    }
    dismiss()
  }

  const handleAlertClick = () => {
    if (currentMessage?.persistent) {
      dismiss()
    }
  }

  const handleExited = () => {
    setCurrentMessageIndex((prev) => prev + 1)
    setDismissed(false)
  }

  return (
    <Snackbar
      data-testid="snackbar-message-list"
      open={open}
      onClose={handleSnackbarClose}
      autoHideDuration={autoHideDuration}
      TransitionProps={{ onExited: handleExited }}
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
      {/* Filled: the default (standard) variant's pale tint is easy to miss at
          the bottom of the screen, and in dark mode an error's dark-red tint
          barely separates from the background. */}
      <Alert
        variant="filled"
        severity={currentMessage?.severity ?? MessageSeverity.INFO}
        sx={{ width: '100%' }}
        onClose={dismiss}
        onClick={handleAlertClick}
      >
        {currentMessage?.message}
      </Alert>
    </Snackbar>
  )
}

export default SnackbarMessageList
